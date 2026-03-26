# 2020RM-frontend

Remix + Chakra UI frontend with Express BFF for Microsoft OIDC and `/api/*` proxy.

- Auth/OIDC + proxy: `src/app.js`
- Remix app (UI): `app/`
- Server: `src/server.js`
- Design: `../2020-Design/phase1/auth-replan.md`
- Search UI: `/organizations` and `/people` proxy to backend REST search endpoints
- Detail UI: `/organization/:uuid` and `/person/:uuid` load singular records through the frontend BFF
- Admin data UI: `/admin/data` is a full-page list and `/admin/data/:id` is a dedicated full-page editor backed by `/api/rest/admin/data`, with a global loading overlay for route changes and saves

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
