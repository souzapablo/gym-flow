import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_name_check",
      sql`char_length(${table.name}) between 1 and 80`,
    ),
  ],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id")
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
    uniqueIndex("workouts_owner_color_idx").on(table.ownerId, table.color),
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
    id: uuid("id").primaryKey(),
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
    id: uuid("id").primaryKey(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "restrict" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    feedback: text("feedback"),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("workout_sessions_owner_completed_idx").on(
      table.ownerId,
      table.completedAt.desc(),
    ),
  ],
);

export const completedSets = pgTable(
  "completed_sets",
  {
    id: uuid("id").primaryKey(),
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
  workouts: many(workouts),
  workoutSessions: many(workoutSessions),
}));

export const workoutsRelations = relations(workouts, ({ many, one }) => ({
  owner: one(users, {
    fields: [workouts.ownerId],
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
    owner: one(users, {
      fields: [workoutSessions.ownerId],
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
