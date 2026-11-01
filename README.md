# Teignmouth Flat Whites ☕

A little app for scoring **flat whites** across the cafes of Teignmouth — how
they rate, what they cost, and whether they were _worth it_.

Built with **Next.js (App Router)**, **Tailwind CSS**, **shadcn/ui**,
**Drizzle ORM** on **Neon Postgres**, **Google Maps**, and Google sign-in using
a **JWT backed by a revocable database session**.

> A native mobile app is planned as a future feature and is intentionally out of
> scope for now.

---

## Features

- **Map view** — Google Maps with a marker per cafe, grouped into clusters
  where cafes are close together. Click a marker for average rating, average
  cost and the "worth it" rate, shown on a card that opens with a latte-art
  animation.
- **List view** — the raw review data in a sortable table.
- **Filters** — one set of filters narrows both the map and the list: search
  by cafe name, type (barista/machine), worth-it, minimum rating and maximum
  cost. On mobile they open in a pop-up.
- **Admin dashboard** — mobile-friendly CRUD for cafes and reviews, plus a
  session manager to revoke sign-ins remotely. Adding a cafe looks up its
  address and coordinates with Google Places search. Changes show up
  immediately in the map and list views.
- **Auth** — Google OAuth. Only emails on an allowlist can edit; everyone else
  can sign in but stays read-only.
- **Light and dark themes** — follows the system setting by default, with a
  toggle to pick light or dark.

## Data model

Each review captures exactly what the brief asked for:

| Field      | Stored as                   | Shown as        |
| ---------- | --------------------------- | --------------- |
| `cafe`     | linked `cafes` row (name)   | cafe name       |
| `type`     | enum `machine` \| `barista` | Machine/Barista |
| `worth it` | enum `yes` \| `no`          | Yes/No badge    |
| `rating`   | numeric (0–5)               | `4.5 / 5`       |
| `cost`     | numeric (GBP)               | `£3.40`         |

Rating and cost are stored numerically so the list view can filter and sort on
them; the UI formats cost with a `£` prefix. Location (address + lat/lng) lives
on the `cafes` table so it can be shared across a cafe's reviews and drawn on
the map.

---

## Getting started

### 1. Install dependencies

