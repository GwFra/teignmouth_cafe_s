"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

type SortKey = "cafe" | "rating" | "cost" | "createdAt";

interface Props {
  reviews: ReviewRow[];
  totalCount: number;
}

export function ListView({ reviews, totalCount }: Props) {
  const [sort, setSort] = useState<SortKey>("createdAt");

  const sorted = useMemo(() => {
    return [...reviews].sort((a, b) => {
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
  }, [reviews, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {sorted.length} of {totalCount} review
          {totalCount === 1 ? "" : "s"}
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
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No reviews match these filters.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => (
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
