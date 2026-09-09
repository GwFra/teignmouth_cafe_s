import { NextResponse } from "next/server";

import { buildAuthUrl } from "@/lib/google";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "tfw_oauth_state";

export async function GET() {
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
