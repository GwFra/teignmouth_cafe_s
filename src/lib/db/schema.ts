import { relations } from "drizzle-orm";
import {
  doublePrecision,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A coffee can be pulled from an automatic machine or made by a barista.
 */
export const reviewTypeEnum = pgEnum("review_type", ["machine", "barista"]);

/**
 * Was the flat white worth the money? Kept as an explicit yes/no per the brief.
 */
export const worthItEnum = pgEnum("worth_it", ["yes", "no"]);

// ---------------------------------------------------------------------------
// Cafes — a cafe exists once and can hold many flat-white reviews. Storing the
// location here (rather than per review) keeps the Google Maps view tidy.
// ---------------------------------------------------------------------------
export const cafes = pgTable(
  "cafes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    address: text("address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    nameIdx: index("cafes_name_idx").on(t.name),
  }),
);

// ---------------------------------------------------------------------------
// Reviews — one scored flat white. rating/cost are stored numeric so the list
// view can filter and sort on them; the UI formats cost with a "£" prefix.
// ---------------------------------------------------------------------------
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cafeId: uuid("cafe_id")
      .notNull()
      .references(() => cafes.id, { onDelete: "cascade" }),
    type: reviewTypeEnum("type").notNull(),
    worthIt: worthItEnum("worth_it").notNull(),
    // out of 5, one decimal place e.g. "4.5"
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
    // GBP, two decimal places e.g. "3.40" -> rendered as "£3.40"
    cost: numeric("cost", { precision: 6, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    cafeIdx: index("reviews_cafe_idx").on(t.cafeId),
  }),
);

// ---------------------------------------------------------------------------
// Users — populated on first Google sign-in.
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------------------------------------------------------------------------
// Sessions — server-side record backing each JWT so it can be revoked. The JWT
// carries the session id (`sid`); if the row is gone or `revokedAt` is set, the
// token is rejected regardless of its signature still being valid.
// ---------------------------------------------------------------------------
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const cafesRelations = relations(cafes, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  cafe: one(cafes, {
    fields: [reviews.cafeId],
    references: [cafes.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Convenience type exports
export type Cafe = typeof cafes.$inferSelect;
export type NewCafe = typeof cafes.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
