/** Shapes shared between server queries, API responses and client views. */

export type ReviewType = "machine" | "barista";
export type WorthIt = "yes" | "no";

/** A review flattened together with its cafe, as the views consume it. */
export interface ReviewRow {
  id: string;
  cafeId: string;
  cafeName: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  type: ReviewType;
  worthIt: WorthIt;
  rating: string;
  cost: string;
  notes: string | null;
  createdAt: string;
}

/** A cafe with aggregated stats, used to place and summarise map markers. */
export interface CafeWithStats {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  reviewCount: number;
  avgRating: number | null;
  avgCost: number | null;
  // Majority verdict: "yes" if at least half the reviews say so; null when
  // there are no reviews.
  worthIt: WorthIt | null;
}

export interface CafeOption {
  id: string;
  name: string;
}
