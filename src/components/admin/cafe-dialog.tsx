"use client";

import { useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

import { PlaceAutocompleteField } from "@/components/admin/place-autocomplete-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiSend } from "@/lib/client";
import { GOOGLE_MAPS_LIBRARIES, TEIGNMOUTH_BOUNDS } from "@/lib/maps-config";
import type { CafeWithStats } from "@/lib/types";

interface Props {
  cafe?: CafeWithStats;
  trigger: React.ReactNode;
  onSaved: () => void;
}

export function CafeDialog({ cafe, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(cafe?.name ?? "");
  const [address, setAddress] = useState(cafe?.address ?? "");
  const [lat, setLat] = useState(cafe?.lat != null ? String(cafe.lat) : "");
  const [lng, setLng] = useState(cafe?.lng != null ? String(cafe.lng) : "");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        address: address || null,
        lat: lat === "" ? null : Number(lat),
        lng: lng === "" ? null : Number(lng),
      };
      if (cafe) {
        await apiSend(`/api/cafes/${cafe.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/cafes", "POST", payload);
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cafe ? "Edit cafe" : "Add cafe"}</DialogTitle>
          <DialogDescription>
            Search Google Places to auto-fill the name, address, and
            coordinates below, or enter them by hand. Tip: right-click a
            spot in Google Maps to copy its latitude/longitude.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {mapsLoaded && (
            <div className="space-y-1">
              <Label htmlFor="place-search">Search Google Places (optional)</Label>
              <PlaceAutocompleteField
                id="place-search"
                placeholder="Start typing a cafe name…"
                bounds={TEIGNMOUTH_BOUNDS}
                onPlaceSelected={(place) => {
                  setName(place.name ?? name);
                  setAddress(place.address ?? address);
                  setLat(String(place.lat));
                  setLng(String(place.lng));
                }}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Address (optional)</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Northumberland Place, Teignmouth"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="50.5462"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-3.4966"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : cafe ? "Save changes" : "Add cafe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
