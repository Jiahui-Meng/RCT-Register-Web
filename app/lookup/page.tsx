"use client";

import Link from "next/link";
import { useState } from "react";

type LookupResponse =
  | {
      status: "ok";
      registration: {
        student_id: string;
        email: string;
        assigned_priority: number;
        created_at: string;
        session_date: string;
        start_time: string;
        end_time: string;
      };
    }
  | {
      status: "not_found" | "invalid_input";
      message?: string;
    };

function formatDisplayDate(dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const [year, month, day] = dateString.split("-");
  return `${month}-${day}-${year}`;
}

export default function LookupPage() {
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResponse | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!studentId.trim() || !email.trim()) {
      setError("student_id and email are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/public/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId.trim(),
          email: email.trim()
        })
      });

      const body = (await response.json()) as LookupResponse;
      setResult(body);

      if (!response.ok) {
        if (body.status === "not_found") {
          setError("No registration found for this student_id and email.");
        } else {
          setError("Invalid request. Please check your input.");
        }
      }
    } catch {
      setError("Failed to check registration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Check My Booking</h1>
        <p className="muted">Enter your student ID and email to view your assigned session.</p>
        <div className="row">
          <Link href="/register" className="link-button">
            Go To Registration
          </Link>
        </div>
      </div>

      <form className="card" onSubmit={onSubmit}>
        <div className="row">
          <div>
            <label htmlFor="student-id">Student ID</label>
            <input
              id="student-id"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              placeholder="e.g. s1234567"
            />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@school.edu"
            />
          </div>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {result && result.status === "ok" ? (
          <p className="success">
            Assigned: {formatDisplayDate(result.registration.session_date)} {result.registration.start_time} - {result.registration.end_time} (Priority {result.registration.assigned_priority})
          </p>
        ) : null}

        <button type="submit" disabled={loading}>
          {loading ? "Checking..." : "Check My Booking"}
        </button>
      </form>
    </main>
  );
}