Requires Node 26 (pinned in `.nvmrc`, so `nvm use` picks it up).

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable                          | Where to get it                                                           |
| --------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`                    | [Neon](https://neon.tech) → your project → pooled connection string       |
| `AUTH_SECRET`                     | `openssl rand -base64 48`                                                 |
| `GOOGLE_CLIENT_ID` / `_SECRET`    | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `ADMIN_EMAILS`                    | Comma-separated Google emails allowed to edit                             |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud → Maps JavaScript API key (restrict by HTTP referrer)        |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`  | Google Cloud → Map Management (optional; falls back to the app's own ID)  |
| `APP_URL`                         | Base URL, e.g. `http://localhost:3000`                                    |
| `DEV_LOGIN`                       | `"true"` for local sign-in without Google (see step 4)                    |

**Google OAuth setup:** create an OAuth 2.0 Client (type: Web application) and
add `\${APP_URL}/api/auth/callback` (e.g. `http://localhost:3000/api/auth/callback`)
as an authorised redirect URI.

**Google Maps setup:** enable both the _Maps JavaScript API_ and the _Places
API_ on the project. The admin cafe dialog uses Places to look up addresses,
and Places needs billing enabled on the project even within the free monthly
quota. Create a browser key and restrict it to your domain(s) by HTTP referrer.

The map's markers need a Map ID. If `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` is unset,
the app uses its own (in `src/lib/maps-config.ts`). To style the map, link a
Map Style to your Map ID in Cloud Console; the Maps JavaScript API can't take a
style ID directly.

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

Open <http://localhost:3000>. Sign in, and if your email is in `ADMIN_EMAILS`
you'll be taken to `/admin`.

To sign in without Google OAuth (for example against the local Docker
database, or to see the read-only view), set `DEV_LOGIN="true"` in
`.env.local`. The header then shows **Dev admin** and **Dev viewer** buttons.
Dev admin signs in as the first `ADMIN_EMAILS` entry; Dev viewer signs in as a
read-only placeholder user. This only works under `npm run dev`, so production
builds ignore it.

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
3. **Revoking** a session (from the admin _Sessions_ tab, or on sign-out) marks
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
    globals.css              # theme tokens (light/dark) + map card animation
    api/
      auth/{login,callback,logout}/   # Google OAuth + session cookie
      auth/dev-login/                 # local-only sign-in (DEV_LOGIN=true)
      reviews/…                       # GET (public), POST/PATCH/DELETE (admin)
      cafes/…                         # GET (public), POST/PATCH/DELETE (admin)
      sessions/…                      # GET + revoke (admin)
  components/
    ui/                      # shadcn/ui primitives
    views/                   # explorer switcher, map/list views, filter bar
    admin/                   # dashboard, review/cafe dialogs, place autocomplete
    latte-badge.tsx          # latte-art cup on the map detail card
    review-type.tsx          # machine/barista label with tooltip
    site-header.tsx
    theme-toggle.tsx         # system/light/dark selector
  lib/
    db/{schema,index,seed}.ts
    auth.ts                  # JWT + revocable session logic
    dev-login.ts             # local-only sign-in helpers
    google.ts                # OAuth helpers
    queries.ts               # shared read queries
    validation.ts            # API request validation
    form-validation.ts       # zod helpers for the admin forms
    review-filters.ts        # filter state shared by map + list views
    client.ts                # fetch wrapper for admin mutations
    format.ts                # cost / rating / type display helpers
    maps-config.ts           # Teignmouth centre/bounds, Maps libraries
    theme.ts, use-is-dark.ts # theme preference + resolved dark mode
    types.ts                 # shapes shared by server and client
scripts/
  env-vars.mjs               # .env.example annotation lint + Vercel env sync
```

## Deploying

Deployed to Vercel. Point `APP_URL` at your production origin, and add the
production `/api/auth/callback` URL to the Google OAuth client's authorised
redirect URIs.

### Releases

Versioning is handled by [release-please](https://github.com/googleapis/release-please).
Conventional commits merged to `main` keep a release PR up to date; merging that
PR bumps `package.json`, updates `CHANGELOG.md`, and tags a GitHub release
(e.g. `teignmouth-flat-whites-0.3.2`).

Merging the release PR automatically deploys the new tag to Vercel production.
The deploy needs the `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`
secrets. Optionally, a `RELEASE_PLEASE_TOKEN` secret (a personal access token)
lets the release PR trigger the PR checks; without it, release-please uses the
default `GITHUB_TOKEN`.

### Environment variables in production

You don't add new variables to Vercel by hand. Every variable in `.env.example`
is annotated with how it's stored in Vercel:

```bash
# @vercel secret   sensitive value, stored as a Vercel secret
# @vercel config   readable value, stored as a Vercel config variable
# @vercel local    local development only, never synced
```

CI fails if a variable is missing its annotation (`npm run lint:env`).

When a release adds a variable to `.env.example`:

1. Add its value in GitHub as a repository secret (for `secret`) or repository
   variable (for `config`) with the same name.
2. The open release PR gets a comment listing the new variables and whether
   each value is ready in GitHub. After adding a value, re-run the _Release
   Please_ workflow manually to refresh the comment.
3. When the release PR is merged, the deploy adds the new variables to Vercel's
   production environment before building.

Variables that existed before the env sync was set up, or were removed from
`.env.example`, still need managing in the Vercel project settings. See
`scripts/env-vars.mjs` for the details.

## Roadmap

- Native mobile app.
- Photo uploads per review.
- Public submission flow with moderation.
