# 2026-04-14 Dashboard Visual Harness

## Goal

Establish one repeatable way to render the authenticated CRM shell locally
before making more UI changes.

## What Was Added

- `SESSION_META_FIXTURE_PATH` support in `app/models/session-meta.server.js`
  so the Remix server can load a deterministic session-meta payload from disk
  during local visual tests.
- A Playwright config at `playwright.config.cjs` that:
  - runs against `/dashboard`
  - builds the app before launching
  - starts the frontend with:
    - `AUTH_ENABLED=false`
    - `SESSION_META_FIXTURE_PATH=test/fixtures/session-meta.dashboard.json`
  - writes transient browser artifacts under `.store/playwright-results`
- A dashboard shell browser test at `e2e/dashboard-shell.spec.js`
- A first baseline screenshot for the authenticated shell

## Commands

- `npm test`
- `npm run test:e2e`
- `npm run test:e2e:update`

## Intent

This harness is meant to answer one question before any more UI work:

"Does the authenticated dashboard shell still look the way we expect?"

It avoids live Microsoft auth and avoids depending on the real backend session
payload while still exercising the real Remix shell route.
