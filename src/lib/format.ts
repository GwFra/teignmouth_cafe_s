/**
 * Formatting helpers shared between the list, map and admin views.
 */

/** Render a numeric cost (stored as a string like "3.40") as "£3.40". */
export function formatCost(cost: string | number | null | undefined): string {
  if (cost === null || cost === undefined || cost === "") return "—";
  const n = typeof cost === "number" ? cost : Number(cost);
  if (Number.isNaN(n)) return "—";
  return `£${n.toFixed(2)}`;
}

/** Render a rating (stored as a string like "4.5") as "4.5 / 5". */
export function formatRating(rating: string | number | null | undefined): string {
  if (rating === null || rating === undefined || rating === "") return "—";
  const n = typeof rating === "number" ? rating : Number(rating);
  if (Number.isNaN(n)) return "—";
  return `${n.toFixed(1)} / 5`;
}

/** Title-case a review type for display. */
export function formatType(type: "machine" | "barista"): string {
  return type === "barista" ? "Barista" : "Machine";
}

export function formatWorthIt(worthIt: "yes" | "no"): string {
  return worthIt === "yes" ? "Worth it" : "Not worth it";
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
