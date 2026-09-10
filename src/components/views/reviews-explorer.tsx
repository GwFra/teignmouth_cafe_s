"use client";

import { useMemo, useState } from "react";
import { List, Map as MapIcon } from "lucide-react";

import { ReviewFilterBar } from "@/components/views/review-filter-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListView } from "@/components/views/list-view";
import { MapView } from "@/components/views/map-view";
import {
  DEFAULT_REVIEW_FILTERS,
  filterReviews,
  hasActiveReviewOnlyFilters,
  matchesSearch,
  type ReviewFilterState,
} from "@/lib/review-filters";
import type { CafeWithStats, ReviewRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  reviews: ReviewRow[];
  cafes: CafeWithStats[];
  className?: string;
}

/**
 * Top-level explorer that lets the visitor switch between the Google Maps view
 * and the filterable list view over the same review data, with one shared
 * filter bar narrowing both.
 */
export function ReviewsExplorer({ reviews, cafes, className }: Props) {
  const [tab, setTab] = useState("map");
  const [filters, setFilters] = useState<ReviewFilterState>(
    DEFAULT_REVIEW_FILTERS,
  );

  const filteredReviews = useMemo(
    () => filterReviews(reviews, filters),
    [reviews, filters],
  );

  // Stats (rating/cost/worth-it/count) recomputed from the filtered reviews,
  // so a cafe's numbers on the map always match what's driving its inclusion
  // — e.g. filtering to 5-star reviews shouldn't leave a cafe's average
  // rating showing a lower number pulled in by a review that got filtered out.
  const statsByCafeId = useMemo(() => {
    const map = new Map<
      string,
      {
        reviewCount: number;
        ratingSum: number;
        costSum: number;
        worthItYes: number;
      }
    >();
    for (const r of filteredReviews) {
      const entry = map.get(r.cafeId) ?? {
        reviewCount: 0,
        ratingSum: 0,
        costSum: 0,
        worthItYes: 0,
      };
      entry.reviewCount += 1;
      entry.ratingSum += Number(r.rating);
      entry.costSum += Number(r.cost);
      if (r.worthIt === "yes") entry.worthItYes += 1;
      map.set(r.cafeId, entry);
    }
    return map;
  }, [filteredReviews]);

  const filteredCafes = useMemo(() => {
    const reviewOnlyFilterActive = hasActiveReviewOnlyFilters(filters);

    return cafes.flatMap((cafe): CafeWithStats[] => {
      const stats = statsByCafeId.get(cafe.id);
      if (stats) {
        return [
          {
            ...cafe,
            reviewCount: stats.reviewCount,
            avgRating: stats.ratingSum / stats.reviewCount,
            avgCost: stats.costSum / stats.reviewCount,
            worthItRate: stats.worthItYes / stats.reviewCount,
          },
        ];
      }
      // An unreviewed cafe can never match a type/worth-it/rating/cost
      // filter, but should still respect a plain name search.
      if (cafe.reviewCount === 0 && !reviewOnlyFilterActive) {
        return matchesSearch(cafe.name, filters) ? [cafe] : [];
      }
      return [];
    });
  }, [cafes, statsByCafeId, filters]);

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className={cn("flex flex-col gap-4", className)}
    >
      <TabsList className="flex flex-row justify-start w-fit">
        <TabsTrigger value="map">
          <MapIcon className="h-4 w-4" />
          Map
        </TabsTrigger>
        <TabsTrigger value="list">
          <List className="h-4 w-4" />
          List
        </TabsTrigger>
      </TabsList>

      <div className="shrink-0">
        <ReviewFilterBar value={filters} onChange={setFilters} />
      </div>

      <TabsContent value="map" className="min-h-0 flex-1">
        <MapView cafes={filteredCafes} />
      </TabsContent>

      <TabsContent value="list" className="min-h-0 flex-1 overflow-y-auto">
        <ListView reviews={filteredReviews} totalCount={reviews.length} />
      </TabsContent>
    </Tabs>
  );
}
