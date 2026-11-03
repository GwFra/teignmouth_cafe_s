#!/usr/bin/env node
/**
 * Lets `drizzle-kit migrate` take over a database whose schema was created
 * with `db:push`, so has no record of applied migrations.
 *
 * If drizzle.__drizzle_migrations is missing but every table created by the
 * first migration exists, the first migration is recorded as applied (the
 * same hash and timestamp drizzle-kit would write), so `migrate` only runs the
 * later ones. It does nothing on a fresh database or one already tracked, and
 * fails if only some of those tables exist, since the schema is then unknown.
 *
 * Safe to run before every migrate; after the first run it's a no-op.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/db-baseline.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const MIGRATIONS_FOLDER = "drizzle";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = neon(url);

const [{ tracked }] =
  await sql`select to_regclass('drizzle.__drizzle_migrations') is not null as tracked`;
if (tracked) {
  console.log("Migrations are already tracked; nothing to baseline.");
  process.exit(0);
}

const journal = JSON.parse(
  readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8"),
);
const first = journal.entries[0];
const query = readFileSync(`${MIGRATIONS_FOLDER}/${first.tag}.sql`, "utf8");
const tables = [...query.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]);

const existing = [];
for (const table of tables) {
  const [{ found }] =
    await sql`select to_regclass(${`public.${table}`}) is not null as found`;
  if (found) existing.push(table);
}

if (existing.length === 0) {
  console.log("Fresh database; migrate will create the schema.");
  process.exit(0);
}
if (existing.length < tables.length) {
  const missing = tables.filter((t) => !existing.includes(t));
  console.error(
    `Untracked schema doesn't match ${first.tag}: missing ${missing.join(", ")}. Baseline it by hand.`,
  );
  process.exit(1);
}

// Same table, hash and timestamp as drizzle-orm's migrator.
const hash = createHash("sha256").update(query).digest("hex");
await sql.transaction([
  sql`create schema if not exists drizzle`,
  sql`create table if not exists drizzle.__drizzle_migrations (
    id serial primary key,
    hash text not null,
    created_at bigint
  )`,
  sql`insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${hash}, ${first.when})`,
]);
console.log(`Recorded ${first.tag} as applied.`);
