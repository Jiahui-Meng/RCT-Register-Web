import { NextRequest } from "next/server";
import { registerStudent } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { validateRegisterPayload } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, { status: "invalid_input", message: "Invalid JSON body." });
  }

  const validation = validateRegisterPayload(payload);
  if (!validation.valid || !validation.parsed) {
    return jsonError(400, {
      status: "invalid_input",
      message: "Invalid request payload.",
      errors: validation.errors
    });
  }

  const result = registerStudent({
    studentId: validation.parsed.student_id,
    email: validation.parsed.email,
    preferences: validation.parsed.preferences
  });

  if (result.status === "ok") {
    return jsonOk({
      status: "ok",
      registration_id: result.registration_id,
      assigned_session_id: result.assigned_session_id,
      assigned_priority: result.assigned_priority
    });
  }

  if (
    result.status === "duplicate_student" ||
    result.status === "all_full" ||
    result.status === "closed_or_invalid_session"
  ) {
    return jsonError(409, { status: result.status });
  }

  return jsonError(400, { status: "invalid_input" });
}
