import { cookies } from "next/headers";

import {
  DEV_LOGIN_COOKIE,
  getDevLoginUser,
  isDevLoginEnabled,
} from "@/lib/dev-login";
import { getNeonAuth, isNeonAuthConfigured } from "@/lib/neon-auth";

/**
 * Admins are users given the `admin` role in Neon Auth (Console → Auth →
 * Users → Make admin, or `neon neon-auth user set-role`). Better Auth stores
 * multiple roles as a comma-separated string.
 */
function hasAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role
    .split(",")
    .map((r) => r.trim())
    .includes("admin");
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface AuthContext {
  user: AuthUser;
  isAdmin: boolean;
  /** Signed in via the local-only dev login rather than Neon Auth. */
  isDevSession: boolean;
}

/**
 * Local-only: the dev login cookie just names a role. It's only honoured
 * under `next dev` with DEV_LOGIN="true" (see lib/dev-login).
 */
function getDevAuth(
  store: Awaited<ReturnType<typeof cookies>>,
): AuthContext | null {
  if (!isDevLoginEnabled()) return null;
  const role = store.get(DEV_LOGIN_COOKIE)?.value;
  if (role !== "admin" && role !== "viewer") return null;

  const devUser = getDevLoginUser(role);
  return {
    user: {
      id: `dev-${role}`,
      email: devUser.email,
      name: devUser.name,
      image: null,
    },
    isAdmin: role === "admin",
    isDevSession: true,
  };
}

/**
 * Resolve the current request's auth context from the Neon Auth session, or
 * null when signed out. Session data is cached in a cookie for up to 5
 * minutes, so a role change can take that long to apply.
 */
export async function getAuth(): Promise<AuthContext | null> {
  // Reading cookies first also opts callers (e.g. the root layout) into
  // dynamic rendering, so nothing tries to reach Neon Auth at build time.
  const store = await cookies();
  const dev = getDevAuth(store);
  if (dev) return dev;

  // Docker-only local dev can run without Neon Auth when dev login is on.
  if (isDevLoginEnabled() && !isNeonAuthConfigured()) return null;

  const { data, error } = await getNeonAuth().getSession();
  if (error) {
    console.error("Neon Auth getSession failed", error);
    return null;
  }
  const user = data?.user;
  if (!user) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name || null,
      image: user.image ?? null,
    },
    isAdmin: hasAdminRole(user.role),
    isDevSession: false,
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
