import fs from "fs";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";
import { env } from "@/lib/env";
import { addDays, formatDateInTimezone, isDateWithinRange } from "@/lib/time";

type SessionRowRaw = {
  id: string;
  session_date: string;
  start_at: string;
  end_at: string;
  capacity: number;
  booked_count: number;
  is_open: number;
  created_at: string;
};

export type SessionRow = Omit<SessionRowRaw, "is_open"> & {
  is_open: boolean;
};

export type RegistrationWithSession = {
  id: string;
  student_id: string;
  email: string;
  assigned_session_id: string;
  assigned_priority: number;
  pref_session_1: string;
  pref_session_2: string;
  pref_session_3: string;
  created_at: string;
  session: {
    session_date: string;
    start_at: string;
    end_at: string;
  } | null;
};

export type ExportRegistrationRow = {
  student_id: string;
  email: string;
  session_date: string;
  start_at: string;
  end_at: string;
  created_at: string;
};

export type BookingResult =
  | {
      status: "ok";
      registration_id: string;
      assigned_session_id: string;
      assigned_priority: number;
    }
  | { status: "duplicate_student" | "all_full" | "closed_or_invalid_session" | "invalid_input" };

let dbInstance: Database.Database | null = null;

function resolveSqlitePath(): string {
  const configured = env.sqliteDbPath?.trim();
  const dbPath = configured ? configured : path.join(process.cwd(), "data", "rct.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dbPath;
}

function initDb(db: Database.Database) {
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    create table if not exists sessions (
      id text primary key,
      session_date text not null,
      start_at text not null,
      end_at text not null,
      capacity integer not null default 2 check (capacity = 2),
      booked_count integer not null default 0 check (booked_count >= 0),
      is_open integer not null default 1 check (is_open in (0, 1)),
      created_at text not null default (datetime('now')),
      unique (start_at, end_at),
      check (end_at > start_at)
    );

    create table if not exists registrations (
      id text primary key,
      student_id text not null unique,
      email text not null,
      assigned_session_id text not null references sessions(id) on delete restrict,
      assigned_priority integer not null check (assigned_priority in (1, 2, 3)),
      pref_session_1 text not null references sessions(id) on delete restrict,
      pref_session_2 text not null references sessions(id) on delete restrict,
      pref_session_3 text not null references sessions(id) on delete restrict,
      created_at text not null default (datetime('now')),
      check (
        pref_session_1 <> pref_session_2 and
        pref_session_1 <> pref_session_3 and
        pref_session_2 <> pref_session_3
      )
    );

    create index if not exists idx_sessions_date on sessions (session_date);
    create index if not exists idx_sessions_open_date on sessions (is_open, session_date);
    create index if not exists idx_registrations_assigned_session on registrations (assigned_session_id);
    create index if not exists idx_registrations_created_at on registrations (created_at);
  `);
}

function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = new Database(resolveSqlitePath());
  initDb(dbInstance);
  return dbInstance;
}

function toSessionRow(raw: SessionRowRaw): SessionRow {
  return {
    ...raw,
    is_open: raw.is_open === 1
  };
}

function timezoneOffset(timezone: string): string {
  if (timezone === "Asia/Hong_Kong") {
    return "+08:00";
  }
  return "Z";
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTimeValue(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function nowSqliteString() {
  return new Date().toISOString();
}

export function getSessionsByDate(date: string): SessionRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      select id, session_date, start_at, end_at, capacity, booked_count, is_open, created_at
      from sessions
      where session_date = ?
      order by start_at asc
    `
    )
    .all(date) as SessionRowRaw[];
  return rows.map(toSessionRow);
}

export function createSessionsBulk(params: {
  date: string;
  startTime: string;
  endTime: string;
  intervalMinutes?: number;
}) {
  const interval = params.intervalMinutes ?? 20;
  const startMinutes = toMinutes(params.startTime);
  const endMinutes = toMinutes(params.endTime);
  const offset = timezoneOffset(env.appTimezone);

  const rows: Array<{ id: string; session_date: string; start_at: string; end_at: string }> = [];
  for (let current = startMinutes; current + interval <= endMinutes; current += interval) {
    const start = toTimeValue(current);
    const end = toTimeValue(current + interval);
    rows.push({
      id: crypto.randomUUID(),
      session_date: params.date,
      start_at: `${params.date}T${start}:00${offset}`,
      end_at: `${params.date}T${end}:00${offset}`
    });
  }

  const db = getDb();
  const insert = db.prepare(`
    insert or ignore into sessions (id, session_date, start_at, end_at, capacity, booked_count, is_open, created_at)
    values (?, ?, ?, ?, 2, 0, 1, ?)
  `);

  const tx = db.transaction(() => {
    let inserted = 0;
    for (const row of rows) {
      const result = insert.run(row.id, row.session_date, row.start_at, row.end_at, nowSqliteString());
      inserted += result.changes;
    }
    return inserted;
  });

  const insertedCount = tx();
  return { generatedCount: rows.length, createdCount: insertedCount };
}

