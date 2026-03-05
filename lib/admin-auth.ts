import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { assertRequiredEnv, env } from "@/lib/env";

const ADMIN_COOKIE_NAME = "admin_session";
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

function sign(value: string): string {
  assertRequiredEnv(["ADMIN_SESSION_SECRET"]);
  return crypto.createHmac("sha256", env.adminSessionSecret).update(value).digest("hex");
}

export function createAdminCookieValue(): string {
  const timestamp = Date.now().toString();
  const signature = sign(timestamp);
  return `${timestamp}.${signature}`;
}

export function isAdminCookieValid(rawCookie: string | undefined): boolean {
  if (!rawCookie) {
    return false;
  }
  const [timestamp, signature] = rawCookie.split(".");
  if (!timestamp || !signature) {
    return false;
  }
  const expected = sign(timestamp);
  if (signature.length !== expected.length) {
    return false;
  }
  const signatureMatch = crypto.timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expected, "utf8")
  );
  if (!signatureMatch) {
    return false;
  }
  const createdAt = Number(timestamp);
  if (!Number.isFinite(createdAt)) {
    return false;
  }
  return Date.now() - createdAt <= EIGHT_HOURS_MS;
}

export async function requireAdminPageSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!isAdminCookieValid(session)) {
    redirect("/admin/login");
  }
}

export const adminCookie = {
  name: ADMIN_COOKIE_NAME,
  maxAgeSeconds: EIGHT_HOURS_MS / 1000
};
