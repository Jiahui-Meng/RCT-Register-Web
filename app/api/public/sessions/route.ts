import { NextRequest } from "next/server";
import { getSessionsByDate } from "@/lib/db";
import { env } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import {
  addDays,
  formatDateInTimezone,
  isDateWithinRange,
  isValidDateString
} from "@/lib/time";

function toTimeInTimezone(iso: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: env.appTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(iso));
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!isValidDateString(date)) {
    return jsonError(400, { status: "invalid_input", message: "Invalid date parameter." });
  }

  const today = formatDateInTimezone(new Date(), env.appTimezone);
  const maxDate = addDays(today, env.bookingWindowDays);
  if (!isDateWithinRange(date, today, maxDate)) {
    return jsonError(400, {
      status: "invalid_input",
      message: `Date must be between ${today} and ${maxDate}.`
    });
  }

  const sessions = getSessionsByDate(date).map((session) => ({
    id: session.id,
    session_date: session.session_date,
    start_time: toTimeInTimezone(session.start_at),
    end_time: toTimeInTimezone(session.end_at),
    capacity: session.capacity,
    booked_count: session.booked_count,
    is_full: session.booked_count >= session.capacity,
    is_open: session.is_open
  }));

  return jsonOk({ sessions });
}
