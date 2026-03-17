# 2026-03-17 UI REST Search

## Summary

Added basic search interfaces to the Organizations and People list views.

## Behavior

- Both pages use a GET form with a single `name` field.
- Searches go through the frontend BFF to `/api/rest/organization` and `/api/rest/person`.
- The UI currently renders only the returned `name` values.

## Scope

- This is intentionally minimal and aligned with the current upstream RPC capability, which only supports name search.
