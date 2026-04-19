## Context

- The organization header was showing the RPC success text
  `Organization export loaded successfully.`
- Some organization records rendered the phone value as `[object Object]`
  because `metadata.phone` can arrive as a structured object instead of a flat
  string.

## Changes

- Removed the organization-detail success text from the header shell.
- Added phone normalization in `organization-detail-view` so the header now
  supports:
  - flat string phone values
  - `{ phone, ext }` objects
  - grouped objects such as `{ work, mobile, home, other }`
- Added regression coverage for object-based phone payloads.

## Verification

- `node --test test/organization-detail-view.test.js`
- `npm run build`
