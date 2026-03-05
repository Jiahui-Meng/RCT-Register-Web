import { NextRequest } from "next/server";
import { setSessionOpenState } from "@/lib/db";
import { ensureAdminApiSession, jsonError, jsonOk } from "@/lib/http";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authorized = await ensureAdminApiSession(request);
  if (!authorized) {
    return jsonError(401, { status: "unauthorized" });
  }

  const { id } = await context.params;
  if (!id) {
    return jsonError(400, { status: "invalid_input" });
  }

  let payload: { is_open?: boolean } | null = null;
  try {
    payload = (await request.json()) as { is_open?: boolean };
  } catch {
    return jsonError(400, { status: "invalid_input" });
  }

  if (typeof payload?.is_open !== "boolean") {
    return jsonError(400, { status: "invalid_input", message: "is_open must be a boolean." });
  }

  const data = setSessionOpenState(id, payload.is_open);
  if (!data) {
    return jsonError(404, { status: "not_found" });
  }

  return jsonOk({ status: "ok", session: data });
}
