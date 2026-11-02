/**
 * Local-only sign-in that skips Google OAuth, for working against a local
 * database without OAuth credentials (or without a second Google account to
 * see the read-only view).
 *
 * Needs both `next dev` and DEV_LOGIN="true"; production builds inline
 * NODE_ENV as "production", so it can't be switched on in a deployment even
 * if DEV_LOGIN is set there by mistake.
 *
 * The session is just a cookie naming the role; it isn't signed because it's
 * only ever honoured on a local dev server.
 */
export type DevLoginRole = "admin" | "viewer";

export const DEV_LOGIN_COOKIE = "tfw_dev_login";

export function isDevLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" && process.env.DEV_LOGIN === "true"
  );
}

/** Who to sign in as; the dev admin gets the admin role directly. */
export function getDevLoginUser(role: DevLoginRole): {
  email: string;
  name: string;
} {
  return role === "admin"
    ? { email: "admin@dev.localhost", name: "Dev admin" }
    : { email: "viewer@dev.localhost", name: "Dev viewer" };
}
