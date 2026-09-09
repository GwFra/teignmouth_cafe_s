import { NextRequest, NextResponse } from "next/server";

import { AuthError, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cafes } from "@/lib/db/schema";
import { getCafesWithStats } from "@/lib/queries";
import { parseCafeInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Public: list cafes with aggregated stats (used by map + admin).
export async function GET() {
  return NextResponse.json(await getCafesWithStats());
}

// Admin: create a cafe.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = parseCafeInput(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const [row] = await db
      .insert(cafes)
      .values(parsed.data)
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Unique-name violation surfaces here.
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
