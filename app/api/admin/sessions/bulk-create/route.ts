import { NextRequest } from "next/server";
import { createSessionsBulk } from "@/lib/db";
import { env } from "@/lib/env";
import { ensureAdminApiSession, jsonError, jsonOk } from "@/lib/http";
import {
  addDays,
  formatDateInTimezone,
  isDateWithinRange,
  isValidDateString,
  isValidTimeString
} from "@/lib/time";

type BulkCreatePayload = {
  date?: string;
  start_time?: string;
  end_time?: string;
  interval_minutes?: number;
};

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function POST(request: NextRequest) {
  const authorized = await ensureAdminApiSession(request);
  if (!authorized) {
    return jsonError(401, { status: "unauthorized" });
  }

  let payload: BulkCreatePayload | null = null;
  try {
    payload = (await request.json()) as BulkCreatePayload;
  } catch {
    return jsonError(400, { status: "invalid_input" });
  }

  const date = payload?.date ?? "";
  const startTime = payload?.start_time ?? "";
  const endTime = payload?.end_time ?? "";
  const interval = payload?.interval_minutes ?? 20;

  if (!isValidDateString(date) || !isValidTimeString(startTime) || !isValidTimeString(endTime)) {
    return jsonError(400, { status: "invalid_input", message: "Invalid date or time." });
  }
  if (interval !== 20) {
    return jsonError(400, { status: "invalid_input", message: "Interval must be 20 minutes." });
  }

  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  if (startMinutes >= endMinutes) {
    return jsonError(400, { status: "invalid_input", message: "Invalid time range." });
  }

  const today = formatDateInTimezone(new Date(), env.appTimezone);
  const maxDate = addDays(today, env.bookingWindowDays);
  if (!isDateWithinRange(date, today, maxDate)) {
    return jsonError(400, {
      status: "invalid_input",
      message: `Date must be between ${today} and ${maxDate}.`
    });
  }

  const requestedCount = Math.floor((endMinutes - startMinutes) / 20);
  if (requestedCount <= 0) {
    return jsonError(400, {
      status: "invalid_input",
      message: "No sessions generated for the given time range."
    });
  }

  const { createdCount, generatedCount, skippedForLunch } = createSessionsBulk({
    date,
    startTime,
    endTime,
    intervalMinutes: 20
  });

  if (generatedCount > 0 && skippedForLunch === generatedCount) {
    return jsonError(400, {
      status: "invalid_input",
      message: "No sessions created. 12:30-13:30 is blocked for lunch break."
    });
  }

  return jsonOk({
    status: "ok",
    created_count: createdCount,
    generated_count: generatedCount,
    skipped_lunch_count: skippedForLunch
  });
}
