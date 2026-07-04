# Contacts Search API

This document describes the backend API needs for the People Search page
(`/people/advanced-search`). The page is currently implemented with mock data
and static dropdowns. These endpoints need to be wired up before the page is
production-ready.

---

## 1. Contact Search

**Route loader**: `app/routes/_app.people.advanced-search.jsx`

### Request

```
GET /api/contacts/search
```

| Query param            | Type     | Description                                                  |
|------------------------|----------|--------------------------------------------------------------|
| `q`                    | string   | Basic keyword / name search (simple mode)                    |
| `keyword`              | string   | Full-text keyword filter (advanced mode)                     |
| `industry`             | string   | Company industry slug (from SIF taxonomy)                    |
| `focus`                | string   | Company focus slug (from SIF taxonomy)                       |
| `skills`               | string   | Comma-separated skill keywords                               |
| `city`                 | string   | City                                                         |
| `stateProvince`        | string   | State or province                                            |
| `country`              | string   | Country                                                      |
| `positionLevel`        | string   | One of: `c-suite`, `executive`, `mid-senior`, `manager`, `other` |
| `title`                | string   | Job title (partial match)                                    |
| `lastContacted`        | string   | ISO 8601 date — contacts last contacted on or after this date |
| `lastResponded`        | string   | ISO 8601 date — contacts who last responded on or after this date |
| `eligibleForCampaigns` | boolean  | Filter to campaign-eligible contacts only (default: `true`)  |
| `createdDate`          | string   | ISO 8601 date — contacts created on or after this date       |
| `page`                 | integer  | Pagination offset (default: 1)                               |
| `limit`                | integer  | Page size (default: 25, max: 100)                            |

### Response

```jsonc
{
  "results": [
    {
      "id": "person:abc123",
      "name": "Alexandra Chen",
      "title": "Chief Investment Officer",
      "company": {
        "id": "org:xyz789",
        "name": "Meridian Capital Partners"
      },
      "location": {
        "city": "New York",
        "stateProvince": "NY",
        "country": "US"
      },
      "skills": ["Private Equity", "Portfolio Management", "M&A"],
      "email": "a.chen@meridian.com",
      "positionLevel": "c-suite",
      "lastContacted": "2026-04-18T00:00:00Z",
      "lastResponded": "2026-04-10T00:00:00Z",
      "eligibleForCampaigns": true,
      "createdAt": "2024-01-15T09:30:00Z"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 25
}
```

---

## 2. Recently Viewed Contacts

Used to populate the "Recently Viewed" grid below the search form.

### Request

```
GET /api/contacts/recently-viewed
```

| Query param | Type    | Description                   |
|-------------|---------|-------------------------------|
| `limit`     | integer | Max results to return (default: 9, max: 20) |

### Response

Same shape as a search result item above, but ordered by the current user's
last view timestamp (most recent first).

The server should derive this from the user's session / activity log — the
frontend does not send any view events explicitly.

---

## 3. Industry & Focus Options (SIF Taxonomy)

Used to populate the Industry and Focus dropdowns in Advanced Search.

Currently the route uses static mock arrays. The real implementation should
read from the live SIF taxonomy document.

### Suggested loader approach

```js
// In the route loader:
import { loadSifTaxonomyDocument } from "../models/sif-taxonomy.server";

const doc = await loadSifTaxonomyDocument({ request });

const industries = doc.sectors.flatMap(sector =>
  sector.industries.map(ind => ({
    value: ind.slug,
    label: ind.label
  }))
);

const focuses = doc.sectors.flatMap(sector =>
  sector.industries.flatMap(ind =>
    ind.focuses.map(foc => ({
      value: foc.slug,
      label: foc.label,
      industrySlug: ind.slug
    }))
  )
);
```

**Note**: When an industry is selected, the focus dropdown should ideally be
filtered to only show focuses that belong to that industry. This requires
either client-side filtering (pass the full taxonomy to the client) or a
separate API call when the industry selection changes.

---

## 4. Contact Card Data (Recently Viewed)

Each contact card in the grid displays:

| Field                  | Source                                     |
|------------------------|--------------------------------------------|
| Name                   | `name` or `metadata.fullname`              |
| Title                  | `metadata.title` or `metadata.jobtitle`    |
| Company name           | linked organization `name`                 |
| Location               | city + state/country from contact metadata |
| Skills (up to 3 tags)  | `metadata.skills[]`                        |
| Last contacted date    | from CRM activity log                      |
| Email                  | `metadata.primaryemail` or first available |
| Eligible for campaigns | campaign eligibility flag on contact       |

---

## 5. Future Enhancements

- **Focus cascade**: filter focus options based on selected industry
- **Saved searches**: persist advanced filter sets per user
- **Search history**: separate from recently viewed, tracks search queries
- **Bulk actions**: from search results (add to list, start campaign, etc.)
