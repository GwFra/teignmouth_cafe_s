# Teignmouth Flat Whites ☕

A little app for scoring **flat whites** across the cafes of Teignmouth — how
they rate, what they cost, and whether they were _worth it_.

Built with **Next.js (App Router)**, **Tailwind CSS**, **shadcn/ui**,
**Drizzle ORM** on **Neon Postgres**, **Google Maps**, and Google sign-in using
**Neon Auth** (managed Better Auth).

> A native mobile app is planned as a future feature and is intentionally out of
> scope for now.

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
npm run db:migrate     # apply the migrations in drizzle/ to DATABASE_URL
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

### Changing the schema

After editing `src/lib/db/schema.ts`, run `npm run db:generate` and commit the
new files in `drizzle/` alongside it. PR checks fail if the schema has changed
without a migration. Production is migrated by the deploy workflow, so don't
run `db:push` or `db:migrate` against it by hand.

### 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000> and sign in. To edit, give your user the `admin`
role (see [Admin users](#admin-users)), then open `/admin`.

To sign in without Google OAuth (for example against the local Docker
database, or to see the read-only view), set `DEV_LOGIN="true"` in
`.env.local`. The header then shows **Dev admin** and **Dev viewer** buttons.
Dev admin signs in as the first `ADMIN_EMAILS` entry; Dev viewer signs in as a
read-only placeholder user. This only works under `npm run dev`, so production
builds ignore it.

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
    globals.css              # theme tokens (light/dark) + map card animation
    api/
      auth/[...path]/                 # Neon Auth proxy (OAuth, sessions)
      auth/dev-login/                 # local-only sign-in without Google
      reviews/…                       # GET (public), POST/PATCH/DELETE (admin)
      cafes/…                         # GET (public), POST/PATCH/DELETE (admin)
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
    auth.ts                  # getAuth / requireAdmin
    neon-auth.ts             # Neon Auth server instance
    auth-client.ts           # Neon Auth browser client
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
(e.g. `teignmouth-flat-whites-0.3.2`).

Merging the release PR automatically deploys the new tag to Vercel production.
To retry a failed deploy, or redeploy an earlier release, run **Deploy to
Vercel** from the Actions tab with the release tag. Re-running the Release
Please workflow won't redeploy, because the release already exists.
The deploy needs these GitHub Actions settings:

| Name                                                 | Kind     | Used for                           |
| ---------------------------------------------------- | -------- | ---------------------------------- |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | secrets  | deploying to Vercel                |
| `DATABASE_URL`                                       | secret   | running migrations on production   |
| `NEON_API_KEY`                                       | secret   | creating the rollback branch       |
| `NEON_PROJECT_ID`                                    | variable | creating the rollback branch       |
| `NEON_PRODUCTION_BRANCH`                             | variable | the Neon branch production runs on |

### Database migrations

Each deploy, after the build and before going live:

1. creates a Neon branch named `pre-<tag>-…` from production, as a rollback
   point. It has no compute and expires after 14 days;
2. runs `db:baseline`, which (once only) records the first migration as
   applied on a database created with `db:push`;
3. runs `db:migrate`.

If a migration fails, the deploy stops and the previous release keeps serving.
Because migrations run before the new code goes live, a migration that drops or
renames something must ship in a later release than the code that stops using
it.

To roll back the database, restore production from the rollback branch. This
also restores Neon Auth users and sessions to that point. The previous state is
kept under the name you give:

```bash
neon branches restore <production-branch> <rollback-branch> \
  --preserve-under-name <production-branch>-before-restore
```

## Roadmap

- Native mobile app.
- Photo uploads per review.
- Public submission flow with moderation.

```

```
