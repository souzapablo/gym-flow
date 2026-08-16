# Coach-Trainee Assignments Context

**Gathered:** 2026-08-16
**Spec:** `.specs/features/0005-coach-trainee-assignments/spec.md`
**Status:** Ready for design

## Feature Boundary

This slice creates and governs many-to-many coach-trainee relationships inside one gym.

## Implementation Decisions

- A trainee may have multiple coaches in one gym.
- Owners and admins manage assignments; coaches cannot assign themselves.
- A small gym may grant a trusted coach the admin role when assignment authority is needed.
- Suspension preserves but disables assignments; reactivation restores them.
- Removal and incompatible role changes end assignments permanently while preserving history.
- Coaches see assigned trainees' basic identity and gym-specific training information only.

### Agent's Discretion

- Choose active-versus-ended persistence details while preserving history and uniqueness.

### Declined / Undiscussed Gray Areas → Assumptions

- None.

## Specific References

- Assignment scope never crosses gyms.

## Deferred Ideas

- Trainee or coach self-service assignment requests.
