"use client";

import { useState } from "react";
import { List, Map as MapIcon } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListView } from "@/components/views/list-view";
import { MapView } from "@/components/views/map-view";
import type { CafeWithStats, ReviewRow } from "@/lib/types";

interface Props {
  reviews: ReviewRow[];
  cafes: CafeWithStats[];
}

/**
 * Top-level explorer that lets the visitor switch between the Google Maps view
 * and the filterable list view over the same review data.
 */
export function ReviewsExplorer({ reviews, cafes }: Props) {
  const [tab, setTab] = useState("map");

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="map">
          <MapIcon className="h-4 w-4" />
          Map
        </TabsTrigger>
        <TabsTrigger value="list">
          <List className="h-4 w-4" />
          List
        </TabsTrigger>
      </TabsList>

      <TabsContent value="map">
        <MapView cafes={cafes} />
      </TabsContent>

      <TabsContent value="list">
        <ListView reviews={reviews} />
      </TabsContent>
    </Tabs>
  );
}
