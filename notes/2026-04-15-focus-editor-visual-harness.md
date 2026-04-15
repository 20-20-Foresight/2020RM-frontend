# 2026-04-15 Focus Editor Visual Harness

## Goal

Add one repeatable browser-level check for the Focus category editor so UI
changes can be verified against the real authenticated shell route before the
user becomes the first integration test.

## What Was Added

- A new Playwright spec at `e2e/admin-data-category-editor.spec.js`
- Fixture-backed admin-data records for:
  - `crm.data:focus`
  - `crm.data:dimension-definitions`
- A fixture filter helper in `src/app.js` so local BFF responses respect the
  same basic `type` and `q` query parameters the real admin-data routes use
- A node test in `test/app-proxy.test.js` covering that fixture filtering
- A first visual baseline screenshot for the Focus category editor route

## What The Browser Test Proves

- The authenticated shell renders on the Focus editor route
- The Focus category cards render inside the real app shell
- Clicking `Edit` opens the inline editor card
- Toast UI mounts with a visible toolbar
- The editor is in WYSIWYG mode, with markdown mode hidden

## Commands

- `node --test test/app-proxy.test.js`
- `npm run test:e2e -- e2e/admin-data-category-editor.spec.js`
- `npx playwright test e2e/admin-data-category-editor.spec.js --update-snapshots`

## Why This Matters

Storybook is still useful for isolated component work, but it is no longer the
only proof point. This harness gives one route-level visual check tied to the
actual Remix shell, route loader chain, and Toast runtime behavior.
