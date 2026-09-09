"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCost, formatDate, formatRating, formatType } from "@/lib/format";
import type { ReviewRow } from "@/lib/types";

const ALL = "all";

type SortKey = "cafe" | "rating" | "cost" | "createdAt";

export function ListView({ reviews }: { reviews: ReviewRow[] }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>(ALL);
  const [worthIt, setWorthIt] = useState<string>(ALL);
  const [minRating, setMinRating] = useState<string>(ALL);
  const [maxCost, setMaxCost] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("createdAt");

  const filtered = useMemo(() => {
    const min = minRating === ALL ? 0 : Number(minRating);
    const max = maxCost.trim() === "" ? Infinity : Number(maxCost);

    const rows = reviews.filter((r) => {
      if (search && !r.cafeName.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (type !== ALL && r.type !== type) return false;
      if (worthIt !== ALL && r.worthIt !== worthIt) return false;
      if (Number(r.rating) < min) return false;
      if (!Number.isNaN(max) && Number(r.cost) > max) return false;
      return true;
    });

    return rows.sort((a, b) => {
      switch (sort) {
        case "cafe":
          return a.cafeName.localeCompare(b.cafeName);
        case "rating":
          return Number(b.rating) - Number(a.rating);
        case "cost":
          return Number(a.cost) - Number(b.cost);
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [reviews, search, type, worthIt, minRating, maxCost, sort]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 space-y-1 sm:col-span-1">
          <Label htmlFor="search">Cafe</Label>
          <Input
            id="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
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
          <Select value={worthIt} onValueChange={setWorthIt}>
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
          <Select value={minRating} onValueChange={setMinRating}>
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
            value={maxCost}
            onChange={(e) => setMaxCost(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {reviews.length} review
          {reviews.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Sort</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Newest</SelectItem>
              <SelectItem value="rating">Rating (high→low)</SelectItem>
              <SelectItem value="cost">Cost (low→high)</SelectItem>
              <SelectItem value="cafe">Cafe (A→Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cafe</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Worth it</TableHead>
              <TableHead className="hidden md:table-cell">Notes</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No reviews match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.cafeName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatType(r.type)}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatRating(r.rating)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCost(r.cost)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.worthIt === "yes" ? "success" : "destructive"}>
                      {r.worthIt === "yes" ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-[24ch] truncate md:table-cell text-muted-foreground">
                    {r.notes ?? "—"}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
