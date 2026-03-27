# 2026-03-27 Directory Search Loading

## Summary

People and organization searches should always show a blocking loading overlay
while a search navigation is in flight.

## Changes

- Added a small directory-search loading helper so search pages can detect
  same-route GET search navigations directly.
- Extracted the blocking loading UI into a shared component.
- Search list pages now render their own blocking overlay while searching, in
  addition to the app-level route overlay.

## Why

- The app-level overlay is route-oriented.
- Directory searches are same-route navigations with query-string changes, so
  the most reliable behavior is to let the search page itself render the modal
  whenever its own search request is active.
