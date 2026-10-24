import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

// Host used by the local Docker database (see docker-compose.yml). It's public
// DNS for 127.0.0.1, and queries for it go over plain HTTP to the local Neon
// HTTP proxy instead of Neon's HTTPS API.
const LOCAL_DB_HOST = "db.localtest.me";
const LOCAL_PROXY_PORT = 4444;

let _db: DB | null = null;

function getDb(): DB {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
    );
  }
  if (new URL(process.env.DATABASE_URL).hostname === LOCAL_DB_HOST) {
    neonConfig.fetchEndpoint = (host) =>
      `http://${host}:${LOCAL_PROXY_PORT}/sql`;
  }
  const sql = neon(process.env.DATABASE_URL);
  _db = drizzle(sql, { schema });
  return _db;
}

/**
 * Lazily-initialised Drizzle client. The connection string is only read the
 * first time a query runs, so `next build` succeeds without a database present.
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof DB];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export * from "./schema";
