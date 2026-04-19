# 2020RM-frontend

Remix + Chakra UI frontend with Express BFF for Microsoft OIDC and `/api/*` proxy.

- Auth/OIDC + proxy: `src/app.js`
- Unauthenticated deep links now preserve the requested in-app path through `/signin`, `/auth/login`, and the Microsoft callback so users return to the page they originally requested after auth when possible
- Remix app (UI): `app/`
- Server: `src/server.js`
- Design: `../2020-Design/phase1/auth-replan.md`
- Search UI: `/organizations` and `/people` proxy to backend REST search endpoints
- Detail UI: `/organization/:uuid`, `/organization/:uuid/people`, `/organization/:uuid/jobs`, `/organization/:uuid/outreach`, `/organization/:uuid/similar-organizations`, `/organization/:uuid/locations`, `/organization/:uuid/notes`, and `/person/:uuid` load singular records through the frontend BFF, with the organization page now using a static local header plus stitched overview/contacts/jobs/outreach/similar-organizations/locations/notes tabs, mixing live detail fields with neutral placeholder values where backend data is not available yet
- Admin data UI: `/admin/data` is a full-page list and `/admin/data/:id` is a dedicated full-page editor backed by `/api/rest/admin/data`, with `segmentation.default` documents switching into a modal-driven tree editor that uses header filter chips, metadata editing, and row edit dialogs, plus a global loading overlay for route changes and saves
- Session meta/UI access state: the app shell now consumes the richer `/api/meta` payload so blocked users see an access-pending page and the sidebar hides admin areas the session cannot use
- Branded shell/sign-in UI: the sign-in screen now uses a black ambient-video hero with 2020 Foresight branding, and the authenticated shell uses a black top bar, a branded collapsible sidebar, and an account dropdown in the header
- Admin user management UI: `/admin/user-management` now loads the access-control role catalog and user list through `/api/admin/access/*`
- Admin segmentation UI: the Admin nav now exposes `/admin/segmentation/dimensions`, `/admin/segmentation/categories`, and `/admin/segmentation/crosswalks`, each backed by the generic admin-data editor routes under `/admin/data/:id`
- Legacy SIF routes now redirect into the new dimensions/categories workspace while the remaining rule-editor internals are migrated off the old taxonomy model

## Run (dev)

1. Create `.env` from `.env.sample` (do not commit `.env`).
2. Install deps: `npm install`
3. Dev server (Remix + Express): `npm run dev` (hot reload; Express reloads Remix build per request)
4. Visit `http://localhost:3000/signin`

## Build / Start (prod-ish)

1. `npm run build`
2. `npm start`

Notes:
- `.env` is auto-loaded via `dotenv`.
- `npm run dev` pins the internal Remix dev server to port `8002` so it does not collide with the backend default port `3001`.
- The Express BFF still serves the app on `http://localhost:3000`.

## UI Verification

- `npm run test:e2e` runs the Playwright browser harness against a deterministic local shell with auth disabled and fixture-backed admin-data responses.
- `e2e/dashboard-shell.spec.js` covers the authenticated shell and admin-data list navigation.
- `e2e/admin-data-category-editor.spec.js` covers the Focus category editor route, including the inline card layout and the Toast rich text editor in WYSIWYG mode.
- `e2e/organization-detail.spec.js` covers the stitched organization overview and contacts tabs with fixture-backed organization detail and related-people responses.
- `npm run test:e2e:update` refreshes visual baselines when an intentional UI change lands.
