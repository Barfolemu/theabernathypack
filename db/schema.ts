import { randomUUID } from "crypto";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 3.1 logins
export const loginStatusEnum = pgEnum("login_status", ["active", "deactivated"]);
export const loginRoleEnum = pgEnum("login_role", ["member", "admin"]);

export const logins = pgTable("logins", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  status: loginStatusEnum("status").notNull().default("active"),
  role: loginRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Login = typeof logins.$inferSelect;

// 3.9 sessions
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  loginId: uuid("login_id")
    .notNull()
    .references(() => logins.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3.10 password_reset_tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  loginId: uuid("login_id")
    .notNull()
    .references(() => logins.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3.2 profiles
export const profileTypeEnum = pgEnum("profile_type", ["human", "dog"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  profileType: profileTypeEnum("profile_type").notNull(),
  displayName: text("display_name").notNull(),
  avatarKey: text("avatar_key"),
  defaultAvatarId: text("default_avatar_id"),
  breed: text("breed"),
  loginId: uuid("login_id").unique().references(() => logins.id),
  creatorId: uuid("creator_id")
    .notNull()
    .references((): any => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;

// 3.3 relationships
export const relationshipCategoryEnum = pgEnum("relationship_category", [
  "child",
  "pet",
  "partner",
  "spouse",
  "other",
]);

export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    profileIdA: uuid("profile_id_a")
      .notNull()
      .references(() => profiles.id),
    profileIdB: uuid("profile_id_b")
      .notNull()
      .references(() => profiles.id),
    category: relationshipCategoryEnum("category").notNull(),
    createdByProfileId: uuid("created_by_profile_id")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // profile_id_a/profile_id_b are always stored in canonical order (smaller id
    // first) at the application layer, so this unique index prevents duplicate or
    // reverse-duplicate edges between the same two profiles.
    uniqueIndex("relationships_pair_unique_idx").on(table.profileIdA, table.profileIdB),
  ],
);

export type Relationship = typeof relationships.$inferSelect;
export type RelationshipCategory = (typeof relationshipCategoryEnum.enumValues)[number];

// Dogs are always "pet" at profile-creation time; humans pick from the rest.
export const humanRelationshipCategories = relationshipCategoryEnum.enumValues.filter(
  (category) => category !== "pet",
);

export const relationshipCategoryLabels: Record<RelationshipCategory, string> = {
  child: "Kid",
  pet: "Pet",
  partner: "Partner",
  spouse: "Spouse",
  other: "Other",
};

// 3.4 invites
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Invite = typeof invites.$inferSelect;

// 3.5 events
export const eventCategoryEnum = pgEnum("event_category", [
  "casual_walk",
  "dog_playdate",
  "group_hike",
  "social_yappy_hour",
  "community_trip",
  "other",
]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: eventCategoryEnum("category").notNull(),
    categorySuggestion: text("category_suggestion"),
    locationShortDesc: text("location_short_desc"),
    locationMapUrl: text("location_map_url"),
    locationMeetupDetails: text("location_meetup_details"),
    eventDatetime: timestamp("event_datetime", { withTimezone: true }).notNull(),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "events_location_required_check",
      sql`${table.locationShortDesc} is not null or ${table.locationMapUrl} is not null or ${table.locationMeetupDetails} is not null`,
    ),
  ],
);

export type Event = typeof events.$inferSelect;
export type EventCategory = (typeof eventCategoryEnum.enumValues)[number];

export const eventCategoryLabels: Record<EventCategory, string> = {
  casual_walk: "Casual Walk",
  dog_playdate: "Dog Playdate",
  group_hike: "Group Hike",
  social_yappy_hour: "Social Yappy Hour",
  community_trip: "Community Trip",
  other: "Other",
};

// 3.6 event_rsvps
export const rsvpStatusEnum = pgEnum("rsvp_status", ["going", "interested"]);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id),
    status: rsvpStatusEnum("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.profileId] })],
);

// 3.7 event_messages
export const eventMessages = pgTable("event_messages", {
  id: uuid("id").primaryKey().$defaultFn(() => randomUUID()),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
