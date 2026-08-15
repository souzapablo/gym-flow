# User Identity
> Persisted, role-neutral identity boundary prepared for future ABAC

Model: `src/lib/user.ts`
Persistence: `src/data/users.ts:findUserById()` and `migrations/002_users.sql`
Current identity: `src/lib/owner.ts:getCurrentUser()` resolves the seeded `local-user`

- Users intentionally have no role or user type yet; all users currently have the same capabilities.
- Workouts and sessions retain `owner_id` as a resource relationship that future ABAC policies can evaluate.
- Server Actions resolve the current user on the server and never accept a user ID from the client.
- Replace the implementation of `getCurrentUser()` when an authentication provider is selected.

Updated: 2026-08-15
