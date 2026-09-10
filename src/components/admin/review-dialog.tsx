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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiSend } from "@/lib/client";
import { GOOGLE_MAPS_LIBRARIES, TEIGNMOUTH_BOUNDS } from "@/lib/maps-config";
import type { CafeOption, ReviewRow } from "@/lib/types";

const NEW_CAFE = "__new__";

interface Props {
  cafes: CafeOption[];
  review?: ReviewRow;
  trigger: React.ReactNode;
  onSaved: () => void;
}

export function ReviewDialog({ cafes, review, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cafeId, setCafeId] = useState<string>(review?.cafeId ?? NEW_CAFE);
  const [cafeName, setCafeName] = useState<string>("");
  const [cafeAddress, setCafeAddress] = useState<string>("");
  const [cafeLat, setCafeLat] = useState<string>("");
  const [cafeLng, setCafeLng] = useState<string>("");
  const [type, setType] = useState<string>(review?.type ?? "barista");
  const [worthIt, setWorthIt] = useState<string>(review?.worthIt ?? "yes");
  const [rating, setRating] = useState<string>(review?.rating ?? "4.0");
  const [cost, setCost] = useState<string>(review?.cost ?? "3.40");
  const [notes, setNotes] = useState<string>(review?.notes ?? "");

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
        cafeId: cafeId === NEW_CAFE ? null : cafeId,
        cafeName: cafeId === NEW_CAFE ? cafeName : null,
        cafeAddress: cafeId === NEW_CAFE ? cafeAddress || null : null,
        cafeLat: cafeId === NEW_CAFE && cafeLat !== "" ? Number(cafeLat) : null,
        cafeLng: cafeId === NEW_CAFE && cafeLng !== "" ? Number(cafeLng) : null,
        type,
        worthIt,
        rating,
        cost,
        notes,
      };
      if (review) {
        await apiSend(`/api/reviews/${review.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/reviews", "POST", payload);
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
          <DialogTitle>{review ? "Edit review" : "Add review"}</DialogTitle>
          <DialogDescription>
            Score a flat white on rating, cost and whether it was worth it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label>Cafe</Label>
            <Select value={cafeId} onValueChange={setCafeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_CAFE}>➕ New cafe…</SelectItem>
                {cafes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cafeId === NEW_CAFE && (
              <div className="mt-2 space-y-2">
                {mapsLoaded && (
                  <PlaceAutocompleteField
                    id="review-place-search"
                    placeholder="Search Google Places…"
                    bounds={TEIGNMOUTH_BOUNDS}
                    onPlaceSelected={(place) => {
                      setCafeName(place.name ?? cafeName);
                      setCafeAddress(place.address ?? cafeAddress);
                      setCafeLat(String(place.lat));
                      setCafeLng(String(place.lng));
                    }}
                  />
                )}
                <Input
                  placeholder="New cafe name"
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                  required
                />
                {cafeLat !== "" && cafeLng !== "" && (
                  <p className="text-xs text-muted-foreground">
                    Location captured{cafeAddress ? `: ${cafeAddress}` : ""}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barista">Barista</SelectItem>
                  <SelectItem value="machine">Machine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Worth it?</Label>
              <Select value={worthIt} onValueChange={setWorthIt}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rating">Rating (out of 5)</Label>
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cost">Cost (£)</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Silky microfoam, great value…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : review ? "Save changes" : "Add review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