export function setSessionOpenState(id: string, isOpen: boolean) {
  const db = getDb();
  const update = db.prepare(`update sessions set is_open = ? where id = ?`);
  const select = db.prepare(`select id, is_open from sessions where id = ?`);
  const result = update.run(isOpen ? 1 : 0, id);
  if (result.changes === 0) {
    return null;
  }
  const row = select.get(id) as { id: string; is_open: number } | undefined;
  if (!row) {
    return null;
  }
  return { id: row.id, is_open: row.is_open === 1 };
}

export function registerStudent(params: {
  studentId: string;
  email: string;
  preferences: string[];
}): BookingResult {
  const { studentId, email, preferences } = params;

  if (!studentId || !email || preferences.length !== 3) {
    return { status: "invalid_input" };
  }
  if (new Set(preferences).size !== 3) {
    return { status: "invalid_input" };
  }

  const db = getDb();

  const hasStudentStmt = db.prepare(`select 1 from registrations where student_id = ? limit 1`);
  const getSessionStmt = db.prepare(`
    select id, session_date, is_open, booked_count, capacity
    from sessions
    where id = ?
  `);
  const bumpBookedStmt = db.prepare(`
    update sessions
    set booked_count = booked_count + 1
    where id = ?
      and is_open = 1
      and booked_count < capacity
  `);
  const rollbackBookedStmt = db.prepare(`
    update sessions
    set booked_count = case when booked_count > 0 then booked_count - 1 else 0 end
    where id = ?
  `);
  const insertRegistrationStmt = db.prepare(`
    insert into registrations (
      id, student_id, email, assigned_session_id, assigned_priority,
      pref_session_1, pref_session_2, pref_session_3, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = db.transaction((): BookingResult => {
    const studentExists = hasStudentStmt.get(studentId);
    if (studentExists) {
      return { status: "duplicate_student" };
    }

    const today = formatDateInTimezone(new Date(), env.appTimezone);
    const latest = addDays(today, env.bookingWindowDays);
    let hasInvalid = false;

    for (let idx = 0; idx < preferences.length; idx += 1) {
      const prefId = preferences[idx];
      const session = getSessionStmt.get(prefId) as
        | {
            id: string;
            session_date: string;
            is_open: number;
            booked_count: number;
            capacity: number;
          }
        | undefined;

      if (!session) {
        hasInvalid = true;
        continue;
      }

      if (
        !isDateWithinRange(session.session_date, today, latest) ||
        session.is_open !== 1
      ) {
        hasInvalid = true;
        continue;
      }

      const bump = bumpBookedStmt.run(prefId);
      if (bump.changes === 0) {
        continue;
      }

      const registrationId = crypto.randomUUID();
      try {
        insertRegistrationStmt.run(
          registrationId,
          studentId,
          email,
          prefId,
          idx + 1,
          preferences[0],
          preferences[1],
          preferences[2],
          nowSqliteString()
        );
      } catch (error) {
        rollbackBookedStmt.run(prefId);
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes("unique constraint failed: registrations.student_id")
        ) {
          return { status: "duplicate_student" };
        }
        throw error;
      }

      return {
        status: "ok",
        registration_id: registrationId,
        assigned_session_id: prefId,
        assigned_priority: idx + 1
      };
    }

    if (hasInvalid) {
      return { status: "closed_or_invalid_session" };
    }
    return { status: "all_full" };
  });

  return result();
}

export function getRegistrationsByDate(date: string): RegistrationWithSession[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      select
        r.id,
        r.student_id,
        r.email,
        r.assigned_session_id,
        r.assigned_priority,
        r.pref_session_1,
        r.pref_session_2,
        r.pref_session_3,
        r.created_at,
        s.session_date as session_date,
        s.start_at as session_start_at,
        s.end_at as session_end_at
      from registrations r
      join sessions s on s.id = r.assigned_session_id
      where s.session_date = ?
      order by r.created_at asc
    `
    )
    .all(date) as Array<{
    id: string;
    student_id: string;
    email: string;
    assigned_session_id: string;
    assigned_priority: number;
    pref_session_1: string;
    pref_session_2: string;
    pref_session_3: string;
    created_at: string;
    session_date: string;
    session_start_at: string;
    session_end_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    student_id: row.student_id,
    email: row.email,
    assigned_session_id: row.assigned_session_id,
    assigned_priority: row.assigned_priority,
    pref_session_1: row.pref_session_1,
    pref_session_2: row.pref_session_2,
    pref_session_3: row.pref_session_3,
    created_at: row.created_at,
    session: {
      session_date: row.session_date,
      start_at: row.session_start_at,
      end_at: row.session_end_at
    }
  }));
}

export function getRegistrationsByDateRange(dateFrom: string, dateTo: string): ExportRegistrationRow[] {
  const db = getDb();
  return db
    .prepare(
      `
      select
        r.student_id,
        r.email,
        s.session_date,
        s.start_at,
        s.end_at,
        r.created_at
      from registrations r
      join sessions s on s.id = r.assigned_session_id
      where s.session_date >= ? and s.session_date <= ?
      order by r.created_at asc
    `
    )
    .all(dateFrom, dateTo) as ExportRegistrationRow[];
}

export function clearAllBookings() {
  const db = getDb();
  const tx = db.transaction(() => {
    const deleted = db.prepare(`delete from registrations`).run().changes;
    db.prepare(`update sessions set booked_count = 0`).run();
    return deleted;
  });

  const deletedCount = tx();
  return { deletedCount };
}
