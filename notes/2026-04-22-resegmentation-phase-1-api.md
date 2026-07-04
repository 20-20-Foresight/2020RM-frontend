# 2026-04-22 Resegmentation Phase 1 API

## Summary

- Replaced the old resegmentation API draft with a phase-based implementation
  plan and then implemented the matching production route and backend RPC.
- Scoped phase 1 to seeded organization lists plus a single dry-run/apply
  resegmentation RPC.
- Disabled list import in both the design mock and the production tool and
  labeled it as phase 2.

## Updated Contracts

- Single-org search should use `entity/findOrganization`.
- Current organization state should load from `entity/exportOrganization`.
- List browse should use `entity/findList` filtered to
  `listTypeSlug = 'LIST'`, `listSubTypeSlug = 'ORGANIZATION'`,
  `subjectType = 'organization'`.
- Selected list membership should load from `entity/getListDetail`.
- New backend work now centers on one action:
  `entity/resegmentOrganization` with `dryRun: true|false`.

## Seed Data

- Added backend seed SQL at
  `backend-v3.11/sql/2026-04-22-resegmentation-test-lists.sql`.
- The script creates:
  - `Resegmentation Test - Rose Organizations`
  - `Resegmentation Test - Builders Organizations`
- Membership is built from active organizations whose names match the requested
  `ILIKE` patterns.

## Implemented UI

- `/tools/resegmentation` now uses normalized `2020RM-backend` REST routes
  through the Remix BFF; `2020RM-backend` owns the live upstream RPC calls.
- Single-org mode searches with `entity/findOrganization`, hydrates the selected
  organization with `entity/exportOrganization`, and previews/applies through
  `entity/resegmentOrganization`.
- List mode loads seeded organization lists through `entity/findList` and
  `entity/getListDetail`, then runs row-level preview/apply calls with the same
  resegmentation RPC.

## Open Follow-Up

- Architecture correction: the frontend must not call any non-2020RM backend
  service directly. All resegmentation data access must go through
  `2020RM-backend` API routes, even when `2020RM-backend` delegates to the
  upstream RPC service internally.
- `2020RM-backend` is also the normalization boundary. The frontend should
  receive UI-friendly REST responses from `2020RM-backend`, not raw RPC
  envelopes, raw RPC status fields, or upstream action-specific result shapes.
- Implemented frontend calls now use `/api/rest/resegmentation/*` routes:
  lists, list detail, organization search/detail, and organization segment
  preview/apply.
- Phase 2 still needs CSV/XLSX import design and backend ingestion support.
- The current apply flow stages Salesforce account updates when requested; it
  does not do a direct synchronous Salesforce write inside the RPC call.
