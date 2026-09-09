import { cookies, headers } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";

import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";

export const SESSION_COOKIE = "tfw_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. See .env.example.");
  }
  return new TextEncoder().encode(secret);
}

interface SessionClaims {
  /** Session id — the primary key of the row in the `sessions` table. */
  sid: string;
  /** User id — convenience only; the DB row is the source of truth. */
  uid: string;
}

/** Sign a session JWT that references a server-side session row. */
export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(getSecret());
}

async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sid === "string" && typeof payload.uid === "string") {
      return { sid: payload.sid, uid: payload.uid };
    }
    return null;
  } catch {
    return null;
  }
}

/** Comma-separated allowlist of emails permitted to edit data. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

/**
 * Create a server-side session row and return the value to place in the JWT.
 * The token is signed by the caller so this stays free of cookie concerns.
 */
export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const hdrs = await headers();
  const [row] = await db
    .insert(sessions)
    .values({
      userId,
      userAgent: hdrs.get("user-agent")?.slice(0, 500) ?? null,
      expiresAt,
    })
    .returning({ id: sessions.id });

  const token = await signSessionToken({ sid: row.id, uid: userId });
  return { token, expiresAt };
}

export interface AuthContext {
  user: User;
  sessionId: string;
  isAdmin: boolean;
}

/**
 * Resolve the current request's auth context. Returns null when there is no
 * valid, non-revoked, unexpired session. Because we re-check the DB on every
 * request, revoking a session row (or setting `revokedAt`) logs the user out
 * everywhere immediately, even though their JWT still verifies.
 */
export async function getAuth(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, claims.sid),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Best-effort "last seen" bump; ignore failures so reads never break auth.
  void db
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, claims.sid))
    .catch(() => undefined);

  return {
    user: row.user,
    sessionId: row.session.id,
    isAdmin: isAdminEmail(row.user.email),
  };
}

/** Convenience for API routes: return the context or throw a 401/403 marker. */
export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Unauthorized" : "Forbidden");
  }
}

export async function requireAdmin(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) throw new AuthError(401);
  if (!auth.isAdmin) throw new AuthError(403);
  return auth;
}

/** Revoke a single session (used by the admin dashboard and logout). */
export async function revokeSession(sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}
