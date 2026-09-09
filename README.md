# Teignmouth Flat Whites ☕

A little app for scoring **flat whites** across the cafes of Teignmouth — how
they rate, what they cost, and whether they were _worth it_.

Built with **Next.js (App Router)**, **Tailwind CSS**, **shadcn/ui**,
**Drizzle ORM** on **Neon Postgres**, **Google Maps**, and Google sign-in using
a **JWT backed by a revocable database session**.

> This is the initial outline of the application. A native mobile app is noted
> as a future feature and is intentionally out of scope for now.

---

## Features

- **Map view** — Google Maps with a marker per cafe; click for average rating,
  average cost and the "worth it" rate.
- **List view** — the raw review data in a sortable table, with filters on
  cafe, type (barista/machine), worth-it, minimum rating and maximum cost.
- **Admin dashboard** — mobile-friendly CRUD for cafes and reviews, plus a
  session manager to revoke sign-ins remotely. Changes show up immediately in
  the map and list views.
- **Auth** — Google OAuth. Only emails on an allowlist can edit; everyone else
  can sign in but stays read-only.

## Data model

Each review captures exactly what the brief asked for:

| Field      | Stored as                     | Shown as        |
| ---------- | ----------------------------- | --------------- |
| `cafe`     | linked `cafes` row (name)     | cafe name       |
| `type`     | enum `machine` \| `barista`   | Machine/Barista |
| `worth it` | enum `yes` \| `no`            | Yes/No badge    |
| `rating`   | numeric (0–5)                 | `4.5 / 5`       |
| `cost`     | numeric (GBP)                 | `£3.40`         |

Rating and cost are stored numerically so the list view can filter and sort on
them; the UI formats cost with a `£` prefix. Location (address + lat/lng) lives
on the `cafes` table so it can be shared across a cafe's reviews and drawn on
the map.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable                          | Where to get it                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | [Neon](https://neon.tech) → your project → pooled connection string             |
| `AUTH_SECRET`                     | `openssl rand -base64 48`                                                        |
| `GOOGLE_CLIENT_ID` / `_SECRET`    | [Google Cloud Console](https://console.cloud.google.com/apis/credentials)       |
| `ADMIN_EMAILS`                    | Comma-separated Google emails allowed to edit                                   |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud → Maps JavaScript API key (restrict by HTTP referrer)              |
| `APP_URL`                         | Base URL, e.g. `http://localhost:3000`                                          |

**Google OAuth setup:** create an OAuth 2.0 Client (type: Web application) and
add `\${APP_URL}/api/auth/callback` (e.g. `http://localhost:3000/api/auth/callback`)
as an authorised redirect URI.

**Google Maps setup:** enable the *Maps JavaScript API* and create a browser key.
Restrict it to your domain(s).

### 3. Create the database schema

```bash
npm run db:push        # push the Drizzle schema to Neon
# or, to keep migration files:
npm run db:generate && npm run db:migrate
```

Optionally load illustrative sample data (placeholder cafes — replace with real
ones via the dashboard):

```bash
npm run db:seed
```

### 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000>. Sign in, and if your email is in `ADMIN_EMAILS`
you'll be taken to `/admin`.

---

## How authentication works

The brief asked for "a JWT that has DB session storage that can be revoked
remotely", so:

1. On Google sign-in we create a row in the `sessions` table and issue a signed
   **JWT** (via [`jose`](https://github.com/panva/jose)) whose payload carries
   that session's id (`sid`). The JWT is stored in an `httpOnly` cookie.
2. On **every** request, `getAuth()` verifies the JWT signature **and** looks
   the session up in the database, rejecting it if the row is missing, expired
   or has `revoked_at` set.
3. **Revoking** a session (from the admin *Sessions* tab, or on sign-out) marks
   the row revoked — the very next request from that device is signed out, even
   though the JWT itself is still cryptographically valid.

Admin rights are computed from `ADMIN_EMAILS` at request time, so changing the
allowlist takes effect without anyone needing to sign in again.

---

## Project structure

```
src/
  app/
    page.tsx                 # public: map + list explorer
    admin/page.tsx           # admin dashboard (guarded)
    api/
      auth/{login,callback,logout}/   # Google OAuth + session cookie
      reviews/…                       # GET (public), POST/PATCH/DELETE (admin)
      cafes/…                         # GET (public), POST/PATCH/DELETE (admin)
      sessions/…                      # GET + revoke (admin)
  components/
    ui/                      # shadcn/ui primitives
    views/                   # map-view, list-view, explorer switcher
    admin/                   # dashboard + review/cafe dialogs
    site-header.tsx
  lib/
    db/{schema,index,seed}.ts
    auth.ts                  # JWT + revocable session logic
    google.ts                # OAuth helpers
    queries.ts               # shared read queries
    validation.ts            # request validation
```

## Deploying

Works well on Vercel. Set the same environment variables in the project
settings, point `APP_URL` at your production origin, and add the production
`/api/auth/callback` URL to the Google OAuth client's authorised redirect URIs.

## Roadmap

- Native mobile app (future — not in this outline).
- Photo uploads per review.
- Public submission flow with moderation.
```
