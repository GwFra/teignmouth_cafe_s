"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCost, formatRating } from "@/lib/format";
import { GOOGLE_MAPS_LIBRARIES, TEIGNMOUTH } from "@/lib/maps-config";
import type { CafeWithStats } from "@/lib/types";

const containerStyle = { width: "100%", height: "100%" };

// Zoom level the map jumps to when a marker is selected.
const SELECTED_ZOOM = 17;

export function MapView({ cafes }: { cafes: CafeWithStats[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [active, setActive] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const located = useMemo(
    () => cafes.filter((c) => c.lat !== null && c.lng !== null),
    [cafes],
  );

  const selectedCafe = useMemo(
    () => located.find((c) => c.id === active) ?? null,
    [located, active],
  );

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  function selectCafe(cafe: CafeWithStats) {
    setActive(cafe.id);
    const map = mapRef.current;
    if (map && cafe.lat !== null && cafe.lng !== null) {
      map.panTo({ lat: cafe.lat, lng: cafe.lng });
      map.setZoom(SELECTED_ZOOM);
    }
  }

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
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="relative min-h-[200px] flex-1 overflow-hidden rounded-lg border">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={TEIGNMOUTH}
          zoom={15}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
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
              onClick={() => selectCafe(cafe)}
            />
          ))}
        </GoogleMap>

        {selectedCafe && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 md:inset-y-0 md:left-auto md:right-0 md:flex md:items-start md:p-4">
            <div className="pointer-events-auto w-full md:w-80">
              <CafeDetailCard
                cafe={selectedCafe}
                onClose={() => setActive(null)}
              />
            </div>
          </div>
        )}
      </div>

      {cafes.length === 0 ? (
        <p className="shrink-0 text-xs text-muted-foreground">
          No cafes match these filters.
        </p>
      ) : (
        located.length < cafes.length && (
          <p className="shrink-0 text-xs text-muted-foreground">
            {cafes.length - located.length} cafe(s) have no location set and
            are not shown on the map. Add coordinates in the admin dashboard.
          </p>
        )
      )}
    </div>
  );
}

function CafeDetailCard({
  cafe,
  onClose,
}: {
  cafe: CafeWithStats;
  onClose: () => void;
}) {
  return (
    <Card className="shadow-lg">
      <CardContent className="relative space-y-3 p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close cafe details</span>
        </Button>

        <div className="space-y-1 pr-8">
          <h3 className="text-base font-semibold leading-tight">
            {cafe.name}
          </h3>
          {cafe.address && (
            <p className="text-sm text-muted-foreground">{cafe.address}</p>
          )}
        </div>

        {cafe.reviewCount > 0 ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Avg rating</dt>
              <dd className="font-medium">{formatRating(cafe.avgRating)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Avg cost</dt>
              <dd className="font-medium">{formatCost(cafe.avgCost)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Worth it</dt>
              <dd className="font-medium">
                {cafe.worthItRate === null
                  ? "—"
                  : `${Math.round(cafe.worthItRate * 100)}%`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reviews</dt>
              <dd className="font-medium">
                {cafe.reviewCount} review{cafe.reviewCount === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MapNotice({ children }: { children: React.ReactNode }) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full min-h-[200px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <p className="max-w-md">{children}</p>
      </CardContent>
    </Card>
  );
}
