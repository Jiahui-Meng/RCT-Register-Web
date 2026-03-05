import { isValidDateString, isValidTimeString } from "@/lib/time";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_ID_REGEX = /^[A-Za-z0-9_-]{2,32}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RegisterPayload = {
  student_id: string;
  email: string;
  preferences: string[];
};

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidStudentId(studentId: string): boolean {
  return STUDENT_ID_REGEX.test(studentId);
}

export function validateRegisterPayload(payload: unknown): {
  valid: boolean;
  errors: string[];
  parsed?: RegisterPayload;
} {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Payload must be an object."] };
  }

  const {
    student_id: studentId,
    email,
    preferences
  } = payload as Partial<RegisterPayload>;

  if (!studentId || typeof studentId !== "string" || !isValidStudentId(studentId)) {
    errors.push("Invalid student_id.");
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    errors.push("Invalid email.");
  }

  if (!Array.isArray(preferences) || preferences.length !== 3) {
    errors.push("Preferences must contain exactly 3 sessions.");
  } else {
    const unique = new Set(preferences);
    if (unique.size !== 3) {
      errors.push("Preferences must be unique.");
    }
    if (preferences.some((value) => typeof value !== "string" || !UUID_REGEX.test(value))) {
      errors.push("Preferences must contain valid session IDs.");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    parsed: {
      student_id: studentId!.trim(),
      email: email!.trim().toLowerCase(),
      preferences: preferences!
    }
  };
}

export function validateSessionQueryParams(params: {
  date?: string;
  start_time?: string;
  end_time?: string;
}) {
  const errors: string[] = [];

  if (params.date && !isValidDateString(params.date)) {
    errors.push("Invalid date.");
  }
  if (params.start_time && !isValidTimeString(params.start_time)) {
    errors.push("Invalid start_time.");
  }
  if (params.end_time && !isValidTimeString(params.end_time)) {
    errors.push("Invalid end_time.");
  }
  if (
    params.start_time &&
    params.end_time &&
    params.start_time.localeCompare(params.end_time) >= 0
  ) {
    errors.push("start_time must be earlier than end_time.");
  }

  return { valid: errors.length === 0, errors };
}
