# 2026-03-26 Entity Detail Pages

## Summary

Added direct detail pages for organizations and people at singular routes:

- `/organization/:uuid`
- `/person/:uuid`

The list pages now link each result name to its detail route.

## Page Structure

Both detail pages share the same layout:

- Header with the entity name as the `h1`
- A `highlights` field section rendered as cards instead of a table
- A two-column body with an info tab on the left and locations on the right

Current highlight fields:

- Organization: LinkedIn, website
- Person: LinkedIn, email

Current info tab content:

- Description

Current sidebar content:

- Related locations returned by the backend REST detail endpoint

## Data Flow

- Remix loaders call the frontend BFF at `/api/rest/organization/:uuid` and `/api/rest/person/:uuid`
- The backend detail REST endpoints load one exported entity, schema metadata, and related locations from the RPC service

## Loading States

- Entity searches now show route-aware loading copy in the shared app overlay
- Organization detail navigations show `Loading organization...`
- Person detail navigations show `Loading person...`
