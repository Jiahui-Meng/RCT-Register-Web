function readEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export function assertRequiredEnv(names: string[]) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
}

export const env = {
  adminPasswordHash: readEnv("ADMIN_PASSWORD_HASH"),
  adminSessionSecret: readEnv("ADMIN_SESSION_SECRET"),
  bookingWindowDays: Number(process.env.BOOKING_WINDOW_DAYS ?? 30),
  appTimezone: process.env.APP_TIMEZONE ?? "Asia/Hong_Kong",
  sqliteDbPath: readEnv("SQLITE_DB_PATH")
};
