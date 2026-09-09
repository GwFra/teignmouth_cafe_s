/**
 * Lightweight hand-rolled validation for the API routes. Kept dependency-free
 * on purpose; swap for zod later if the shapes grow.
 */

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const REVIEW_TYPES = ["machine", "barista"] as const;
const WORTH_IT = ["yes", "no"] as const;

export interface ReviewInput {
  cafeId: string | null;
  cafeName: string | null;
  type: (typeof REVIEW_TYPES)[number];
  worthIt: (typeof WORTH_IT)[number];
  rating: string; // "0".."5"
  cost: string; // e.g. "3.40"
  notes: string | null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseReviewInput(body: unknown): Result<ReviewInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object." };
  }
  const b = body as Record<string, unknown>;

  const cafeId = asString(b.cafeId) || null;
  const cafeName = asString(b.cafeName) || null;
  if (!cafeId && !cafeName) {
    return { ok: false, error: "Provide either cafeId or cafeName." };
  }

  const type = asString(b.type);
  if (!REVIEW_TYPES.includes(type as never)) {
    return { ok: false, error: "type must be 'machine' or 'barista'." };
  }

  const worthIt = asString(b.worthIt);
  if (!WORTH_IT.includes(worthIt as never)) {
    return { ok: false, error: "worthIt must be 'yes' or 'no'." };
  }

  const ratingNum = Number(asString(b.rating));
  if (Number.isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
    return { ok: false, error: "rating must be a number between 0 and 5." };
  }

  // Accept a leading £ from the client and strip it before storing.
  const costRaw = asString(b.cost).replace(/^£/, "");
  const costNum = Number(costRaw);
  if (Number.isNaN(costNum) || costNum < 0) {
    return { ok: false, error: "cost must be a non-negative number." };
  }

  return {
    ok: true,
    data: {
      cafeId,
      cafeName,
      type: type as ReviewInput["type"],
      worthIt: worthIt as ReviewInput["worthIt"],
      rating: ratingNum.toFixed(1),
      cost: costNum.toFixed(2),
      notes: asString(b.notes) || null,
    },
  };
}

export interface CafeInput {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export function parseCafeInput(body: unknown): Result<CafeInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object." };
  }
  const b = body as Record<string, unknown>;

  const name = asString(b.name);
  if (!name) {
    return { ok: false, error: "name is required." };
  }

  const latRaw = b.lat;
  const lngRaw = b.lng;
  const lat =
    latRaw === null || latRaw === undefined || latRaw === ""
      ? null
      : Number(latRaw);
  const lng =
    lngRaw === null || lngRaw === undefined || lngRaw === ""
      ? null
      : Number(lngRaw);

  if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
    return { ok: false, error: "lat must be between -90 and 90." };
  }
  if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
    return { ok: false, error: "lng must be between -180 and 180." };
  }

  return {
    ok: true,
    data: {
      name,
      address: asString(b.address) || null,
      lat,
      lng,
    },
  };
}
