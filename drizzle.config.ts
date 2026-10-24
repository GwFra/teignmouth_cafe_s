import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Use the same .env files as the app (development mode), so db:push etc. hit
// the same DATABASE_URL as `next dev`. A DATABASE_URL set in the shell wins.
loadEnvConfig(process.cwd(), true);

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
