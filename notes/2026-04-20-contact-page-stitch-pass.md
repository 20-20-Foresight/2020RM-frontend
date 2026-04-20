# 2026-04-20 Contact Page Stitch Pass

## Goal

Reshape the contact detail page to match the new stitch mockups for the
contact-local header and tabbed content while keeping the existing CRM app
shell in place.

## What Changed

- Replaced the generic `/person/:uuid` detail page with a stitched local header
  and tabbed contact detail layout.
- Added contact detail tabs inferred from the stitch folder set:
  - overview
  - lists
  - similar contacts
  - notes
- Added contact-specific tab config, tab-path builders, and inline loading state
  helpers so the route tree, navigation state, and tests all use one source of
  truth.
- Added a dedicated contact detail view-model layer so obvious live fields
  such as title, company, email, phone, LinkedIn, summary, and office location
  populate from the current detail payload while unsupported sections fall back
  to stitched placeholder content.
- Extended the local fixture-backed visual harness with a person detail fixture
  and a Playwright contact-detail spec plus snapshots.
- Updated the README to document the new stitched contact detail routes and
  visual verification coverage.

## Visual Verification

- Added `test/fixtures/person-detail.dashboard.json` for fixture-backed contact
  detail rendering in the local dashboard harness.
- Added `e2e/contact-detail.spec.js` with overview and similar-contacts
  snapshots, plus route assertions for the lists and notes tabs.

## Validation

- `node --test test/entity-detail.server.test.js test/person-detail-tabs.test.js test/app-loading-state.test.js`
- `npm test`
- `npm run build`
- `npx playwright test e2e/contact-detail.spec.js --update-snapshots`

## Notes

- The CRM shell remains unchanged; this pass only updates the contact-local
  detail experience.
- Lists, similar contacts, and notes remain intentionally placeholder-backed
  until their data sources are wired in a later pass.
