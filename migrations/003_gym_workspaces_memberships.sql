alter table users
  add column email text default '',
  add column email_normalized text default '',
  add column email_verified boolean not null default false,
  add column updated_at timestamptz not null default now();

update users
set email = id || '@gym-flow.local',
    email_normalized = lower(id || '@gym-flow.local'),
    email_verified = true;

alter table users
  alter column email set not null,
  alter column email_normalized set not null,
  add constraint users_email_normalized_check
    check (email_normalized = lower(btrim(email_normalized)));

create unique index users_email_normalized_idx on users(email_normalized);

create table gyms (
  id uuid primary key default uuidv7(),
  name text not null check (char_length(name) between 1 and 100),
  owner_user_id text not null references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default uuidv7(),
  gym_id uuid not null references gyms(id) on delete restrict,
  user_id text not null references users(id) on delete restrict,
  role text not null check (role in ('owner', 'coach', 'member')),
  status text not null check (status in ('active', 'suspended', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, user_id),
  unique (gym_id, id),
  check (role <> 'owner' or status = 'active')
);

create unique index memberships_one_owner_per_gym_idx
  on memberships(gym_id)
  where role = 'owner';

create function protect_gym_ownership() returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'gyms' and tg_op = 'UPDATE'
     and new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'gym ownership is immutable';
  end if;

  if tg_table_name = 'memberships' then
    if tg_op = 'INSERT' and new.role = 'owner'
       and not exists (
         select 1 from gyms
         where id = new.gym_id and owner_user_id = new.user_id
       ) then
      raise exception 'owner membership must match gym owner';
    end if;

    if tg_op = 'UPDATE' and old.role = 'owner'
       and (new.role is distinct from old.role
         or new.status is distinct from old.status
         or new.user_id is distinct from old.user_id
         or new.gym_id is distinct from old.gym_id) then
      raise exception 'owner membership is immutable';
    end if;

    if tg_op = 'DELETE' and old.role = 'owner' then
      raise exception 'owner membership is immutable';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger gyms_protect_owner_before_update
before update on gyms
for each row execute function protect_gym_ownership();

create trigger memberships_protect_owner_before_write
before insert or update or delete on memberships
for each row execute function protect_gym_ownership();

create function require_gym_owner_membership() returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from memberships
    where gym_id = new.id
      and user_id = new.owner_user_id
      and role = 'owner'
      and status = 'active'
  ) then
    raise exception 'gym must have exactly one active owner membership';
  end if;

  return new;
end;
$$;

create constraint trigger gyms_require_owner_membership
after insert or update on gyms
deferrable initially deferred
for each row execute function require_gym_owner_membership();

create table active_gym_selections (
  user_id text primary key references users(id) on delete cascade,
  gym_id uuid not null,
  membership_id uuid not null,
  updated_at timestamptz not null default now(),
  foreign key (gym_id, membership_id)
    references memberships(gym_id, id) on delete cascade
);

create table security_audit_events (
  id uuid primary key default uuidv7(),
  event_type text not null check (char_length(event_type) > 0),
  gym_id uuid not null references gyms(id) on delete restrict,
  actor_user_id text references users(id) on delete set null,
  target_type text not null check (char_length(target_type) > 0),
  target_id text not null check (char_length(target_id) > 0),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create function reject_security_audit_event_mutation() returns trigger
language plpgsql
as $$
begin
  raise exception 'security audit events are append-only';
end;
$$;

create trigger security_audit_events_append_only
before update or delete on security_audit_events
for each row execute function reject_security_audit_event_mutation();
