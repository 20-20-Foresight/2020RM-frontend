# 2026-04-27 Resegmentation Import UI

- Wired the reusable `ImportListDrawer` into the live resegmentation page.
- Added a `ResegmentationImportDrawer` bridge component that:
  - parses CSV/XLSX in-browser
  - auto-runs backend lookup after file parse and mapping changes
  - imports matched rows into a real resegmentation list
  - auto-selects the new list after import
- Kept the flyout hard-capped at `100` rows for this first interactive path.
- Added pure helper coverage for:
  - lookup request shaping
  - lookup result merge
  - commit request shaping
