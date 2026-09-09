import { NextRequest, NextResponse } from "next/server";

import { createSession, SESSION_COOKIE, isAdminEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getAppUrl, getGoogleProfile } from "@/lib/google";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "tfw_oauth_state";

function redirectWithError(reason: string) {
  const url = new URL("/", getAppUrl());
  url.searchParams.set("auth_error", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get(STATE_COOKIE)?.value;

  if (searchParams.get("error")) {
    return redirectWithError("google_denied");
  }
  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithError("invalid_state");
  }

  let profile;
  try {
    profile = await getGoogleProfile(code);
  } catch {
    return redirectWithError("exchange_failed");
  }

  if (!profile.email || !profile.email_verified) {
    return redirectWithError("email_unverified");
  }

  // Upsert the user record on every sign-in so name/avatar stay current.
  const [user] = await db
    .insert(users)
    .values({
      email: profile.email.toLowerCase(),
      name: profile.name ?? null,
      image: profile.picture ?? null,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: profile.name ?? null, image: profile.picture ?? null },
    })
    .returning();

  const { token, expiresAt } = await createSession(user.id);

  // Admins land on the dashboard; read-only visitors on the public views.
  const dest = isAdminEmail(user.email) ? "/admin" : "/";
  const res = NextResponse.redirect(new URL(dest, getAppUrl()));

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  res.cookies.delete(STATE_COOKIE);

  return res;
}
