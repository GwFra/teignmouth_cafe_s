"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL, type ReviewFilterState } from "@/lib/review-filters";

interface Props {
  value: ReviewFilterState;
  onChange: (next: ReviewFilterState) => void;
}

/** Filter controls shared by the map and list views over the same review data. */
export function ReviewFilterBar({ value, onChange }: Props) {
  function set<K extends keyof ReviewFilterState>(
    key: K,
    next: ReviewFilterState[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div className="col-span-2 space-y-1 sm:col-span-1">
        <Label htmlFor="search">Cafe</Label>
        <Input
          id="search"
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
        <Select value={value.minRating} onValueChange={(v) => set("minRating", v)}>
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
        <Label htmlFor="maxCost">Max cost (£)</Label>
        <Input
          id="maxCost"
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
