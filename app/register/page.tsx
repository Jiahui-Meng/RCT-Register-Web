"use client";

import { useEffect, useMemo, useState } from "react";

type SessionItem = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  is_full: boolean;
  is_open: boolean;
};

type RegisterResponse =
  | {
      status: "ok";
      registration_id: string;
      assigned_session_id: string;
      assigned_priority: number;
    }
  | {
      status: "duplicate_student" | "all_full" | "closed_or_invalid_session" | "invalid_input";
    };


const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayLocalString() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseYmd(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const [year, month, day] = dateString.split("-");
  return `${month}-${day}-${year}`;
}

function monthKey(date: Date) {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

export default function RegisterPage() {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = parseYmd(todayLocalString());
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  });

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState("");

  const [studentId, setStudentId] = useState("");
  const [confirmStudentId, setConfirmStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [preferences, setPreferences] = useState<(SessionItem | null)[]>([null, null, null]);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RegisterResponse | null>(null);

  const minDate = useMemo(() => todayLocalString(), []);
  const maxDate = useMemo(() => plusDays(todayLocalString(), 30), []);

  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const selectedIds = new Set(preferences.filter(Boolean).map((session) => session!.id));

  useEffect(() => {
    async function loadAvailableDates() {
      setLoadingDates(true);
      setSessionError("");
      try {
        const response = await fetch("/api/public/available-dates");
        const body = (await response.json()) as { dates?: string[]; message?: string };
        if (!response.ok) {
          setAvailableDates([]);
          setSessionError(body.message ?? "Failed to load available dates.");
          return;
        }

        const dates = body.dates ?? [];
        setAvailableDates(dates);
        const nextSelected = dates[0] ?? "";
        setSelectedDate((prev) => (prev && dates.includes(prev) ? prev : nextSelected));
      } catch {
        setSessionError("Failed to load available dates.");
      } finally {
        setLoadingDates(false);
      }
    }

    loadAvailableDates();
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }
    const selected = parseYmd(selectedDate);
    setVisibleMonth(new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1)));
  }, [selectedDate]);

  useEffect(() => {
    async function loadSessions() {
      if (!selectedDate) {
        setSessions([]);
        return;
      }

      setLoadingSessions(true);
      setSessionError("");
      try {
        const response = await fetch(`/api/public/sessions?date=${selectedDate}`);
        const body = (await response.json()) as {
          sessions?: SessionItem[];
          message?: string;
        };
        if (!response.ok) {
          setSessions([]);
          setSessionError(body.message ?? "Failed to load sessions.");
          return;
        }
        setSessions(body.sessions ?? []);
      } catch {
        setSessionError("Failed to load sessions.");
      } finally {
        setLoadingSessions(false);
      }
    }
    loadSessions();
  }, [selectedDate]);

  function assignPreference(priority: number, session: SessionItem) {
    setPreferences((prev) => {
      const next = [...prev];
      const duplicateIndex = next.findIndex((item) => item?.id === session.id);
      if (duplicateIndex >= 0) {
        next[duplicateIndex] = null;
      }
      next[priority] = session;
      return next;
    });
    setSubmitError("");
  }

  function clearPreference(priority: number) {
    setPreferences((prev) => {
      const next = [...prev];
      next[priority] = null;
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setResult(null);

    if (!preferences[0] || !preferences[1] || !preferences[2]) {
      setSubmitError("Please choose 3 unique session preferences.");
      return;
    }
    if (!studentId.trim() || !email.trim()) {
      setSubmitError("student_id and email are required.");
      return;
    }
    if (studentId.trim() !== confirmStudentId.trim()) {
      setSubmitError("Student ID does not match confirmation.");
      return;
    }
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setSubmitError("Email does not match confirmation.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId.trim(),
          email: email.trim(),
          preferences: preferences.map((item) => item!.id)
        })
      });

      const body = (await response.json()) as RegisterResponse;
      setResult(body);

      if (!response.ok) {
        if (body.status === "all_full") {
          setSubmitError("3 choices are full, please select another 3 sessions.");
        } else if (body.status === "duplicate_student") {
          setSubmitError("This student_id already has a confirmed registration.");
        } else if (body.status === "closed_or_invalid_session") {
          setSubmitError(
            "One or more selected sessions are closed/invalid. Please choose 3 new sessions."
          );
        } else {
          setSubmitError("Invalid request. Please check your input.");
        }
      }
    } catch {
      setSubmitError("Failed to submit registration.");
    } finally {
      setSubmitting(false);
    }
  }

  const monthYearLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(visibleMonth);

  const minMonth = new Date(Date.UTC(parseYmd(minDate).getUTCFullYear(), parseYmd(minDate).getUTCMonth(), 1));
  const maxMonth = new Date(Date.UTC(parseYmd(maxDate).getUTCFullYear(), parseYmd(maxDate).getUTCMonth(), 1));
  const canPrevMonth = monthKey(visibleMonth) > monthKey(minMonth);
  const canNextMonth = monthKey(visibleMonth) < monthKey(maxMonth);

  const firstDayWeekIndex = new Date(
    Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), 1)
  ).getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const cells: Array<{ ymd: string; day: number; selectable: boolean; selected: boolean } | null> = [];
  for (let i = 0; i < firstDayWeekIndex; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const ymd = toYmd(new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), day)));
    const selectable = availableDateSet.has(ymd);
    cells.push({ ymd, day, selectable, selected: ymd === selectedDate });
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Hand Hygiene Training Trail - CUHK</h1>
        <p className="muted">Location: Pathology Teaching Laboratory 6 , 1/F, Lui Che Woo Clinical Sciences Building, Prince of Wales Hospital</p>
        <p className="muted">
          Select 3 unique session preferences (P1, P2, P3). The system auto-assigns the first
          available one.
        </p>
      </div>

      <div className="card">
        <label>Available booking dates</label>
        <div className="calendar-header">
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setVisibleMonth(
                new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() - 1, 1))
              )
            }
            disabled={!canPrevMonth}
          >
            Prev
          </button>
          <strong>{monthYearLabel}</strong>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setVisibleMonth(
                new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 1))
              )
            }
            disabled={!canNextMonth}
          >
            Next
          </button>
        </div>

        <div className="calendar-grid calendar-weekdays">
          {WEEKDAYS.map((label) => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="calendar-cell empty" />;
            }
            return (
              <button
                key={cell.ymd}
                type="button"
                className={`calendar-cell ${cell.selectable ? "" : "disabled"} ${cell.selected ? "selected" : ""}`}
                disabled={!cell.selectable || loadingDates}
                onClick={() => setSelectedDate(cell.ymd)}
                title={cell.selectable ? formatDisplayDate(cell.ymd) : "No sessions"}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <p className="muted">Selected: {selectedDate ? formatDisplayDate(selectedDate) : "None"}</p>
        <p className="muted">
          Bookable window: {formatDisplayDate(minDate)} to {formatDisplayDate(maxDate)}
        </p>
        {sessionError ? <p className="error">{sessionError}</p> : null}
      </div>

      <div className="card">
        <h2>Available Sessions {selectedDate ? `(${formatDisplayDate(selectedDate)})` : ""}</h2>
        {loadingSessions ? <p className="muted">Loading sessions...</p> : null}
        {!loadingSessions && sessions.length === 0 ? (
          <p className="muted">No bookable sessions for this date.</p>
        ) : null}
        <div className="list">
          {sessions.map((session) => (
            <div key={session.id} className="session-item">
              <div>
                <strong>
                  {session.start_time} - {session.end_time}
                </strong>
                <div className="muted">
                  {session.booked_count}/{session.capacity} booked
                </div>
              </div>
              <div className="row" style={{ margin: 0 }}>
                {[0, 1, 2].map((priority) => (
                  <button
                    key={`${session.id}-${priority}`}
                    type="button"
                    className="secondary"
                    disabled={selectedIds.has(session.id) && preferences[priority]?.id !== session.id}
                    onClick={() => assignPreference(priority, session)}
                  >
                    Set P{priority + 1}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <form className="card" onSubmit={onSubmit}>
        <h2>Your Selection</h2>
        <div className="list">
          {preferences.map((session, index) => (
            <div key={index} className="session-item">
              <div>
                <span className="pill">Priority {index + 1}</span>
                {session ? (
                  <span>
                    {formatDisplayDate(session.session_date)} {session.start_time} - {session.end_time}
                  </span>
                ) : (
                  <span className="muted">Not selected</span>
                )}
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => clearPreference(index)}
                disabled={!session}
              >
                Clear
              </button>
            </div>
          ))}
        </div>

        <div className="row">
          <div>
            <label htmlFor="student-id">Student ID</label>
            <input
              id="student-id"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              placeholder="e.g. s1234567"
            />
          </div>
          <div>
            <label htmlFor="student-id-confirm">Confirm Student ID</label>
            <input
              id="student-id-confirm"
              value={confirmStudentId}
              onChange={(event) => setConfirmStudentId(event.target.value)}
              placeholder="Re-enter student ID"
            />
          </div>
        </div>

        <div className="row">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@school.edu"
            />
          </div>
          <div>
            <label htmlFor="email-confirm">Confirm Email</label>
            <input
              id="email-confirm"
              type="email"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              placeholder="Re-enter email"
            />
          </div>
        </div>

        {submitError ? <p className="error">{submitError}</p> : null}
        {result && result.status === "ok" ? (
          <p className="success">
            Registration successful. You were assigned to priority {result.assigned_priority}.
          </p>
        ) : null}

        <button type="submit" disabled={submitting || availableDates.length === 0}>
          {submitting ? "Submitting..." : "Submit Registration"}
        </button>
      </form>
    </main>
  );
}
