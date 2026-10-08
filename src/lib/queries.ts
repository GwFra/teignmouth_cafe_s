import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { cafes, reviews } from "@/lib/db/schema";
import type {
  CafeOption,
  CafeWithStats,
  ReviewRow,
  WorthIt,
} from "@/lib/types";

/** All reviews, newest first, joined to their cafe for the list & map views. */
export async function getReviews(): Promise<ReviewRow[]> {
  const rows = await db
    .select({
      id: reviews.id,
      cafeId: reviews.cafeId,
      cafeName: cafes.name,
      address: cafes.address,
      lat: cafes.lat,
      lng: cafes.lng,
      type: reviews.type,
      worthIt: reviews.worthIt,
      rating: reviews.rating,
      cost: reviews.cost,
      notes: reviews.notes,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(cafes, eq(reviews.cafeId, cafes.id))
    .orderBy(desc(reviews.createdAt));

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Cafes with aggregated review stats, for map markers and summaries. */
export async function getCafesWithStats(): Promise<CafeWithStats[]> {
  const rows = await db
    .select({
      id: cafes.id,
      name: cafes.name,
      address: cafes.address,
      lat: cafes.lat,
      lng: cafes.lng,
      reviewCount: sql<number>`count(${reviews.id})::int`,
      avgRating: sql<number | null>`avg(${reviews.rating})::float`,
      avgCost: sql<number | null>`avg(${reviews.cost})::float`,
      // Same majority rule as the client-side recompute in ReviewsExplorer.
      worthIt: sql<WorthIt | null>`case
        when count(${reviews.id}) = 0 then null
        when count(*) filter (where ${reviews.worthIt} = 'yes') * 2 >= count(${reviews.id}) then 'yes'
        else 'no'
      end`,
    })
    .from(cafes)
    .leftJoin(reviews, eq(reviews.cafeId, cafes.id))
    .groupBy(cafes.id)
    .orderBy(cafes.name);

  return rows;
}

/** Minimal cafe list for populating the review form dropdown. */
export async function getCafeOptions(): Promise<CafeOption[]> {
  return db
    .select({ id: cafes.id, name: cafes.name })
    .from(cafes)
    .orderBy(cafes.name);
}
