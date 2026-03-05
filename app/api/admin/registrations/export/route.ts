import { NextRequest } from "next/server";
import { getRegistrationsByDateRange } from "@/lib/db";
import { ensureAdminApiSession, jsonError } from "@/lib/http";
import { isValidDateString } from "@/lib/time";

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const authorized = await ensureAdminApiSession(request);
  if (!authorized) {
    return jsonError(401, { status: "unauthorized" });
  }

  const dateFrom = request.nextUrl.searchParams.get("date_from") ?? "";
  const dateTo = request.nextUrl.searchParams.get("date_to") ?? "";

  if (!isValidDateString(dateFrom) || !isValidDateString(dateTo) || dateFrom > dateTo) {
    return jsonError(400, {
      status: "invalid_input",
      message: "date_from/date_to must be valid and date_from <= date_to."
    });
  }

  const registrations = getRegistrationsByDateRange(dateFrom, dateTo);
  if (registrations.length === 0) {
    return new Response("student_id,email,session_date,start_time,end_time,created_at\n", {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rct-registrations-${dateFrom}-to-${dateTo}.csv"`
      }
    });
  }

  const header = "student_id,email,session_date,start_time,end_time,created_at";
  const rows = registrations.map((row) => {
    return [
      csvEscape(row.student_id),
      csvEscape(row.email),
      csvEscape(row.session_date),
      csvEscape(row.start_at),
      csvEscape(row.end_at),
      csvEscape(row.created_at)
    ].join(",");
  });

  return new Response([header, ...rows].join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rct-registrations-${dateFrom}-to-${dateTo}.csv"`
    }
  });
}
