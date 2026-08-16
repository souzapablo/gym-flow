# Gym Access Flow

> Verified identity resolves one active membership before gym-scoped work

Entry: `src/modules/gym-access/index.ts`
Flow: verified identity → active membership resolution → `GymContextDto` → training operation

Provisioning: `src/modules/gym-access/gym/provision-gym.ts:provisionGym()`

- One transaction creates gym, immutable active owner membership, and audit event
- Audit failure rolls back all provisioning records

Context: `src/modules/gym-access/active-gym/active-gym.ts`

- One active membership auto-selects and persists
- Multiple active memberships require explicit selection
- Stale selection clears; malformed, unknown, unauthorized, or inactive selection is non-disclosing

UI: `src/components/gym-selector.tsx:GymSelector()`
Audit: `src/modules/audit/security-event/security-event.ts`

Updated: 2026-08-16
