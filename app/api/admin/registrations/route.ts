import { NextRequest } from "next/server";
import { getRegistrationsByDate } from "@/lib/db";
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

  const result = getRegistrationsByDate(date);
  return jsonOk({ registrations: result });
}
