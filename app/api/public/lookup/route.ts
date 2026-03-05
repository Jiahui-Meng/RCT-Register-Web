import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getRegistrationByStudent } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { validateLookupPayload } from "@/lib/validation";

function toTimeInTimezone(iso: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: env.appTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(iso));
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, { status: "invalid_input", message: "Invalid JSON body." });
  }

  const validation = validateLookupPayload(payload);
  if (!validation.valid || !validation.parsed) {
    return jsonError(400, {
      status: "invalid_input",
      message: "Invalid request payload.",
      errors: validation.errors
    });
  }

  const row = getRegistrationByStudent(validation.parsed.student_id, validation.parsed.email);
  if (!row) {
    return jsonError(404, { status: "not_found" });
  }

  return jsonOk({
    status: "ok",
    registration: {
      student_id: row.student_id,
      email: row.email,
      assigned_priority: row.assigned_priority,
      created_at: row.created_at,
      session_date: row.session.session_date,
      start_time: toTimeInTimezone(row.session.start_at),
      end_time: toTimeInTimezone(row.session.end_at)
    }
  });
}
