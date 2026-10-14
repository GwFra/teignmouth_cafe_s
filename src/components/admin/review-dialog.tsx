"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiSend } from "@/lib/client";
import { requiredNumberInRange } from "@/lib/form-validation";
import { GOOGLE_MAPS_LIBRARIES, TEIGNMOUTH_BOUNDS } from "@/lib/maps-config";
import type { CafeOption, ReviewRow } from "@/lib/types";

// Client-side mirror of parseReviewInput, so mistakes show against the field
// before a round trip. The API still validates on its own.
const reviewFormSchema = z
  .object({
    cafeMode: z.enum(["existing", "new"]),
    cafeId: z.string(),
    cafeName: z.string().trim(),
    // Filled in by the Places search; there are no inputs for these.
    cafeAddress: z.string(),
    cafeLat: z.string(),
    cafeLng: z.string(),
    // "" until a choice is made, so the selects can show their placeholders.
    type: z
      .enum(["barista", "machine"])
      .or(z.literal(""))
      .refine((v) => v !== "", "Choose a type."),
    worthIt: z
      .enum(["yes", "no"])
      .or(z.literal(""))
      .refine((v) => v !== "", "Choose whether it was worth it."),
    rating: requiredNumberInRange(0, 5, "Rating must be between 0 and 5."),
    cost: requiredNumberInRange(0, Infinity, "Cost must be £0 or more."),
    notes: z.string(),
  })
  .refine((v) => v.cafeMode !== "existing" || v.cafeId !== "", {
    path: ["cafeId"],
    message: "Choose a cafe.",
  })
  .refine((v) => v.cafeMode !== "new" || v.cafeName !== "", {
    path: ["cafeName"],
    message: "Enter the new cafe's name.",
  });

// What the inputs hold (selects may still be ""), vs. what submit receives.
type ReviewFormInput = z.input<typeof reviewFormSchema>;
type ReviewFormValues = z.output<typeof reviewFormSchema>;

function defaultValuesFor(
  cafes: CafeOption[],
  review?: ReviewRow,
): ReviewFormInput {
  return {
    cafeMode: review || cafes.length > 0 ? "existing" : "new",
    cafeId: review?.cafeId ?? "",
    cafeName: "",
    cafeAddress: "",
    cafeLat: "",
    cafeLng: "",
    type: review?.type ?? "",
    worthIt: review?.worthIt ?? "",
    rating: review?.rating ?? "",
    cost: review?.cost ?? "",
    notes: review?.notes ?? "",
  };
}

interface Props {
  cafes: CafeOption[];
  review?: ReviewRow;
  trigger: React.ReactNode;
  onSaved: () => void;
}

export function ReviewDialog({ cafes, review, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false);

  const form = useForm<ReviewFormInput, unknown, ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: defaultValuesFor(cafes, review),
  });
  const { isSubmitting, errors } = form.formState;
  const [cafeMode, cafeAddress, cafeLat, cafeLng] = useWatch({
    control: form.control,
    name: ["cafeMode", "cafeAddress", "cafeLat", "cafeLng"],
  });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // The form outlives the dialog, so start each opening from a clean slate
  // rather than whatever was left from the last review (including the
  // captured location).
  function handleOpenChange(next: boolean) {
    if (next) form.reset(defaultValuesFor(cafes, review));
    setOpen(next);
  }

  async function submit(values: ReviewFormValues) {
    const isNewCafe = values.cafeMode === "new";
    try {
      const payload = {
        cafeId: isNewCafe ? null : values.cafeId,
        cafeName: isNewCafe ? values.cafeName : null,
        cafeAddress: isNewCafe ? values.cafeAddress || null : null,
        cafeLat:
          isNewCafe && values.cafeLat !== "" ? Number(values.cafeLat) : null,
        cafeLng:
          isNewCafe && values.cafeLng !== "" ? Number(values.cafeLng) : null,
        type: values.type,
        worthIt: values.worthIt,
        rating: values.rating,
        cost: values.cost,
        notes: values.notes,
      };
      if (review) {
        await apiSend(`/api/reviews/${review.id}`, "PATCH", payload);
      } else {
        await apiSend("/api/reviews", "POST", payload);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{review ? "Edit review" : "Add review"}</DialogTitle>
          <DialogDescription>
            Score a flat white on rating, cost and whether it was worth it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">Cafe</p>
              <Tabs
                value={cafeMode}
                onValueChange={(v) =>
                  form.setValue("cafeMode", v as ReviewFormInput["cafeMode"], {
                    shouldDirty: true,
                  })
                }
                className="space-y-2"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Existing cafe</TabsTrigger>
                  <TabsTrigger value="new">New cafe</TabsTrigger>
                </TabsList>

                <TabsContent value="existing">
                  {cafes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No cafes yet. Add one from the New cafe tab.
                    </p>
                  ) : (
                    <FormField
                      control={form.control}
                      name="cafeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">
                            Existing cafe
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a cafe…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cafes.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                <TabsContent value="new" className="space-y-2">
                  {mapsLoaded && (
                    <PlaceAutocompleteField
                      id="review-place-search"
                      placeholder="Search Google Places…"
                      bounds={TEIGNMOUTH_BOUNDS}
                      onPlaceSelected={(place) => {
                        const opts = {
                          shouldValidate: true,
                          shouldDirty: true,
                        };
                        if (place.name) {
                          form.setValue("cafeName", place.name, opts);
                        }
                        if (place.address) {
                          form.setValue("cafeAddress", place.address, opts);
                        }
                        form.setValue("cafeLat", String(place.lat), opts);
                        form.setValue("cafeLng", String(place.lng), opts);
                      }}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="cafeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">New cafe name</FormLabel>
                        <FormControl>
                          <Input placeholder="New cafe name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {cafeLat !== "" && cafeLng !== "" && (
                    <p className="text-xs text-muted-foreground">
                      Location captured
                      {cafeAddress ? `: ${cafeAddress}` : ""}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="barista">Barista</SelectItem>
                        <SelectItem value="machine">Machine</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="worthIt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Worth it?</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Yes or no?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (out of 5)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        placeholder="e.g. 4.0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost (£)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 3.50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Silky microfoam, great value…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving…"
                  : review
                    ? "Save changes"
                    : "Add review"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
