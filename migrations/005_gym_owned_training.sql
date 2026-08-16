truncate table completed_sets, workout_sessions, exercises, workouts;

drop index workouts_owner_color_idx;
drop index workout_sessions_owner_completed_idx;

alter table workouts
  drop constraint workouts_owner_id_fkey;
alter table workouts
  rename column owner_id to created_by_user_id;

alter table workouts
  alter column id set default uuidv7(),
  add column gym_id uuid not null references gyms(id) on delete restrict,
  add constraint workouts_created_by_user_id_fkey
    foreign key (created_by_user_id) references users(id) on delete restrict,
  add constraint workouts_gym_id_id_key unique (gym_id, id);

create unique index workouts_gym_color_idx on workouts(gym_id, color);

alter table exercises
  alter column id set default uuidv7();

alter table workout_sessions
  drop constraint workout_sessions_workout_id_fkey,
  drop constraint workout_sessions_owner_id_fkey;
alter table workout_sessions
  rename column owner_id to created_by_user_id;

alter table workout_sessions
  alter column id set default uuidv7(),
  add column gym_id uuid not null references gyms(id) on delete restrict,
  add constraint workout_sessions_created_by_user_id_fkey
    foreign key (created_by_user_id) references users(id) on delete restrict,
  add constraint workout_sessions_gym_workout_fkey
    foreign key (gym_id, workout_id) references workouts(gym_id, id) on delete restrict;

create index workout_sessions_gym_completed_idx
  on workout_sessions(gym_id, completed_at desc);

alter table completed_sets
  alter column id set default uuidv7();
