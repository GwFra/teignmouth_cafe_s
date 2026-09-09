import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { AuthError, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cafes } from "@/lib/db/schema";
import { parseCafeInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Admin: update a cafe (name / address / coordinates).
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = parseCafeInput(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const [row] = await db
      .update(cafes)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(cafes.id, id))
      .returning();
    if (!row) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && /unique|duplicate/i.test(err.message)) {
      return NextResponse.json(
        { error: "A cafe with that name already exists." },
        { status: 409 },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Admin: delete a cafe (cascades to its reviews).
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const [row] = await db
      .delete(cafes)
      .where(eq(cafes.id, id))
      .returning({ id: cafes.id });
    if (!row) {
      return NextResponse.json({ error: "Cafe not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
