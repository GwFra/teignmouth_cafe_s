import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { AuthError, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cafes, reviews } from "@/lib/db/schema";
import { parseReviewInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Admin: update a review.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const parsed = parseReviewInput(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const input = parsed.data;

    let cafeId = input.cafeId;
    if (!cafeId && input.cafeName) {
      const [existing] = await db
        .select({ id: cafes.id })
        .from(cafes)
        .where(sql`lower(${cafes.name}) = lower(${input.cafeName})`)
        .limit(1);
      cafeId =
        existing?.id ??
        (
          await db
            .insert(cafes)
            .values({
              name: input.cafeName,
              address: input.cafeAddress,
              lat: input.cafeLat,
              lng: input.cafeLng,
            })
            .returning({ id: cafes.id })
        )[0].id;
    }

    if (!cafeId) {
      return NextResponse.json({ error: "No cafe resolved." }, { status: 400 });
    }

    const [row] = await db
      .update(reviews)
      .set({
        cafeId,
        type: input.type,
        worthIt: input.worthIt,
        rating: input.rating,
        cost: input.cost,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Admin: delete a review.
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const [row] = await db
      .delete(reviews)
      .where(eq(reviews.id, id))
      .returning({ id: reviews.id });
    if (!row) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
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
