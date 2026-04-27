# 2026-04-27 Import Drawer Storybook

## Scope

- Build a Storybook proof for a reusable import drawer shell.
- Validate the browser-side component architecture for upload, mapping, lookup,
  review, and import summary states.
- Confirm whether frontend file parsing support needs a new library.

## Inputs

- `backend-v3.11/docs/3.11/3.11-import-resegment.md`
- `app/routes/_app.design.tools-resegmentation.jsx`
- existing Storybook stories under `app/components/ui`

## Decisions In Scope

- Use resegmentation organization import as the first concrete adapter for the
  reusable drawer.
- Hard cap this flyout to `100` rows via `maxRows`.
- Support mapped identity fields for the resegmentation adapter:
  - organization UUID
  - organization name
  - location
  - LinkedIn URL
  - website/domain
- Preserve row order.
- Allow unmatched source columns to be ignored or saved as membership metadata
  later.
