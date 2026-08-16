# Gym Workout Assignments Context

**Gathered:** 2026-08-16
**Spec:** `.specs/features/0006-gym-workout-assignments/spec.md`
**Status:** Ready for design

## Feature Boundary

This slice introduces the gym-owned shared template library, trainee workout assignments, role-aware editing, completed sessions, and history preservation.

## Implementation Decisions

- Gym owns templates, assignments, sessions, and history; creator identity is attribution.
- All active coaches view and reuse gym templates.
- Coaches edit their templates; owners and admins edit every gym template.
- Owners/admins assign any active trainee; coaches assign only effectively assigned trainees.
- Trainees complete their assignments and view their own history without creating templates or assignments.
- Sessions store both trainee and recording user.

### Agent's Discretion

- Choose the exact assignment activation model and template reuse interaction.

### Declined / Undiscussed Gray Areas → Assumptions

- Template deletion is excluded; records are preserved in this slice.

## Specific References

- The gym is the commercial customer and owns training data produced in its workspace.

## Deferred Ideas

- Personal coach library, cross-gym reuse, history export, and aggregation.
