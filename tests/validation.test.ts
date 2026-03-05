import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  isValidStudentId,
  validateLookupPayload,
  validateRegisterPayload
} from "@/lib/validation";

describe("validation helpers", () => {
  it("accepts valid student id and email", () => {
    expect(isValidStudentId("s1234567")).toBe(true);
    expect(isValidEmail("student@example.com")).toBe(true);
  });

  it("rejects invalid student id", () => {
    expect(isValidStudentId("!bad-id")).toBe(false);
  });

  it("rejects duplicate preferences", () => {
    const result = validateRegisterPayload({
      student_id: "s1234567",
      email: "student@example.com",
      preferences: ["id-1", "id-1", "id-3"]
    });
    expect(result.valid).toBe(false);
  });

  it("requires exactly 3 preferences", () => {
    const result = validateRegisterPayload({
      student_id: "s1234567",
      email: "student@example.com",
      preferences: ["id-1", "id-2"]
    });
    expect(result.valid).toBe(false);
  });

  it("validates lookup payload", () => {
    const result = validateLookupPayload({
      student_id: "s1234567",
      email: "student@example.com"
    });
    expect(result.valid).toBe(true);
    expect(result.parsed?.email).toBe("student@example.com");
  });

  it("rejects invalid lookup payload", () => {
    const result = validateLookupPayload({
      student_id: "!bad",
      email: "oops"
    });
    expect(result.valid).toBe(false);
  });
});
