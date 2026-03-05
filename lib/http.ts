import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookie, isAdminCookieValid } from "@/lib/admin-auth";

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

export async function ensureAdminApiSession(_request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookie.name)?.value;
  return isAdminCookieValid(token);
}
