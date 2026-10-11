# Legacy Parent Functionality

Parent workflows are deprecated for the SIH SkillifyAI product. They are retained temporarily because the existing grievance, notification, and relationship code still references parent data.

## Removed from the main flow

- Parent is no longer offered in public role selection.
- New registration rejects the parent role.
- Login no longer routes new users to a parent dashboard.
- Parent is not included in the primary learner, trainer, or administrator navigation.

## Retained for compatibility

- `routes/parentRoutes.js`
- `controllers/parentMaterial.js`
- `frontend/app/parent/**`
- `frontend/components/parent/**`
- Parent relationship fields in `models/User.js`
- Parent escalation fields in `models/Grievance.js`
- Parent notification and grievance branches

These legacy paths should be removed only after dependent grievance and notification flows are retired or migrated.
