truncate table users cascade;

alter table sessions drop constraint sessions_user_id_fkey;
alter table accounts drop constraint accounts_user_id_fkey;
alter table gyms drop constraint gyms_owner_user_id_fkey;
alter table memberships drop constraint memberships_user_id_fkey;
alter table active_gym_selections drop constraint active_gym_selections_user_id_fkey;
alter table security_audit_events drop constraint security_audit_events_actor_user_id_fkey;
alter table security_audit_events drop constraint security_audit_events_target_id_check;
alter table workouts drop constraint workouts_created_by_user_id_fkey;
alter table workout_sessions drop constraint workout_sessions_created_by_user_id_fkey;

alter table users
  alter column id type uuid using id::uuid,
  alter column id set default uuidv7();
alter table sessions
  alter column id type uuid using id::uuid,
  alter column id set default uuidv7(),
  alter column user_id type uuid using user_id::uuid;
alter table accounts
  alter column id type uuid using id::uuid,
  alter column id set default uuidv7(),
  alter column user_id type uuid using user_id::uuid;
alter table verifications
  alter column id type uuid using id::uuid,
  alter column id set default uuidv7();
alter table gyms alter column owner_user_id type uuid using owner_user_id::uuid;
alter table memberships alter column user_id type uuid using user_id::uuid;
alter table active_gym_selections alter column user_id type uuid using user_id::uuid;
alter table security_audit_events
  alter column actor_user_id type uuid using actor_user_id::uuid,
  alter column target_id type uuid using target_id::uuid;
alter table workouts
  alter column created_by_user_id type uuid using created_by_user_id::uuid;
alter table workout_sessions
  alter column created_by_user_id type uuid using created_by_user_id::uuid;

alter table sessions add constraint sessions_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;
alter table accounts add constraint accounts_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;
alter table gyms add constraint gyms_owner_user_id_fkey
  foreign key (owner_user_id) references users(id) on delete restrict;
alter table memberships add constraint memberships_user_id_fkey
  foreign key (user_id) references users(id) on delete restrict;
alter table active_gym_selections add constraint active_gym_selections_user_id_fkey
  foreign key (user_id) references users(id) on delete cascade;
alter table security_audit_events add constraint security_audit_events_actor_user_id_fkey
  foreign key (actor_user_id) references users(id) on delete set null;
alter table workouts add constraint workouts_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete restrict;
alter table workout_sessions add constraint workout_sessions_created_by_user_id_fkey
  foreign key (created_by_user_id) references users(id) on delete restrict;

alter table users add constraint users_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table sessions add constraint sessions_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table accounts add constraint accounts_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table verifications add constraint verifications_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table gyms add constraint gyms_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table memberships add constraint memberships_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table security_audit_events add constraint security_audit_events_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table security_audit_events add constraint security_audit_events_target_id_uuidv7_check check (uuid_extract_version(target_id) = 7);
alter table workouts add constraint workouts_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table exercises add constraint exercises_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table workout_sessions add constraint workout_sessions_id_uuidv7_check check (uuid_extract_version(id) = 7);
alter table completed_sets add constraint completed_sets_id_uuidv7_check check (uuid_extract_version(id) = 7);
