import { NextRequest } from "next/server";
import { clearAllBookings } from "@/lib/db";
import { ensureAdminApiSession, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  const authorized = await ensureAdminApiSession(request);
  if (!authorized) {
    return jsonError(401, { status: "unauthorized" });
  }

  const { deletedCount } = clearAllBookings();
  return jsonOk({ status: "ok", deleted_count: deletedCount });
}
