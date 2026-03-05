"use client";

import { useEffect, useMemo, useState } from "react";

type RegistrationItem = {
  id: string;
  student_id: string;
  email: string;
  assigned_priority: number;
  created_at: string;
  session: {
    session_date: string;
    start_at: string;
    end_at: string;
  } | null;
};

function todayLocalString() {
  return new Date().toISOString().slice(0, 10);
}

function displayTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export default function AdminRegistrationsClient() {
  const [date, setDate] = useState(todayLocalString());
  const [rows, setRows] = useState<RegistrationItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const minDate = useMemo(() => todayLocalString(), []);
  const maxDate = useMemo(() => {
    const dateObj = new Date(`${todayLocalString()}T00:00:00`);
    dateObj.setDate(dateObj.getDate() + 30);
    return dateObj.toISOString().slice(0, 10);
  }, []);

  async function loadRegistrations(dateValue: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/registrations?date=${dateValue}`);
      const body = (await response.json()) as {
        registrations?: RegistrationItem[];
        message?: string;
      };
      if (!response.ok) {
        setError(body.message ?? "Failed to load registrations.");
        return;
      }
      setRows(body.registrations ?? []);
    } catch {
      setError("Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRegistrations(date);
  }, [date]);

  function downloadCsv() {
    window.location.href = `/api/admin/registrations/export?date_from=${date}&date_to=${date}`;
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Registrations</h1>
        <p className="muted">View assigned sessions and export CSV.</p>
        <div className="row">
          <a href="/admin/sessions" className="link-button secondary">
            Back to Sessions
          </a>
          <button onClick={downloadCsv}>Export CSV</button>
        </div>
      </div>

      <div className="card">
        <label htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      <div className="card">
        <h2>Assigned Students</h2>
        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="muted">No registrations found.</p>
        ) : null}
        <div className="list">
          {rows.map((row) => (
            <div key={row.id} className="session-item">
              <div>
                <strong>{row.student_id}</strong> ({row.email})
                <div className="muted">
                  Priority {row.assigned_priority}
                  {row.session
                    ? ` | ${row.session.session_date} ${displayTime(row.session.start_at)} - ${displayTime(row.session.end_at)}`
                    : " | Session unavailable"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
