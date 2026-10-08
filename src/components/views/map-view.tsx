"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  GoogleMap,
  useGoogleMap,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
  type Renderer,
} from "@googlemaps/markerclusterer";
import { X } from "lucide-react";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCost, formatRating, formatWorthIt } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_MAP_ID,
  TEIGNMOUTH,
} from "@/lib/maps-config";
import type { CafeWithStats } from "@/lib/types";

const containerStyle = { width: "100%", height: "100%" };

// Initial zoom over Teignmouth, and the level the map jumps to when a marker
// is selected.
const DEFAULT_ZOOM = 16;
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
          zoom={DEFAULT_ZOOM}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          options={{
            mapId: GOOGLE_MAPS_MAP_ID,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }}
        >
          <MarkerClusterLayer>
            {located.map((cafe) => (
              <AdvancedMarker
                key={cafe.id}
                title={cafe.name}
                position={{ lat: cafe.lat as number, lng: cafe.lng as number }}
                onClick={() => selectCafe(cafe)}
              >
                <CostPin cafe={cafe} />
              </AdvancedMarker>
            ))}
          </MarkerClusterLayer>
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

type ClusterRegistry = {
  add: (marker: google.maps.marker.AdvancedMarkerElement) => void;
  remove: (marker: google.maps.marker.AdvancedMarkerElement) => void;
};

const ClusterContext = createContext<ClusterRegistry | null>(null);

// Clustering stops above this zoom. The library default (16) is below
// SELECTED_ZOOM, which would let neighbouring pins overlap once a cafe is
// selected; by 20, 60px is under 10m on the ground, so only cafes that are
// practically next door stay grouped.
const CLUSTER_MAX_ZOOM = 20;

// Groups markers that would overlap into a single "N cafes" pin; clicking
// one centres on it and zooms in a level. Markers inside register themselves via
// ClusterContext rather than attaching to the map directly.
function MarkerClusterLayer({ children }: { children: React.ReactNode }) {
  const map = useGoogleMap();
  const [registry, setRegistry] = useState<ClusterRegistry | null>(null);

  useEffect(() => {
    if (!map) return;
    const clusterer = new MarkerClusterer({
      map,
      algorithm: new SuperClusterAlgorithm({
        maxZoom: CLUSTER_MAX_ZOOM,
        radius: 60,
      }),
      renderer: clusterRenderer,
      // Step in one level at a time rather than the library default of
      // jumping straight to fit the cluster's bounds.
      onClusterClick: (_event, cluster, clusterMap) => {
        clusterMap.panTo(cluster.position);
        clusterMap.setZoom((clusterMap.getZoom() ?? DEFAULT_ZOOM) + 1);
      },
    });

    // Markers mount in a burst (initial load, filter changes), so batch
    // them into one re-cluster rather than one per marker.
    let renderQueued = false;
    const queueRender = () => {
      if (renderQueued) return;
      renderQueued = true;
      queueMicrotask(() => {
        renderQueued = false;
        clusterer.render();
      });
    };

    setRegistry({
      add: (marker) => {
        clusterer.addMarker(marker, true);
        queueRender();
      },
      remove: (marker) => {
        clusterer.removeMarker(marker, true);
        queueRender();
      },
    });

    return () => {
      clusterer.clearMarkers(true);
      clusterer.setMap(null);
      setRegistry(null);
    };
  }, [map]);

  return (
    <ClusterContext.Provider value={registry}>
      {children}
    </ClusterContext.Provider>
  );
}

