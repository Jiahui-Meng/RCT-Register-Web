import { NextRequest } from "next/server";
import { clearAllSessions } from "@/lib/db";
import { ensureAdminApiSession, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  const authorized = await ensureAdminApiSession(request);
  if (!authorized) {
    return jsonError(401, { status: "unauthorized" });
  }

  const { deletedBookings, deletedSessions } = clearAllSessions();
  return jsonOk({
    status: "ok",
    deleted_bookings_count: deletedBookings,
    deleted_sessions_count: deletedSessions
  });
}
