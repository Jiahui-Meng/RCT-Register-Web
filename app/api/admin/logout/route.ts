import { NextRequest, NextResponse } from "next/server";
import { adminCookie } from "@/lib/admin-auth";

function shouldUseSecureCookie(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.toLowerCase();
  if (forwardedProto) {
    return forwardedProto === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ status: "ok" });
  response.cookies.set({
    name: adminCookie.name,
    value: "",
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request)
  });
  return response;
}
