"use client";

import { useId, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

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
import {
  ALL,
  filterReviews,
  hasActiveReviewOnlyFilters,
  normalizeSearch,
  type ReviewFilterState,
} from "@/lib/review-filters";
import type { ReviewRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FieldsProps {
  value: ReviewFilterState;
  onChange: (next: ReviewFilterState) => void;
  className?: string;
}

/** The filter inputs themselves, laid out as a responsive grid. */
function ReviewFilterFields({ value, onChange, className }: FieldsProps) {
  // Unique ids so the inline bar and the mobile dialog can coexist in the DOM.
  const id = useId();
  const searchId = `${id}-search`;
  const maxCostId = `${id}-maxCost`;

  function set<K extends keyof ReviewFilterState>(
    key: K,
    next: ReviewFilterState[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6",
        className,
      )}
    >
      <div className="col-span-2 space-y-1 sm:col-span-1">
        <Label htmlFor={searchId}>Cafe</Label>
        <Input
          id={searchId}
          placeholder="Search…"
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label>Type</Label>
        <Select value={value.type} onValueChange={(v) => set("type", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            <SelectItem value="barista">Barista</SelectItem>
            <SelectItem value="machine">Machine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Worth it</Label>
        <Select value={value.worthIt} onValueChange={(v) => set("worthIt", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Min rating</Label>
        <Select
          value={value.minRating}
          onValueChange={(v) => set("minRating", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any</SelectItem>
            <SelectItem value="1">1+</SelectItem>
            <SelectItem value="2">2+</SelectItem>
            <SelectItem value="3">3+</SelectItem>
            <SelectItem value="4">4+</SelectItem>
            <SelectItem value="5">5</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor={maxCostId}>Max cost (£)</Label>
        <Input
          id={maxCostId}
          type="number"
          inputMode="decimal"
          step="0.10"
          min="0"
          placeholder="Any"
          value={value.maxCost}
          onChange={(e) => set("maxCost", e.target.value)}
        />
      </div>
    </div>
  );
}

interface BarProps {
  value: ReviewFilterState;
  onChange: (next: ReviewFilterState) => void;
  className?: string;
}

/**
 * Inline filter controls shared by the map and list views over the same
 * review data. Changes apply immediately.
 */
export function ReviewFilterBar({ value, onChange, className }: BarProps) {
  return (
    <ReviewFilterFields
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}

interface DialogProps {
  value: ReviewFilterState;
  onChange: (next: ReviewFilterState) => void;
  /** All reviews, used to preview how many match the draft filters. */
  reviews: ReviewRow[];
  className?: string;
}

/**
 * Compact alternative to {@link ReviewFilterBar} for small screens: an icon
 * button that opens the filters in a modal. Edits are held as a draft (with a
 * live count of matching reviews) and only applied on "Apply", so the map
 * doesn't re-render behind the modal on every keystroke.
 */
export function ReviewFilterDialog({
  value,
  onChange,
  reviews,
  className,
}: DialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const matchCount = useMemo(
    () => filterReviews(reviews, draft).length,
    [reviews, draft],
  );

  const isFiltered =
    normalizeSearch(value.search) !== "" || hasActiveReviewOnlyFilters(value);

  function handleOpenChange(next: boolean) {
    // Start each session from the applied filters; closing without applying
    // discards the draft.
    if (next) setDraft(value);
    setOpen(next);
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("relative", className)}
          aria-label={isFiltered ? "Filters (active)" : "Filters"}
        >
          <SlidersHorizontal />
          {isFiltered && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Filter reviews</DialogTitle>
          <DialogDescription aria-live="polite">
            {matchCount} of {reviews.length}{" "}
            {reviews.length === 1 ? "flat white " : "flat whites"}
          </DialogDescription>
        </DialogHeader>

        <ReviewFilterFields value={draft} onChange={setDraft} />

        <DialogFooter>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
