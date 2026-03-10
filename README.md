# Hand Hygiene Training Trail - CUHK (V1.1)

Location: Pathology Teaching Laboratory 6 , 1/F, Lui Che Woo Clinical Sciences Building, Prince of Wales Hospital

## Features

- 20-minute sessions with `capacity = 2`
- Student submits 3 unique ranked preferences (`P1 -> P2 -> P3`)
- Server assigns the first available preference in one atomic DB function
- One confirmed booking per student (`unique(student_id)`)
- Manual admin session creation, session open/close, roster view, CSV export
- Booking window constrained to next 30 days

## Stack

- Next.js App Router (TypeScript)
- SQLite (`better-sqlite3`)
- Server-side transaction logic for priority assignment (`P1 -> P2 -> P3`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Fill environment variables:

- `ADMIN_PASSWORD_HASH` (bcrypt hash, not plaintext)
- `ADMIN_SESSION_SECRET` (random secret for signed admin cookie)
- `BOOKING_WINDOW_DAYS` (default 30)
- `APP_TIMEZONE` (default `Asia/Hong_Kong`)
- `SQLITE_DB_PATH` (optional; default `./data/rct.db`)

4. Run app:

```bash
npm run dev
```

The SQLite database file and schema are auto-initialized on first API access.

## Routes

- Student:
  - `GET /register`
  - `GET /api/public/sessions?date=YYYY-MM-DD`
  - `POST /api/public/register`

- Admin:
  - `GET /admin/login`
  - `GET /admin/sessions`
  - `GET /admin/registrations`
  - `POST /api/admin/login`
  - `POST /api/admin/logout`
  - `GET /api/admin/sessions?date=YYYY-MM-DD`
  - `POST /api/admin/sessions/bulk-create`
  - `PATCH /api/admin/sessions/:id`
  - `GET /api/admin/registrations?date=YYYY-MM-DD`
  - `GET /api/admin/registrations/export?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

## Booking Status Codes

- `ok`
- `duplicate_student`
- `all_full`
- `closed_or_invalid_session`
- `invalid_input`

## Notes

- V1 does not send email yet (reserved for V2).
- Session creation is constrained to 20-minute intervals.
- `booked_count` is maintained atomically in SQLite transaction logic to avoid oversubscription.
