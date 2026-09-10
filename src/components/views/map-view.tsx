"use client";

import { useMemo, useState } from "react";
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from "@react-google-maps/api";

import { Card, CardContent } from "@/components/ui/card";
import { formatCost, formatRating } from "@/lib/format";
import { GOOGLE_MAPS_LIBRARIES, TEIGNMOUTH } from "@/lib/maps-config";
import type { CafeWithStats } from "@/lib/types";

const containerStyle = { width: "100%", height: "70vh", minHeight: "420px" };

export function MapView({ cafes }: { cafes: CafeWithStats[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [active, setActive] = useState<string | null>(null);

  const located = useMemo(
    () => cafes.filter((c) => c.lat !== null && c.lng !== null),
    [cafes],
  );

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  if (!apiKey) {
    return (
      <MapNotice>
        Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your environment to
        enable the map. The list view works without it.
      </MapNotice>
    );
  }

  if (loadError) {
    return <MapNotice>Could not load Google Maps. Check the API key.</MapNotice>;
  }

  if (!isLoaded) {
    return <MapNotice>Loading map…</MapNotice>;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={TEIGNMOUTH}
          zoom={15}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >
          {located.map((cafe) => (
            <MarkerF
              key={cafe.id}
              position={{ lat: cafe.lat as number, lng: cafe.lng as number }}
              onClick={() => setActive(cafe.id)}
            >
              {active === cafe.id && (
                <InfoWindowF onCloseClick={() => setActive(null)}>
                  <div className="min-w-[180px] space-y-1 text-sm text-neutral-900">
                    <p className="font-semibold">{cafe.name}</p>
                    {cafe.address && (
                      <p className="text-xs text-neutral-600">{cafe.address}</p>
                    )}
                    {cafe.reviewCount > 0 ? (
                      <ul className="text-xs">
                        <li>Avg rating: {formatRating(cafe.avgRating)}</li>
                        <li>Avg cost: {formatCost(cafe.avgCost)}</li>
                        <li>
                          Worth it:{" "}
                          {cafe.worthItRate === null
                            ? "—"
                            : `${Math.round(cafe.worthItRate * 100)}%`}
                        </li>
                        <li>
                          {cafe.reviewCount} review
                          {cafe.reviewCount === 1 ? "" : "s"}
                        </li>
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-600">No reviews yet.</p>
                    )}
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          ))}
        </GoogleMap>
      </div>

      {located.length < cafes.length && (
        <p className="text-xs text-muted-foreground">
          {cafes.length - located.length} cafe(s) have no location set and are
          not shown on the map. Add coordinates in the admin dashboard.
        </p>
      )}
    </div>
  );
}

function MapNotice({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex min-h-[420px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <p className="max-w-md">{children}</p>
      </CardContent>
    </Card>
  );
}
