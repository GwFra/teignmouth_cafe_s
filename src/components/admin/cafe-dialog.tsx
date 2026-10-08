"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useJsApiLoader } from "@react-google-maps/api";
import { AlertCircle } from "lucide-react";

import { PlaceAutocompleteField } from "@/components/admin/place-autocomplete-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiSend } from "@/lib/client";
import { optionalNumberInRange } from "@/lib/form-validation";
import { GOOGLE_MAPS_LIBRARIES, TEIGNMOUTH_BOUNDS } from "@/lib/maps-config";
import type { CafeWithStats } from "@/lib/types";

// Client-side mirror of parseCafeInput, so mistakes show against the field
// before a round trip. The API still validates on its own.
const cafeFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the cafe's name."),
  address: z.string(),
  lat: optionalNumberInRange(-90, 90, "Latitude must be between -90 and 90."),
  lng: optionalNumberInRange(
    -180,
    180,
    "Longitude must be between -180 and 180.",
  ),
});

type CafeFormValues = z.infer<typeof cafeFormSchema>;

interface Props {
  cafe?: CafeWithStats;
  trigger: React.ReactNode;
  onSaved: () => void;
}

export function CafeDialog({ cafe, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);

  const form = useForm<CafeFormValues>({
    resolver: zodResolver(cafeFormSchema),
    defaultValues: {
      name: cafe?.name ?? "",
      address: cafe?.address ?? "",
      lat: cafe?.lat != null ? String(cafe.lat) : "",
      lng: cafe?.lng != null ? String(cafe.lng) : "",
    },
  });
  const { isSubmitting, errors } = form.formState;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  async function submit(values: CafeFormValues) {
    try {
      const payload = {
        name: values.name,
        address: values.address || null,
        lat: values.lat === "" ? null : Number(values.lat),
        lng: values.lng === "" ? null : Number(values.lng),
      };
      if (cafe) {
        await apiSend(`/api/cafes/${cafe.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/cafes", "POST", payload);
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to save",
      });
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            {/* Not a form field itself: it fills in the fields below. */}
            {mapsLoaded && (
              <div className="space-y-2">
                <Label htmlFor="place-search">
                  Search Google Places (optional)
                </Label>
                <PlaceAutocompleteField
                  id="place-search"
                  placeholder="Start typing a cafe name…"
                  bounds={TEIGNMOUTH_BOUNDS}
                  onPlaceSelected={(place) => {
                    const opts = { shouldValidate: true, shouldDirty: true };
                    if (place.name) form.setValue("name", place.name, opts);
                    if (place.address) {
                      form.setValue("address", place.address, opts);
                    }
                    form.setValue("lat", String(place.lat), opts);
                    form.setValue("lng", String(place.lng), opts);
                  }}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Northumberland Place, Teignmouth"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="50.5462"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-3.4966"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : cafe ? "Save changes" : "Add cafe"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
