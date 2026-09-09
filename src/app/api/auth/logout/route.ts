import { NextResponse } from "next/server";

import { getAuth, revokeSession, SESSION_COOKIE } from "@/lib/auth";
import { getAppUrl } from "@/lib/google";

export const dynamic = "force-dynamic";

async function handle() {
  const auth = await getAuth();
  if (auth) {
    await revokeSession(auth.sessionId);
  }
  const res = NextResponse.redirect(new URL("/", getAppUrl()));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

// Support both a link click (GET) and a fetch/form POST.
export const GET = handle;
export const POST = handle;
