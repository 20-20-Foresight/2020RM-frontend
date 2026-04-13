# 2026-04-08 Segmentation Dimensions CRM

## Goal

Start the CRM migration away from the SIF-specific segmentation admin model and
toward the new dimensions/categories/crosswalks structure.

## Completed In This Slice

- Created the `segmentation-dimensions-crm` branch.
- Replaced the segmentation workspace list model with three document-type
  buckets:
  - dimensions
  - categories
  - crosswalks
- Added frontend loaders for:
  - `type=dimension-definition`
  - `type=categories`
  - `type=segmentation`
- Added new frontend routes:
  - `/admin/segmentation/dimensions`
  - `/admin/segmentation/categories`
  - `/admin/segmentation/crosswalks`
- Redirected the old SIF route stack:
  - `/admin/segmentation`
  - `/admin/segmentation/sectors`
  - `/admin/segmentation/:sectorSlug/industries`
  - `/admin/segmentation/:sectorSlug/:industrySlug/focuses`
- Updated the Admin navigation labels to:
  - `Dimensions`
  - `Categories`
  - `Crosswalks`
- Replaced the old hard-coded crosswalk list component with a shared
  segmentation document list page.
- Replaced the crosswalk editor's SIF taxonomy loader with a category-document
  catalog loader for `Industry` and `Focus`.
- Updated the existing segmentation editor so:
  - `Industry` and `Focus` options come from category docs instead of SIF
  - the editor no longer assumes sector -> industry -> focus hierarchy
  - legacy `sector` remains editable as a compatibility field rather than a
    controlling taxonomy dimension
- Extended the segmentation editor row model to support scored multi-output
  targets:
  - `industries: [{ name, score }]`
  - `focuses: [{ name, score }]`
- Kept compatibility fields in saved documents so existing backend readers can
  still consume:
  - `industry`
  - `focus`
- Updated the row modal to let users add/remove multiple Industry and Focus
  outputs with scores, while the table summarizes those outputs inline.
- Added stable row ID round-tripping for segmentation rows so crosswalk rows can
  be referenced reliably in reason payloads and future CRM diff tooling.
- Added non-blocking incomplete-row UI treatment:
  - rows with no Industry and no Focus outputs are highlighted
  - the row modal explains they will be skipped by segmentation until completed
  - saves remain allowed so partial authoring workflows are preserved
- Added first-class custom editors for:
  - `dimension-definition` documents
  - `categories` documents
- Added document adapters for the new editors so they:
  - preserve existing wrapper shape when saving
  - generate stable IDs for new values
  - normalize examples as string arrays
  - preserve retired category values with `deletedOn`
- Added Industry-specific preference normalization driven by list order in the
  category editor.
- Added category editor behavior for:
  - retire/restore
  - hide retired by default
  - show retired on demand
  - dimension selection from the dimension-definition catalog
- Updated the organization detail segmentation section so it can render the new
  projection/reason contract:
  - consumes nested Industry/Focus projection values when present
  - keeps legacy segmentation fallback for compatibility
  - explanation modal now shows dimension, value, score, crosswalk, and rule
    instead of the old sector/industry/focus-only explanation table
- Confirmed the entity detail loader does not need a special adaptation layer
  for the new contract because it already passes the backend `record` payload
  through unchanged, including `entityDimensionProjection`.

## Verification

- `node --test test/segmentation-document.server.test.js test/navigation.test.js`
- `node --test test/dimension-definition-document.test.js`
- `node --test test/segmentation-category-document.test.js`
- `node --test test/segmentation-dimension-catalog.server.test.js`
- `node --test test/organization-segmentation.test.js`
- `node --test test/entity-detail.server.test.js test/organization-segmentation.test.js`
- `npm test`
- `npm run build`

## Remaining Frontend Follow-Up

- Remove the remaining SIF dependency from the segmentation rule editor detail
- route-adjacent helper surface and cache layer.
- Add category/dimension-aware custom editors instead of relying on the
  compatibility layer inside the old segmentation editor.
- Replace the remaining compatibility assumptions in the rule editor detail
  surface once the rest of the matcher document model is migrated.
- Add first-class row/document ID handling to the saved rule payload once the
  backend matcher readers stop depending on the compatibility projection.
- Add organization categorization/reasons UI backed by `entity_dimension`.

## 2026-04-08 Admin Data Consolidation

- Removed the dedicated `Dimensions`, `Categories`, and `Crosswalks` items from
  the admin navigation so `Data` is the primary editing entry point.
- Updated the Data page to:
  - show document `type`
  - sort by `type` and then `name`
  - support a magnifying-glass text filter
  - support a type dropdown filter
  - expose an explicit `Edit` action
- Converted the old segmentation list routes into redirects back to the Data
  page with the corresponding `type` filter preselected.
