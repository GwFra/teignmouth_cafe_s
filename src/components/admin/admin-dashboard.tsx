"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Coffee,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { CafeDialog } from "@/components/admin/cafe-dialog";
import { ReviewDialog } from "@/components/admin/review-dialog";
import { ReviewType } from "@/components/review-type";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiSend } from "@/lib/client";
import { formatCost, formatRating } from "@/lib/format";
import type { CafeWithStats, ReviewRow } from "@/lib/types";

export function AdminDashboard() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [cafes, setCafes] = useState<CafeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, c] = await Promise.all([
        fetch("/api/reviews").then((res) => res.json()),
        fetch("/api/cafes").then((res) => res.json()),
      ]);
      setReviews(r);
      setCafes(c);
    } catch {
      setError("Could not load data. Is the database configured?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function remove(url: string, confirmMsg: string) {
    if (!window.confirm(confirmMsg)) return;
    try {
      await apiSend(url, "DELETE");
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const cafeOptions = cafes.map((c) => ({ id: c.id, name: c.name }));

  return (
    <Tabs defaultValue="reviews" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="cafes">Cafes</TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="sm" onClick={() => loadAll()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ---------------- Reviews ---------------- */}
      <TabsContent value="reviews" className="space-y-3">
        <ReviewDialog
          cafes={cafeOptions}
          onSaved={loadAll}
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add review
            </Button>
          }
        />
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cafe</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Worth it</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <EmptyRow cols={6} text="Loading…" />
              ) : reviews.length === 0 ? (
                <EmptyRow cols={6} text="No reviews yet." />
              ) : (
                reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.cafeName}</TableCell>
                    <TableCell>
                      <ReviewType type={r.type} />
                    </TableCell>
                    <TableCell>{formatRating(r.rating)}</TableCell>
                    <TableCell>{formatCost(r.cost)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.worthIt === "yes" ? "success" : "destructive"
                        }
                      >
                        {r.worthIt === "yes" ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <ReviewDialog
                          cafes={cafeOptions}
                          review={r}
                          onSaved={loadAll}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            remove(
                              `/api/reviews/${r.id}`,
                              `Delete this review of ${r.cafeName}?`,
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* ---------------- Cafes ---------------- */}
      <TabsContent value="cafes" className="space-y-3">
        <CafeDialog
          onSaved={loadAll}
          trigger={
            <Button size="sm">
              <Coffee className="h-4 w-4" />
              Add cafe
            </Button>
          }
        />
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Reviews</TableHead>
                <TableHead>Located</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <EmptyRow cols={4} text="Loading…" />
              ) : cafes.length === 0 ? (
                <EmptyRow cols={4} text="No cafes yet." />
              ) : (
                cafes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.reviewCount}</TableCell>
                    <TableCell>
                      {c.lat != null && c.lng != null ? (
                        <Badge variant="secondary">On map</Badge>
                      ) : (
                        <Badge variant="outline">No location</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <CafeDialog
                          cafe={c}
                          onSaved={loadAll}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            remove(
                              `/api/cafes/${c.id}`,
                              `Delete ${c.name} and all ${c.reviewCount} of its reviews?`,
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={cols}
        className="py-8 text-center text-muted-foreground"
      >
        {text}
      </TableCell>
    </TableRow>
  );
}
