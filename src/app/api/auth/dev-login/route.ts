import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { createSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  getDevLoginUser,
  isDevLoginEnabled,
  type DevLoginRole,
} from "@/lib/dev-login";
import { getAppUrl } from "@/lib/google";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/dev-login?as=admin|viewer — signs in without Google. Only
 * exists under `next dev` with DEV_LOGIN="true" (see lib/dev-login).
 */
export async function GET(req: NextRequest) {
  if (!isDevLoginEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const role: DevLoginRole =
    req.nextUrl.searchParams.get("as") === "viewer" ? "viewer" : "admin";
  const devUser = getDevLoginUser(role);
  if (!devUser) {
    return new NextResponse(
      "Dev admin login signs in as the first ADMIN_EMAILS entry; set ADMIN_EMAILS in .env.local.",
      { status: 400 },
    );
  }

  // Create the user if needed, but don't overwrite an existing (e.g. real
  // Google-backed) user's name or avatar.
  await db
    .insert(users)
    .values({ email: devUser.email, name: devUser.name })
    .onConflictDoNothing({ target: users.email });
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, devUser.email))
    .limit(1);

  const { token, expiresAt } = await createSession(user.id);

  const dest = role === "admin" ? "/admin" : "/";
  const res = NextResponse.redirect(new URL(dest, getAppUrl()));
  setSessionCookie(res, token, expiresAt);
  return res;
}
