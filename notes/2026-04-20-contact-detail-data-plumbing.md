# 2026-04-20 Contact Detail Data Plumbing

## Summary

- Updated the entity-detail loader to preserve `relationships` and `workHistory` alongside `record`, `locations`, `meta`, and `schema`.
- Updated the contact header to hide missing email and phone fields instead of rendering pending placeholders.
- Expanded the person detail view model to:
  - honor `metadata.positionlevel`, `metadata.positionLevel`, `positionlevel`, and `positionLevel`
  - normalize `metadata.skills` from string, array, and object shapes
  - prefer relationship-derived employer/company data when the record does not already expose it
  - prefer the backend-provided `workHistory` payload before falling back to relationship-derived work history
  - distinguish home and office labels by relationship type and subject

## Why

- The stitched contact page needed to consume the broader person-detail payload from the backend so the UI can reflect more of the real record without waiting on full feature wiring.

## Verification

- `node --test test/entity-detail.server.test.js test/person-detail-view.test.js`
- `npm run build`
