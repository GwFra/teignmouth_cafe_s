import { useEffect, useState } from "react";

export type UserLocation = { lat: number; lng: number };

/**
 * The visitor's live position from the browser's Geolocation API. The first
 * call triggers the browser's permission prompt; until the visitor allows it
 * (or if they refuse, or the browser has no geolocation) this is null.
 * Positions keep updating while the component using it is mounted.
 */
export function useUserLocation(): UserLocation | null {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setLocation({ lat: coords.latitude, lng: coords.longitude }),
      (error) => {
        // Permission can be revoked mid-session; drop the dot if so. Timeouts
        // and "position unavailable" are transient, so the last fix is kept.
        if (error.code === error.PERMISSION_DENIED) setLocation(null);
      },
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return location;
}
