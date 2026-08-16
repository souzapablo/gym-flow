alter table memberships drop constraint memberships_role_check;

update memberships set role = 'trainee' where role = 'member';

alter table memberships add constraint memberships_role_check
  check (role in ('owner', 'admin', 'coach', 'trainee'));
