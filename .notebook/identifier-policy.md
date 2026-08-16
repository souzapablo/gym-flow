# Identifier policy

All application and persisted entity IDs are UUIDv7. PostgreSQL 18 owns persisted ID generation through `uuidv7()` defaults, while browser-only draft IDs use `src/lib/uuid.ts:createUuidV7()`.

## Boundaries

- Database types, defaults, and UUID-version checks: `src/db/schema.ts` and `migrations/006_uuidv7_identifiers.sql`
- Better Auth delegates record ID generation to PostgreSQL: `src/modules/identity/account/auth.ts:createGymFlowAuth()`
- Server Action and domain ID validation: `src/lib/workout-validation.ts` and `src/modules/gym-access/membership/identifiers.ts`
- OAuth account identifiers, session tokens, HTML IDs, and test-suite correlation IDs are external or protocol identifiers, not application entity IDs.

## Migration note

`migrations/006_uuidv7_identifiers.sql` truncates existing application data before converting identity columns from text to UUID. This was chosen because production was confirmed empty; replace it with a relationship-preserving remap before deployment if that assumption changes.
