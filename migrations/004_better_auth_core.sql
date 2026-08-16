alter table users add column image text;

create or replace function protect_gym_ownership() returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'gyms' then
    if tg_op = 'UPDATE'
       and new.owner_user_id is distinct from old.owner_user_id then
      raise exception 'gym ownership is immutable';
    end if;
  elsif tg_table_name = 'memberships' then
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

create function normalize_user_email() returns trigger
language plpgsql
as $$
begin
  new.email = btrim(new.email);
  new.email_normalized = lower(new.email);
  return new;
end;
$$;

create trigger users_normalize_email_before_write
before insert or update of email on users
for each row execute function normalize_user_email();

create table sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_user_id_idx on sessions(user_id);

create table accounts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  account_id text not null,
  provider_id text not null,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  id_token text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_user_id_idx on accounts(user_id);
create unique index accounts_provider_account_idx
  on accounts(provider_id, account_id);

create table verifications (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verifications_identifier_idx on verifications(identifier);
