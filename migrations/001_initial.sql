create table workouts (
  id uuid primary key,
  owner_id text not null,
  name text not null check (char_length(name) between 1 and 40),
  focus text not null check (char_length(focus) between 1 and 60),
  color text not null check (color in ('yellow', 'pink', 'blue', 'green', 'orange')),
  created_at timestamptz not null default now()
);

create unique index workouts_owner_color_idx on workouts(owner_id, color);

create table exercises (
  id uuid primary key,
  workout_id uuid not null references workouts(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  sets integer not null check (sets between 1 and 20),
  target_reps integer not null check (target_reps between 1 and 100),
  position integer not null check (position >= 0),
  unique (workout_id, position)
);

create table workout_sessions (
  id uuid primary key,
  workout_id uuid not null references workouts(id) on delete restrict,
  owner_id text not null,
  feedback text,
  completed_at timestamptz not null default now()
);

create table completed_sets (
  id uuid primary key,
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  set_number integer not null check (set_number > 0),
  weight numeric(7, 2) check (weight >= 0),
  reps integer not null check (reps > 0),
  load_rating text,
  unique (session_id, exercise_id, set_number)
);

create index workout_sessions_owner_completed_idx
  on workout_sessions(owner_id, completed_at desc);
