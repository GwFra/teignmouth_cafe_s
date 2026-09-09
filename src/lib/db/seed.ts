/**
 * Illustrative seed data for local development.
 *
 * The cafe names below are placeholders to demonstrate the map and list views —
 * replace them with real Teignmouth cafes (and real scores!) via the admin
 * dashboard once you're up and running.
 *
 * Run with:  npm run db:seed   (needs DATABASE_URL in the environment)
 */
import { db } from "./index";
import { cafes, reviews } from "./schema";

const SAMPLE_CAFES = [
  {
    name: "The Pier Kiosk",
    address: "Teignmouth Pier, Den Promenade",
    lat: 50.5474,
    lng: -3.4931,
  },
  {
    name: "Den Coffee House",
    address: "Den Crescent, Teignmouth",
    lat: 50.5459,
    lng: -3.4948,
  },
  {
    name: "Back Beach Roasters",
    address: "Teign Street, Teignmouth",
    lat: 50.5495,
    lng: -3.5006,
  },
  {
    name: "Triangle Espresso Bar",
    address: "The Triangle, Teignmouth",
    lat: 50.5468,
    lng: -3.4979,
  },
];

const SAMPLE_REVIEWS: Array<{
  cafe: string;
  type: "machine" | "barista";
  worthIt: "yes" | "no";
  rating: string;
  cost: string;
  notes: string;
}> = [
  { cafe: "The Pier Kiosk", type: "machine", worthIt: "no", rating: "2.5", cost: "3.20", notes: "Convenient by the sea but a bit bitter." },
  { cafe: "Den Coffee House", type: "barista", worthIt: "yes", rating: "4.5", cost: "3.40", notes: "Silky microfoam, well balanced." },
  { cafe: "Back Beach Roasters", type: "barista", worthIt: "yes", rating: "5.0", cost: "3.60", notes: "Best in town — house-roasted beans." },
  { cafe: "Triangle Espresso Bar", type: "barista", worthIt: "yes", rating: "4.0", cost: "3.30", notes: "Solid, consistent flat white." },
  { cafe: "Den Coffee House", type: "barista", worthIt: "no", rating: "3.0", cost: "3.80", notes: "Off day — a touch pricey for what it was." },
];

async function main() {
  console.log("Seeding sample cafes…");
  for (const c of SAMPLE_CAFES) {
    await db.insert(cafes).values(c).onConflictDoNothing({ target: cafes.name });
  }

  const all = await db.select().from(cafes);
  const byName = new Map(all.map((c) => [c.name, c.id]));

  console.log("Seeding sample reviews…");
  for (const r of SAMPLE_REVIEWS) {
    const cafeId = byName.get(r.cafe);
    if (!cafeId) continue;
    await db.insert(reviews).values({
      cafeId,
      type: r.type,
      worthIt: r.worthIt,
      rating: r.rating,
      cost: r.cost,
      notes: r.notes,
    });
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
