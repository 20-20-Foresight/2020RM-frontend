# 2026-03-27 SIF Editor

## Summary

The frontend now exposes a dedicated admin segmentation workflow backed by the
authoritative SIF taxonomy document stored at `crm.data.taxonomy:sif`.

## Changes

- Added a new `Admin > Segmentation` navigation entry.
- Added `/admin/segmentation` as the landing page for segmentation admin tasks.
- Added route-driven SIF editors for:
  - `/admin/segmentation/sectors`
  - `/admin/segmentation/:sectorSlug/industries`
  - `/admin/segmentation/:sectorSlug/:industrySlug/focuses`
- Built the editor against the backend-authored hierarchical taxonomy shape
  from `/Users/dmorgan/Projects/backend/docs/design/sif-taxonomy.document.json`
  rather than inventing a frontend-only document format.
- Added raw admin-data load/save helpers so the SIF editor can persist the full
  hierarchical document directly instead of forcing it through the generic
  table-editor adapter.
- Added an IndexedDB-backed SIF cache plus app-shell sync so the web app keeps
  the taxonomy locally available for reuse in other UI areas.

## Data Contract Notes

- The frontend targets `crm.data.taxonomy:sif` directly, matching the backend
  design documentation.
- The editor preserves existing `id` and `slug` values when labels change.
- New nodes generate ids using the backend naming pattern:
  - sector: `sector:<slug>`
  - industry: `industry:<sectorSlug>:<slug>`
  - focus: `focus:<sectorSlug>:<industrySlug>:<slug>`
- Top-level `stats` are recalculated from the live hierarchy on every edit or
  add so counts stay aligned with the saved document.

## Verification

- `npm test`
- `npm run build`
