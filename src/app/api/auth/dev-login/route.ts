import { NextRequest, NextResponse } from "next/server";

import {
  DEV_LOGIN_COOKIE,
  isDevLoginEnabled,
  type DevLoginRole,
} from "@/lib/dev-login";

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

  const dest = role === "admin" ? "/admin" : "/";
  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.set(DEV_LOGIN_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}

/** DELETE /api/auth/dev-login — signs out of a dev login session. */
export async function DELETE() {
  if (!isDevLoginEnabled()) {
    return new NextResponse(null, { status: 404 });
  }
  const res = new NextResponse(null, { status: 204 });
  res.cookies.delete(DEV_LOGIN_COOKIE);
  return res;
}
