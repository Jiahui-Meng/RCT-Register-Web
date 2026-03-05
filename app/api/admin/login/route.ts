import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { adminCookie, createAdminCookieValue } from "@/lib/admin-auth";
import { assertRequiredEnv, env } from "@/lib/env";
import { jsonError } from "@/lib/http";

function shouldUseSecureCookie(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.toLowerCase();
  if (forwardedProto) {
    return forwardedProto === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export async function POST(request: NextRequest) {
  assertRequiredEnv(["ADMIN_PASSWORD_HASH", "ADMIN_SESSION_SECRET"]);

  let payload: { password?: string } | null = null;
  try {
    payload = (await request.json()) as { password?: string };
  } catch {
    return jsonError(400, { status: "invalid_input" });
  }

  const password = payload?.password ?? "";
  if (!password) {
    return jsonError(400, { status: "invalid_input", message: "Password is required." });
  }

  const isValid = await bcrypt.compare(password, env.adminPasswordHash);
  if (!isValid) {
    return jsonError(401, { status: "unauthorized", message: "Invalid password." });
  }

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set({
    name: adminCookie.name,
    value: createAdminCookieValue(),
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: adminCookie.maxAgeSeconds
  });

  return response;
}
