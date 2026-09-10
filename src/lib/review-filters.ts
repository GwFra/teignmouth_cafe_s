/**
 * Filter state shared between the list (table) and map views, so one set of
 * controls narrows both — a review matching the filters keeps its cafe
 * visible on the map, and unreviewed cafes stay visible unless a review-only
 * filter (type/worth it/rating/cost) is active, in which case they can never
 * match and are hidden too.
 */
import type { ReviewRow } from "@/lib/types";

export const ALL = "all";

export interface ReviewFilterState {
  search: string;
  type: string;
  worthIt: string;
  minRating: string;
  maxCost: string;
}

export const DEFAULT_REVIEW_FILTERS: ReviewFilterState = {
  search: "",
  type: ALL,
  worthIt: ALL,
  minRating: ALL,
  maxCost: "",
};

/** Parsed max-cost value, or null if unset/unparseable (i.e. no upper bound). */
function parseMaxCost(maxCost: string): number | null {
  const trimmed = maxCost.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

export function normalizeSearch(search: string): string {
  return search.trim().toLowerCase();
}

export function matchesSearch(name: string, filters: ReviewFilterState): boolean {
  const search = normalizeSearch(filters.search);
  return search === "" || name.toLowerCase().includes(search);
}

/** True if a filter is set that only a review row (not a bare cafe) can match. */
export function hasActiveReviewOnlyFilters(filters: ReviewFilterState): boolean {
  return (
    filters.type !== ALL ||
    filters.worthIt !== ALL ||
    filters.minRating !== ALL ||
    parseMaxCost(filters.maxCost) !== null
  );
}

export function filterReviews(
  reviews: ReviewRow[],
  filters: ReviewFilterState,
): ReviewRow[] {
  const min = filters.minRating === ALL ? 0 : Number(filters.minRating);
  const max = parseMaxCost(filters.maxCost);

  return reviews.filter((r) => {
    if (!matchesSearch(r.cafeName, filters)) return false;
    if (filters.type !== ALL && r.type !== filters.type) return false;
    if (filters.worthIt !== ALL && r.worthIt !== filters.worthIt) return false;
    if (Number(r.rating) < min) return false;
    if (max !== null && Number(r.cost) > max) return false;
    return true;
  });
}
