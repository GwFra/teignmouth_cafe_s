import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { AuthError, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cafes, reviews } from "@/lib/db/schema";
import { getReviews } from "@/lib/queries";
import { parseReviewInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Public: list all reviews joined to their cafe.
export async function GET() {
  return NextResponse.json(await getReviews());
}

// Admin: create a review, creating the cafe on the fly if needed.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const parsed = parseReviewInput(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const input = parsed.data;

    let cafeId = input.cafeId;
    if (!cafeId && input.cafeName) {
      // Reuse an existing cafe with a case-insensitive name match, else create.
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
            .values({ name: input.cafeName })
            .returning({ id: cafes.id })
        )[0].id;
    }

    if (!cafeId) {
      return NextResponse.json({ error: "No cafe resolved." }, { status: 400 });
    }

    const [row] = await db
      .insert(reviews)
      .values({
        cafeId,
        type: input.type,
        worthIt: input.worthIt,
        rating: input.rating,
        cost: input.cost,
        notes: input.notes,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
