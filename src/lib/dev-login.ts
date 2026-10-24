/**
 * Local-only sign-in that skips Google OAuth, for working against a local
 * database without OAuth credentials (or without a second Google account to
 * see the read-only view).
 *
 * Needs both `next dev` and DEV_LOGIN="true"; production builds inline
 * NODE_ENV as "production", so it can't be switched on in a deployment even
 * if DEV_LOGIN is set there by mistake.
 */
export type DevLoginRole = "admin" | "viewer";

export function isDevLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" && process.env.DEV_LOGIN === "true"
  );
}

/**
 * Who to sign in as. The admin is the first ADMIN_EMAILS entry, so admin
 * checks work unchanged; null if ADMIN_EMAILS is empty.
 */
export function getDevLoginUser(
  role: DevLoginRole,
): { email: string; name: string } | null {
  if (role === "viewer") {
    return { email: "viewer@dev.localhost", name: "Dev viewer" };
  }
  const email = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .find(Boolean);
  return email ? { email, name: "Dev admin" } : null;
}
