import { createNeonAuth, type NeonAuth } from "@neon/auth/next/server";

let _auth: NeonAuth | null = null;

/**
 * Lazily-created Neon Auth (managed Better Auth) server instance. Like the db
 * client, the env is only read on first use, so `next build` and Docker-only
 * local dev (with dev login) work without Neon Auth configured.
 */
export function getNeonAuth(): NeonAuth {
  if (_auth) return _auth;
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret) {
    throw new Error(
      "NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET must be set. See .env.example.",
    );
  }
  _auth = createNeonAuth({ baseUrl, cookies: { secret } });
  return _auth;
}

export function isNeonAuthConfigured(): boolean {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
  );
}
