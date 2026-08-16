import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    emailNormalized: text("email_normalized").notNull().default(""),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_normalized_idx").on(table.emailNormalized),
    check("users_name_check", sql`char_length(${table.name}) between 1 and 80`),
    check(
      "users_email_normalized_check",
      sql`${table.emailNormalized} = lower(btrim(${table.emailNormalized}))`,
    ),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_idx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const gyms = pgTable(
  "gyms",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("gyms_name_check", sql`char_length(${table.name}) between 1 and 100`),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("memberships_gym_id_user_id_key").on(table.gymId, table.userId),
    unique("memberships_gym_id_id_key").on(table.gymId, table.id),
    uniqueIndex("memberships_one_owner_per_gym_idx")
      .on(table.gymId)
      .where(sql`${table.role} = 'owner'`),
    check(
      "memberships_role_check",
      sql`${table.role} in ('owner', 'coach', 'member')`,
    ),
    check(
      "memberships_status_check",
      sql`${table.status} in ('active', 'suspended', 'removed')`,
    ),
    check(
      "memberships_owner_status_check",
      sql`${table.role} <> 'owner' or ${table.status} = 'active'`,
    ),
  ],
);

export const activeGymSelections = pgTable(
  "active_gym_selections",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    gymId: uuid("gym_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.gymId, table.membershipId],
      foreignColumns: [memberships.gymId, memberships.id],
      name: "active_gym_selections_gym_id_membership_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const securityAuditEvents = pgTable(
  "security_audit_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    eventType: text("event_type").notNull(),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "restrict" }),
    actorUserId: text("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    check(
      "security_audit_events_event_type_check",
      sql`char_length(${table.eventType}) > 0`,
    ),
    check(
      "security_audit_events_target_type_check",
      sql`char_length(${table.targetType}) > 0`,
    ),
    check(
      "security_audit_events_target_id_check",
      sql`char_length(${table.targetId}) > 0`,
    ),
    check(
      "security_audit_events_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "restrict" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    focus: text("focus").notNull(),
    color: text("color").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("workouts_gym_id_id_key").on(table.gymId, table.id),
    uniqueIndex("workouts_gym_color_idx").on(table.gymId, table.color),
    check(
      "workouts_name_check",
      sql`char_length(${table.name}) between 1 and 40`,
    ),
    check(
      "workouts_focus_check",
      sql`char_length(${table.focus}) between 1 and 60`,
    ),
    check(
      "workouts_color_check",
      sql`${table.color} in ('yellow', 'pink', 'blue', 'green', 'orange')`,
    ),
  ],
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sets: integer("sets").notNull(),
    targetReps: integer("target_reps").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    unique("exercises_workout_id_position_key").on(
      table.workoutId,
      table.position,
    ),
    check(
      "exercises_name_check",
      sql`char_length(${table.name}) between 1 and 60`,
    ),
    check("exercises_sets_check", sql`${table.sets} between 1 and 20`),
    check(
      "exercises_target_reps_check",
      sql`${table.targetReps} between 1 and 100`,
    ),
    check("exercises_position_check", sql`${table.position} >= 0`),
  ],
);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    gymId: uuid("gym_id")
      .notNull()
      .references(() => gyms.id, { onDelete: "restrict" }),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "restrict" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    feedback: text("feedback"),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.gymId, table.workoutId],
      foreignColumns: [workouts.gymId, workouts.id],
      name: "workout_sessions_gym_workout_fkey",
    }).onDelete("restrict"),
    index("workout_sessions_gym_completed_idx").on(
      table.gymId,
      table.completedAt.desc(),
    ),
  ],
);

export const completedSets = pgTable(
  "completed_sets",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    setNumber: integer("set_number").notNull(),
    weight: numeric("weight", { precision: 7, scale: 2 }),
    reps: integer("reps").notNull(),
    loadRating: text("load_rating"),
  },
  (table) => [
    unique("completed_sets_session_id_exercise_id_set_number_key").on(
      table.sessionId,
      table.exerciseId,
      table.setNumber,
    ),
    check("completed_sets_set_number_check", sql`${table.setNumber} > 0`),
    check("completed_sets_weight_check", sql`${table.weight} >= 0`),
    check("completed_sets_reps_check", sql`${table.reps} > 0`),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  ownedGyms: many(gyms),
  memberships: many(memberships),
  activeGymSelections: many(activeGymSelections),
  securityAuditEvents: many(securityAuditEvents),
  workouts: many(workouts),
  workoutSessions: many(workoutSessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const gymsRelations = relations(gyms, ({ many, one }) => ({
  owner: one(users, {
    fields: [gyms.ownerUserId],
    references: [users.id],
  }),
  memberships: many(memberships),
  activeGymSelections: many(activeGymSelections),
  securityAuditEvents: many(securityAuditEvents),
  workouts: many(workouts),
  workoutSessions: many(workoutSessions),
}));

export const membershipsRelations = relations(memberships, ({ many, one }) => ({
  gym: one(gyms, {
    fields: [memberships.gymId],
    references: [gyms.id],
  }),
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  activeGymSelections: many(activeGymSelections),
}));

export const activeGymSelectionsRelations = relations(
  activeGymSelections,
  ({ one }) => ({
    user: one(users, {
      fields: [activeGymSelections.userId],
      references: [users.id],
    }),
    gym: one(gyms, {
      fields: [activeGymSelections.gymId],
      references: [gyms.id],
    }),
    membership: one(memberships, {
      fields: [activeGymSelections.membershipId],
      references: [memberships.id],
    }),
  }),
);

export const securityAuditEventsRelations = relations(
  securityAuditEvents,
  ({ one }) => ({
    gym: one(gyms, {
      fields: [securityAuditEvents.gymId],
      references: [gyms.id],
    }),
    actor: one(users, {
      fields: [securityAuditEvents.actorUserId],
      references: [users.id],
    }),
  }),
);

export const workoutsRelations = relations(workouts, ({ many, one }) => ({
  gym: one(gyms, {
    fields: [workouts.gymId],
    references: [gyms.id],
  }),
  creator: one(users, {
    fields: [workouts.createdByUserId],
    references: [users.id],
  }),
  exercises: many(exercises),
  sessions: many(workoutSessions),
}));

export const exercisesRelations = relations(exercises, ({ many, one }) => ({
  workout: one(workouts, {
    fields: [exercises.workoutId],
    references: [workouts.id],
  }),
  completedSets: many(completedSets),
}));

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ many, one }) => ({
    workout: one(workouts, {
      fields: [workoutSessions.workoutId],
      references: [workouts.id],
    }),
    gym: one(gyms, {
      fields: [workoutSessions.gymId],
      references: [gyms.id],
    }),
    creator: one(users, {
      fields: [workoutSessions.createdByUserId],
      references: [users.id],
    }),
    completedSets: many(completedSets),
  }),
);

export const completedSetsRelations = relations(completedSets, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [completedSets.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, {
    fields: [completedSets.exerciseId],
    references: [exercises.id],
  }),
}));
