create table users (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

insert into users (id, name)
select owner_id, 'Gym Flow user'
from (
  select owner_id from workouts
  union
  select owner_id from workout_sessions
) existing_users;

insert into users (id, name)
values ('local-user', 'Local user')
on conflict (id) do nothing;

alter table workouts
  add constraint workouts_owner_id_fkey
  foreign key (owner_id) references users(id) on delete restrict;

alter table workout_sessions
  add constraint workout_sessions_owner_id_fkey
  foreign key (owner_id) references users(id) on delete restrict;
