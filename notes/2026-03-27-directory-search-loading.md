# 2026-03-27 Directory Search Loading

## Summary

People and organization searches should always show a blocking loading overlay
while a search navigation is in flight.

## Changes

- Added a small directory-search loading helper so search pages can detect
  same-route GET search navigations directly.
- Extracted the blocking loading UI into a shared component.
- Search list pages now render their own blocking overlay while searching, in
  the page content area instead of taking over the full viewport.
- The app shell no longer renders its full-screen overlay for same-route
  organization and people searches.

## Why

- The app-level overlay is route-oriented.
- Directory searches are same-route navigations with query-string changes, so
  the most reliable behavior is to let the search page itself render the modal
  whenever its own search request is active.