// `@react-google-maps/api` has no component for `AdvancedMarkerElement` (the
// replacement for the deprecated `google.maps.Marker`), so this creates one
// imperatively and hands it to the enclosing MarkerClusterLayer, which
// decides whether it's shown on its own or as part of a cluster. `children`
// are portalled into the marker's content element, replacing the default
// red pin.
function AdvancedMarker({
  position,
  title,
  onClick,
  children,
}: {
  position: google.maps.LatLngLiteral;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const registry = useContext(ClusterContext);
  const { lat, lng } = position;
  const [content] = useState(() => document.createElement("div"));
  const [marker, setMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  // Read through a ref so a new onClick each render doesn't re-add the listener.
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  // Created in an effect rather than a useState initialiser: StrictMode
  // calls initialisers twice, and the discarded second marker would take
  // `content` away from the one we keep (a DOM node has only one parent).
  useEffect(() => {
    const created = new google.maps.marker.AdvancedMarkerElement({
      content,
      gmpClickable: true,
    });
    const handleClick = () => onClickRef.current();
    created.addEventListener("gmp-click", handleClick);
    setMarker(created);
    return () => {
      created.removeEventListener("gmp-click", handleClick);
      created.map = null;
      setMarker(null);
    };
  }, [content]);

  // Declared before the registration effect so the marker has a position by
  // the time the clusterer first sees it.
  useEffect(() => {
    if (!marker) return;
    marker.position = { lat, lng };
    marker.title = title;
  }, [marker, lat, lng, title]);

  useEffect(() => {
    if (!registry || !marker) return;
    registry.add(marker);
    return () => registry.remove(marker);
  }, [registry, marker]);

  return createPortal(children, content);
}

// Shared by CostPin (JSX) and the cluster renderer (plain DOM), so a cluster
// reads as the same kind of pin as a single cafe. `body` reshapes a Badge
// into a pill.
const pinStyles = {
  wrapper: "flex flex-col items-center drop-shadow-md",
  body: "whitespace-nowrap rounded-full px-2",
  tail: "h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent",
};

// Each tail colour must match its Badge variant's background.
const pinTones = {
  worthIt: { variant: "success", tail: "border-t-emerald-600" },
  notWorthIt: { variant: "destructive", tail: "border-t-destructive" },
  noReviews: { variant: "muted", tail: "border-t-muted-foreground" },
} as const;

// Price-tag style pin showing the cafe's average flat white cost, coloured by
// whether reviewers thought it was worth it. The tail's tip sits on the
// cafe's location, since advanced markers anchor at their bottom centre.
function CostPin({ cafe }: { cafe: CafeWithStats }) {
  const tone =
    cafe.worthIt === null
      ? pinTones.noReviews
      : cafe.worthIt === "yes"
        ? pinTones.worthIt
        : pinTones.notWorthIt;

  return (
    <div className={pinStyles.wrapper}>
      <Badge variant={tone.variant} className={pinStyles.body}>
        {formatCost(cafe.avgCost)}
      </Badge>
      <span className={cn(pinStyles.tail, tone.tail)} />
    </div>
  );
}

// Cluster pins are created by MarkerClusterer outside React, so they're built
// as plain DOM. They sit above single-cafe pins so a cluster is never hidden
// behind one.
const clusterRenderer: Renderer = {
  render({ count, position }) {
    const content = document.createElement("div");
    content.className = pinStyles.wrapper;

    const body = document.createElement("span");
    body.className = cn(
      badgeVariants(),
      pinStyles.body,
      "bg-black text-white",
    );
    body.textContent = `${count} cafes`;

    const tail = document.createElement("span");
    tail.className = cn(pinStyles.tail, "border-t-black");

    content.append(body, tail);

    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content,
      title: `${count} cafes, click to zoom in`,
      zIndex: 1000 + count,
    });
  },
};

function CafeDetailCard({
  cafe,
  onClose,
}: {
  cafe: CafeWithStats;
  onClose: () => void;
}) {
  return (
    <Card className="relative shadow-lg">
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

      <CardHeader className="space-y-1 p-4 pb-3 pr-12">
        <CardTitle className="text-base leading-tight">{cafe.name}</CardTitle>
        {cafe.address && <CardDescription>{cafe.address}</CardDescription>}
      </CardHeader>

      <CardContent className="p-4 pt-0">

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
                {cafe.worthIt === null ? "—" : formatWorthIt(cafe.worthIt)}
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
