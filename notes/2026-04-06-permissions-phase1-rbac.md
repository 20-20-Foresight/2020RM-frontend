# 2026-04-06 Permissions Phase 1 RBAC

## Scope

Wire the frontend shell to the richer backend access-state contract and replace
the user-management placeholder with real access-control data loading.

## Changes

- added a session-meta loader for `/api/meta`
- added a blocked-user page with a retry action
- updated the authenticated app shell to:
  - render the blocked page when access is pending
  - pass full session meta into the layout
  - hide admin navigation entries when the current session lacks admin access
- replaced the user-management placeholder with a data-backed page that loads
  role and user lists from `/api/admin/access/*`

## Verification

- `node --test test/session-meta.server.test.js test/access-control.server.test.js test/navigation.test.js`

## Notes

- The user-management page is read-only in this slice. Mutation forms for role
  assignment and person linking can build on the new backend routes next.
