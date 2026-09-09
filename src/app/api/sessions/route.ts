import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { AuthError, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// Admin: list all sessions so they can be revoked remotely.
export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: sessions.id,
        email: users.email,
        name: users.name,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        lastSeenAt: sessions.lastSeenAt,
        expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .orderBy(desc(sessions.lastSeenAt));

    return NextResponse.json(rows);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
