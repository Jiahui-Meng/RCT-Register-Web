"use client";

import { useEffect, useMemo, useState } from "react";

type SessionItem = {
  id: string;
  session_date: string;
  start_at: string;
  end_at: string;
  capacity: number;
  booked_count: number;
  is_open: boolean;
  is_full: boolean;
};

function todayLocalString() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function displayTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export default function AdminSessionsClient() {
  const [date, setDate] = useState(todayLocalString());
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [creating, setCreating] = useState(false);
  const [clearing, setClearing] = useState(false);

  const minDate = useMemo(() => todayLocalString(), []);
  const maxDate = useMemo(() => plusDays(todayLocalString(), 30), []);

  async function loadSessions(dateValue: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/sessions?date=${dateValue}`);
      const body = (await response.json()) as { sessions?: SessionItem[]; message?: string };
      if (!response.ok) {
        setError(body.message ?? "Failed to load sessions.");
        return;
      }
      setSessions(body.sessions ?? []);
    } catch {
      setError("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions(date);
  }, [date]);

  async function createSessions() {
    setCreating(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/sessions/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          start_time: startTime,
          end_time: endTime,
          interval_minutes: 20
        })
      });
      const body = (await response.json()) as {
        status: string;
        created_count?: number;
        message?: string;
      };
      if (!response.ok) {
        setError(body.message ?? "Failed to create sessions.");
        return;
      }
      setMessage(`Generated ${body.created_count ?? 0} sessions.`);
      await loadSessions(date);
    } catch {
      setError("Failed to create sessions.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleSession(id: string, isOpen: boolean) {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_open: !isOpen })
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "Failed to update session.");
        return;
      }
      await loadSessions(date);
    } catch {
      setError("Failed to update session.");
    }
  }

  function downloadCsv() {
    window.location.href = `/api/admin/registrations/export?date_from=${date}&date_to=${date}`;
  }

  async function clearAllBookings() {
    const confirmed = window.confirm(
      "This will delete ALL booking records and reset all session counts to 0. Continue?"
    );
    if (!confirmed) {
      return;
    }

    setClearing(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/registrations/clear-all", { method: "POST" });
      const body = (await response.json()) as { deleted_count?: number; message?: string };
      if (!response.ok) {
        setError(body.message ?? "Failed to clear bookings.");
        return;
      }
      setMessage(`Cleared ${body.deleted_count ?? 0} booking(s).`);
      await loadSessions(date);
    } catch {
      setError("Failed to clear bookings.");
    } finally {
      setClearing(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Admin Sessions</h1>
        <p className="muted">Manage session availability and capacity usage.</p>
        <div className="row">
          <button className="secondary" onClick={logout}>
            Logout
          </button>
          <a href="/admin/registrations" className="link-button">
            View Registrations
          </a>
          <button onClick={downloadCsv}>Export CSV</button>
          <button className="secondary" onClick={clearAllBookings} disabled={clearing}>
            {clearing ? "Clearing..." : "Clear All Bookings"}
          </button>
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
        <h2>Generate 20-minute sessions</h2>
        <div className="row">
          <div>
            <label htmlFor="start-time">Start Time</label>
            <input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="end-time">End Time</label>
            <input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>
        </div>
        <button onClick={createSessions} disabled={creating}>
          {creating ? "Creating..." : "Generate Sessions"}
        </button>
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>

      <div className="card">
        <h2>Session List</h2>
        {loading ? <p className="muted">Loading...</p> : null}
        {!loading && sessions.length === 0 ? <p className="muted">No sessions found.</p> : null}
        <div className="list">
          {sessions.map((session) => (
            <div key={session.id} className="session-item">
              <div>
                <strong>
                  {displayTime(session.start_at)} - {displayTime(session.end_at)}
                </strong>
                <div className="muted">
                  {session.booked_count}/{session.capacity} booked
                  {session.is_full ? " (Full)" : ""}
                </div>
              </div>
              <button
                className="secondary"
                onClick={() => toggleSession(session.id, session.is_open)}
              >
                {session.is_open ? "Close" : "Open"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
