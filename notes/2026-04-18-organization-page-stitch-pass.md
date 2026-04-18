# 2026-04-18 Organization Page Stitch Pass

## Goal

Reshape the organization detail page to match the new stitch mockups for the
organization-local header and tab content while keeping the existing CRM app
shell in place.

## What Changed

- Expanded the organization detail route from a two-tab `info/people` layout
  into a static local header plus stitched tabs for:
  - overview
  - contacts
  - jobs
  - outreach
  - similar organizations
  - locations
  - notes
- Kept the existing `/organization/:uuid/people` URL segment for the Contacts
  tab so existing links continue to work while the visible tab label matches the
  mockup.
- Added a shared organization-detail tab config and path builder so the route
  tree, navigation state, and tests all use one source of truth.
- Added new organization detail view-model helpers so header, overview, and
  locations can mix live data with neutral placeholders instead of leaving large
  sections empty.
- Replaced the old organization detail shell with a dedicated stitched layout:
  - static organization header
  - tab bar
  - overview summary cards
  - contacts directory table
  - placeholder jobs/outreach/similar-organizations/notes panels
  - live locations cards with neutral headcount placeholders

## Visual Verification

- Added fixture-backed organization detail and organization people responses to
  the local Playwright harness.
- Added `e2e/organization-detail.spec.js` with overview and contacts snapshots
  targeted at the organization-local page content rather than the full CRM
  shell.

## Validation

- `npm test`
- `npm run build`
- `npx playwright test e2e/organization-detail.spec.js --update-snapshots`

## Notes

- The CRM sidebar and global top header were intentionally left alone.
- Several stitched tabs still use clearly-labeled placeholder values because the
  backing data sources are not wired yet. This was intentional for this pass.
