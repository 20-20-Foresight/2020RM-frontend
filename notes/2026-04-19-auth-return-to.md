# 2026-04-19 Auth Return-To Preservation

## Goal

Preserve the requested CRM page across sign-in so deep links and expired-session
recoveries do not dump the user back onto `/dashboard`.

## What Changed

- Added `src/auth/return-to.js` to centralize safe `returnTo` validation and
  signin/login URL building.
- Updated the Express page-auth guard in `src/app.js` to redirect unauthenticated
  page requests to `/signin?returnTo=...`.
- Updated `/auth/login` to store a normalized `returnTo` value in the auth
  session state, and updated the OAuth callback to redirect there after a
  successful Microsoft sign-in instead of always redirecting to `/dashboard`.
- Updated the Remix app-shell loader path so `/api/meta` `401` responses now
  redirect to signin with the current pathname and query preserved.
- Updated both sign-in UIs:
  - `app/routes/signin.jsx`
  - `public/signin.html`
  so the Microsoft sign-in link forwards any `returnTo` query string through to
  `/auth/login`.

## Safety Notes

- `returnTo` only accepts app-relative paths.
- External URLs, protocol-relative URLs, and auth routes like `/signin` or
  `/auth/callback` fall back to `/dashboard` to avoid open redirects and auth
  loops.

## Validation

- `test/auth-return-to.test.js`
- `test/session-meta.server.test.js`
