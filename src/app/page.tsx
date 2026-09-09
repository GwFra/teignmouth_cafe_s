import { getCafesWithStats, getReviews } from "@/lib/queries";
import { ReviewsExplorer } from "@/components/views/reviews-explorer";

// Always read fresh data — reviews change via the admin dashboard.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [reviews, cafes] = await Promise.all([
    getReviews(),
    getCafesWithStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Flat whites of Teignmouth
        </h1>
        <p className="text-muted-foreground">
          Every flat white scored on rating, cost and whether it was worth it.
        </p>
      </div>

      <ReviewsExplorer reviews={reviews} cafes={cafes} />
    </div>
  );
}
