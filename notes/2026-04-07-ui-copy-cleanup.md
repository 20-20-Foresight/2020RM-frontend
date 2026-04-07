# 2026-04-07 UI Copy Cleanup

## Summary

- Removed visible prototype-oriented copy from the sign-in experience.
- Kept the post-sign-in dashboard hint only as screen-reader text on the Remix sign-in route.
- Stripped `(Prototype placeholder)` suffixes from placeholder route descriptions that are still visible in the app shell.
- Restyled the sign-in page with a black background, centered ambient-video hero stripe, 2020 Foresight inverse logo, and a Microsoft button with the Windows mark.
- Reworked the authenticated shell with a black branded top bar, a 2020 Foresight header logo, a native account dropdown, and a collapsible icon-only sidebar mode.
- Removed additional visible helper copy from the dashboard and directory search pages.

## Verification

- Searched the Remix app, server, and static public assets for remaining UI-facing `prototype` copy before and after the patch.
- Verified the shell and sign-in changes with repeated `npm test` runs and a successful `npm run build`.
