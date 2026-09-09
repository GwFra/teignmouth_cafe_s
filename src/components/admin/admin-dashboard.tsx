"use client";

import { useCallback, useEffect, useState } from "react";
import { Coffee, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { CafeDialog } from "@/components/admin/cafe-dialog";
import { ReviewDialog } from "@/components/admin/review-dialog";
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
import { formatCost, formatDate, formatRating, formatType } from "@/lib/format";
import type { CafeWithStats, ReviewRow } from "@/lib/types";

interface SessionRow {
  id: string;
  email: string;
  name: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export function AdminDashboard() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [cafes, setCafes] = useState<CafeWithStats[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, c, s] = await Promise.all([
        fetch("/api/reviews").then((res) => res.json()),
        fetch("/api/cafes").then((res) => res.json()),
        fetch("/api/sessions").then((res) => res.json()),
      ]);
      setReviews(r);
      setCafes(c);
      setSessions(Array.isArray(s) ? s : []);
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
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="sm" onClick={() => loadAll()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
                    <TableCell>{formatType(r.type)}</TableCell>
                    <TableCell>{formatRating(r.rating)}</TableCell>
                    <TableCell>{formatCost(r.cost)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.worthIt === "yes" ? "success" : "destructive"}
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

      {/* ---------------- Sessions ---------------- */}
      <TabsContent value="sessions" className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Every sign-in creates a revocable session. Revoke one to sign that
          device out immediately, even though its token has not expired.
        </p>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden sm:table-cell">Last seen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <EmptyRow cols={4} text="Loading…" />
              ) : sessions.length === 0 ? (
                <EmptyRow cols={4} text="No sessions." />
              ) : (
                sessions.map((s) => {
                  const revoked = s.revokedAt != null;
                  const expired = new Date(s.expiresAt) < new Date();
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name ?? s.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.email}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(s.lastSeenAt)}
                      </TableCell>
                      <TableCell>
                        {revoked ? (
                          <Badge variant="destructive">Revoked</Badge>
                        ) : expired ? (
                          <Badge variant="outline">Expired</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={revoked}
                          onClick={() =>
                            remove(
                              `/api/sessions/${s.id}`,
                              `Revoke this session for ${s.email}?`,
                            )
                          }
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
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
