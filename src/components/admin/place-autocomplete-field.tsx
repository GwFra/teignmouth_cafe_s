"use client";

import { useEffect, useRef } from "react";

export interface PlaceSelection {
  name: string | null;
  address: string | null;
  lat: number;
  lng: number;
}

interface Props {
  id?: string;
  placeholder?: string;
  bounds: google.maps.LatLngBoundsLiteral;
  onPlaceSelected: (place: PlaceSelection) => void;
}

// `@react-google-maps/api` only wraps the legacy `google.maps.places.Autocomplete`
// widget, which Google blocks for Places-API-(New) projects created after
// March 2025 in favour of the `PlaceAutocompleteElement` web component. That
// component isn't wrapped by any React library yet, so it's built up
// imperatively here: import the "places" library, construct the element, and
// mount it into a plain container div.
export function PlaceAutocompleteField({
  id,
  placeholder,
  bounds,
  onPlaceSelected,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    async function init() {
      try {
        // The installed @types/google.maps version omits
        // PlaceAutocompleteElement from the PlacesLibrary return type, but
        // importing "places" still populates the fully-typed
        // google.maps.places.PlaceAutocompleteElement class used below.
        await google.maps.importLibrary("places");
        if (cancelled || !container) return;

        const element = new google.maps.places.PlaceAutocompleteElement({
          locationBias: bounds,
          types: ["establishment"],
        });
        if (id) element.id = id;
        if (placeholder) element.setAttribute("placeholder", placeholder);
        element.classList.add("w-full");

        element.addEventListener("gmp-select", async (event: Event) => {
          try {
            // The installed @types/google.maps version's gmp-select event
            // only exposes `place`, but the current runtime API instead
            // sends a `placePrediction` that must be converted via
            // `.toPlace()` before fields can be fetched on it.
            const { placePrediction } = event as unknown as {
              placePrediction: { toPlace(): google.maps.places.Place };
            };
            const place = placePrediction.toPlace();
            await place.fetchFields({
              fields: ["displayName", "formattedAddress", "location"],
            });
            if (!place.location) return;
            onPlaceSelectedRef.current({
              name: place.displayName ?? null,
              address: place.formattedAddress ?? null,
              lat: place.location.lat(),
              lng: place.location.lng(),
            });
          } catch (err) {
            console.error(
              "PlaceAutocompleteField: gmp-select handler failed",
              err,
            );
          }
        });

        container.appendChild(element);
      } catch (err) {
        console.error("PlaceAutocompleteField: failed to initialize", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      container?.replaceChildren();
    };
  }, [bounds, id, placeholder]);

  return <div ref={containerRef} />;
}
