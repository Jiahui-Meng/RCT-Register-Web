import { NextRequest } from "next/server";
import { getBookableDates } from "@/lib/db";
import { env } from "@/lib/env";
import { jsonOk } from "@/lib/http";
import { addDays, formatDateInTimezone } from "@/lib/time";

export async function GET(_request: NextRequest) {
  const today = formatDateInTimezone(new Date(), env.appTimezone);
  const maxDate = addDays(today, env.bookingWindowDays);
  const dates = getBookableDates(today, maxDate);
  return jsonOk({ dates, min_date: today, max_date: maxDate });
}
