# Teignmouth Flat Whites ☕

A little app for scoring **flat whites** across the cafes of Teignmouth — how
they rate, what they cost, and whether they were _worth it_.

Built with **Next.js (App Router)**, **Tailwind CSS**, **shadcn/ui**,
**Drizzle ORM** on **Neon Postgres**, **Google Maps**, and Google sign-in using
**Neon Auth** (managed Better Auth).

> This is the initial outline of the application. A native mobile app is noted
> as a future feature and is intentionally out of scope for now.

---

## Features

- **Map view** — Google Maps with a marker per cafe; click for average rating,
  average cost and the "worth it" rate.
- **List view** — the raw review data in a sortable table, with filters on
  cafe, type (barista/machine), worth-it, minimum rating and maximum cost.
- **Admin dashboard** — mobile-friendly CRUD for cafes and reviews. Changes
  show up immediately in the map and list views.
- **Auth** — Google sign-in via Neon Auth. Only users with the `admin` role can
  edit; everyone else can sign in but stays read-only.

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

| Variable                          | Where to get it                                                     |
| --------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                    | [Neon](https://neon.tech) → your project → pooled connection string |
| `NEON_AUTH_BASE_URL`              | Neon → your branch → Auth → Auth URL                                |
| `NEON_AUTH_COOKIE_SECRET`         | `openssl rand -base64 32`                                           |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud → Maps JavaScript API key (restrict by HTTP referrer)  |

**Neon Auth setup:** in the Neon Console, enable Auth on the branch. Under
Settings → Auth:

- turn off email/password sign-in, so Google is the only way in;
- add your app's origins (e.g. `http://localhost:3000`) as trusted domains;
- add Google as an OAuth provider with your own client ID and secret. Neon's
  shared development credentials work without this, but show Neon's branding.

**Google OAuth setup:** create an OAuth 2.0 Client (type: Web application) and
add `\${NEON_AUTH_BASE_URL}/callback/google` as an authorised redirect URI, for
each Neon branch you sign in against.

With `DEV_LOGIN="true"` and the local Docker database you can skip the Neon
Auth variables and use the _Dev admin_ / _Dev viewer_ buttons instead.

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

#### Or: use a local database in Docker

Instead of a Neon project, you can run Postgres locally behind a Neon HTTP
proxy, so the app's serverless driver works unchanged:

```bash
npm run db:up      # start Postgres + proxy (docker compose up -d)
```

and set this in `.env.local`:

```bash
DATABASE_URL="postgres://postgres:postgres@db.localtest.me:5432/main"
```

The first start, with an empty data volume, applies the migrations in
`drizzle/` and loads the sample data from `docker/db/seed.sql`, so step 3's
commands aren't needed. Data persists between restarts; `npm run db:reset`
wipes the volume and re-seeds, and `npm run db:down` stops the containers.

Schema changes only reach a fresh local database through migration files, so
use `db:generate` (not just `db:push`) when changing `schema.ts`.

### 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000> and sign in. To edit, give your user the `admin`
role (see [Admin users](#admin-users)), then open `/admin`.

---

## How authentication works

Sign-in uses [Neon Auth](https://neon.com/docs/auth/overview), Neon's managed
[Better Auth](https://www.better-auth.com) service:

1. _Sign in_ calls Better Auth's Google sign-in from the browser. The OAuth
   flow and callback run through `/api/auth/*`, which proxies to Neon Auth.
2. Users, sessions and linked Google accounts are stored by Neon Auth in the
   `neon_auth` schema of the same Neon branch. Drizzle doesn't manage that
   schema.
3. `getAuth()` reads the session with `auth.getSession()`. Session data is
   cached in a signed cookie for up to 5 minutes between checks with Neon Auth.
4. Sessions can be listed and revoked in the Neon Console.

### Admin users

Admins are users with the `admin` role in Neon Auth. Everyone else is
read-only. A user has to sign in once before you can promote them, then either:

- **Console:** Neon → your branch → Auth → Users → ⋯ → _Make admin_; or
- **CLI:** `neon neon-auth user set-role <user-id> --roles admin`.

Roles belong to the branch's auth data, so set them on the production branch.
A change can take up to 5 minutes to apply to a signed-in user, because of the
session cookie cache. The `admin` role also unlocks Better Auth's admin API
(listing, banning and impersonating users, and setting roles), so only give it
to people you trust with that.

---

## Project structure

```
src/
  app/
    page.tsx                 # public: map + list explorer
    admin/page.tsx           # admin dashboard (guarded)
    api/
      auth/[...path]/                 # Neon Auth proxy (OAuth, sessions)
      auth/dev-login/                 # local-only sign-in without Google
      reviews/…                       # GET (public), POST/PATCH/DELETE (admin)
      cafes/…                         # GET (public), POST/PATCH/DELETE (admin)
  components/
    ui/                      # shadcn/ui primitives
    views/                   # map-view, list-view, explorer switcher
    admin/                   # dashboard + review/cafe dialogs
    site-header.tsx
  lib/
    db/{schema,index,seed}.ts
    auth.ts                  # getAuth / requireAdmin
    neon-auth.ts             # Neon Auth server instance
    auth-client.ts           # Neon Auth browser client
    queries.ts               # shared read queries
    validation.ts            # request validation
```

## Deploying

Works well on Vercel. Set the same environment variables in the project
settings, using the production branch's `NEON_AUTH_BASE_URL`. Add the
production origin (and a wildcard for preview URLs if you use them) to Neon
Auth's trusted domains, and the production branch's
`${NEON_AUTH_BASE_URL}/callback/google` URL to the Google OAuth client's
authorised redirect URIs.

### Releases

Versioning is handled by [release-please](https://github.com/googleapis/release-please).
Conventional commits merged to `main` keep a release PR up to date; merging that
PR bumps `package.json`, updates `CHANGELOG.md`, and tags a GitHub release
(e.g. `0.3.0`).

Merging the release PR automatically deploys the new tag to Vercel production.
The deploy needs the `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`
secrets.

## Roadmap

- Native mobile app (future — not in this outline).
- Photo uploads per review.
- Public submission flow with moderation.

```

```
