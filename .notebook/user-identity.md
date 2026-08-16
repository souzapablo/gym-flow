# User Identity

> Better Auth verified global identity, separate from gym membership

Entry: `src/modules/identity/account/identity.ts:requireVerifiedIdentity()`
Provider adapter: `src/modules/identity/account/auth.ts`
Persistence: `migrations/003_gym_workspaces_memberships.sql` and `migrations/004_better_auth_core.sql`

- Stable text user ID survives verified email changes
- Normalized email uniqueness enforced in PostgreSQL
- Provider session types stop at the identity module boundary
- Server Actions resolve verified identity server-side; clients never supply trusted user IDs
- Gym roles and status live in memberships, not the global user

Updated: 2026-08-16
