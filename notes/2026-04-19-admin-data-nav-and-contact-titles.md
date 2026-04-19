# 2026-04-19 Admin Data Nav And Contact Titles

## Goal
- Move `Data` out of the `Admin` submenu and expose it as its own top-level
  shell item.
- Stop the `contact titles` document from rendering through the segmentation
  editor heuristics.

## Status
- Branch `admin-data-nav-and-contact-titles` created from `v3.11`.

## Changes
- Moved `Data` into its own top-level navigation item while keeping
  `User Management` under `Admin`.
- Tightened sidebar active-state matching so `Admin` does not stay highlighted
  when the current route belongs to the separate top-level `Data` section.
- Restricted the segmentation editor auto-detection to documents whose
  persisted type is explicitly `segmentation`.
- Updated the generic admin-data loader/editor to treat wrapped crosswalk
  maps-of-objects as keyed object tables, preserving the `crosswalk` wrapper on
  save.
- Added a document-specific display label so `crm.data:contact titles` renders
  its first column as `contact title`.

## Testing
- `node --test test/navigation.test.js`
- `node --test test/segmentation-default-editor.test.js`
- `node --test test/admin-data.server.test.js`
- `npm run build`
