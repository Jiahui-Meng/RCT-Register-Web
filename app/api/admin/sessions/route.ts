import { NextRequest } from "next/server";
import { getSessionsByDate } from "@/lib/db";
import { ensureAdminApiSession, jsonError, jsonOk } from "@/lib/http";
import { isValidDateString } from "@/lib/time";

export async function GET(request: NextRequest) {
  const authorized = await ensureAdminApiSession(request);
  if (!authorized) {
    return jsonError(401, { status: "unauthorized" });
  }

  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!isValidDateString(date)) {
    return jsonError(400, { status: "invalid_input", message: "Invalid date parameter." });
  }

  const data = getSessionsByDate(date);

  return jsonOk({
    sessions: data.map((session) => ({
      id: session.id,
      session_date: session.session_date,
      start_at: session.start_at,
      end_at: session.end_at,
      capacity: session.capacity,
      booked_count: session.booked_count,
      is_open: session.is_open,
      is_full: Number(session.booked_count) >= Number(session.capacity)
    }))
  });
}
