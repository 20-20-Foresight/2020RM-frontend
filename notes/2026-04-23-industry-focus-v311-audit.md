# 2026-04-23 Industry/Focus CRM Audit

## Goal

Remove sector/SIF-era output from the live CRM organization detail segmentation view for the v3.11 flow.

## Changes

- Updated `app/models/organization-segmentation.js` so the organization segmentation view model no longer emits sector chips or sector-only explanation rows.
- Updated `app/components/OrganizationSegmentationSection.jsx` to render Industry and Focus only.
- Updated `test/organization-segmentation.test.js` to lock the view model to Industry/Focus-only behavior.
- Updated the segmentation default editor model save path so edited crosswalk
  documents no longer write `sector` back out.

## Verification

- `node --test test/segmentation-default-editor.test.js test/organization-segmentation.test.js`

## Remaining Work

- The admin segmentation editor still reads legacy `sector` values so old rows
  can load, but it no longer exposes or saves sector output.
- The old SIF taxonomy route/model shims still need separate retirement.
