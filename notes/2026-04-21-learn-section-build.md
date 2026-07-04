# Learn Section — Build Notes
**Date:** 2026-04-21

## Review outcome

No blockers in the design or implementation notes.

One implementation detail needed clarification:

- `permission: "recruiter"` is now evaluated from session personas (`recruiter`) and admin users inherit access through `admin_access.system.object_editing`

## Implemented

- Added `/learn` landing route and `/learn/:topicSlug` detail route
- Added server-side Learn loaders backed by `crm.learn:topics`
- Reused category admin-data documents through `buildCategoryViewModel`
- Filtered retired category rows from Learn detail pages
- Added the Learn nav item directly below Jobs in the shell
- Added backend seed SQL: [2026-04-21-learn-topics-config.sql](/Users/danmorgan/Projects/backend/sql/2026-04-21-learn-topics-config.sql)

## Fallback behavior

- If `crm.learn:topics` has not been seeded yet, `/learn` renders an empty-state card instead of throwing
- If a topic points at a missing category document, the topic route returns `404`
