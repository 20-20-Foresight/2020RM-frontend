# 2026-04-22 Search Feeds API Wiring

## Summary
- Replaced the production search-feeds page mock wiring with real backend calls through the frontend BFF.
- Kept the design route on mock fixture data so `/design/settings-feeds` still works without the live backend.

## Implemented
- `app/models/feeds.server.js` now calls `/api/rest/feeds` for list/get/create/update/delete and enabled toggles.
- `/settings/feeds` loaders/actions now use the real feed API helpers.
- `/settings/feeds/:feedId` now loads real feed detail and performs live update/delete actions.
- `/settings/feeds/new` now creates feeds through the live backend.
- Finalized form-intent handling so delete submits do not fall through to update and edit-page navigation continues to load correctly after the shared intent helper was introduced.

## Verification
- `node --test test/feed-form-intent.test.js test/feeds.server.test.js`
- `npm run build`
