# Resegmentation Tool — Implementation Documentation

## Overview

The Resegmentation Tool allows CRM users to re-run organization segmentation on demand. It operates in two modes: **single organization** (search, segment, review, apply) and **list of organizations** (bulk flow, row-by-row execution).

The frontend mock lives at `/design/tools-resegmentation`. The production route is at `/tools/resegmentation`.

---

## Expected API Endpoints

### Organization Search

```
GET /api/organizations/search
  ?q=<string>          – partial name match (min 1 char)
  &limit=20            – results cap

Response 200:
[
  {
    "uuid": "abc-123",
    "name": "Acme Corp",
    "currentIndustry": "Manufacturing",
    "currentFocus": "Industrial B2B"
  },
  ...
]
```

Used by the Single Organization tab autocomplete dropdown.

---

### Get Current Segmentation for an Org

```
GET /api/organizations/:uuid/segmentation

Response 200:
{
  "uuid": "abc-123",
  "name": "Acme Corp",
  "segmentation": {
    "sector": "Technology",
    "industry": ["Manufacturing"],
    "focus": ["Industrial B2B"],
    "emIndustry": "Industrial Manufacturing"
  }
}
```

Loaded when the user selects an org — populates the "Current Segments" panel.

---

### Run Segmentation (Single Org)

```
POST /api/organizations/:uuid/segmentation/run

Response 200:
{
  "uuid": "abc-123",
  "name": "Acme Corp",
  "original": {
    "industry": "Manufacturing",
    "focus": "Industrial B2B"
  },
  "proposed": {
    "sector": "Technology",
    "industry": ["Industrial Technology"],
    "focus": ["B2B SaaS"]
  },
  "reasons": [
    {
      "source": "website_content",
      "sector": "Technology",
      "industry": "Industrial Technology",
      "focus": "B2B SaaS",
      "reason": "Homepage describes a B2B SaaS platform..."
    }
  ],
  "emIndustry": {
    "calculatedEMIndustry": "Industrial Technology",
    "calculatedEMIndustryLabel": "Industrial Technology",
    "selected": null,
    "selectedLabel": "Not set",
    "source": "segmentation",
    "sourceLabel": "Derived from segmentation",
    "usedSegmentationValue": null,
    "reason": "No prior Salesforce record found."
  }
}
```

Triggered by "Segment Now". Response shape mirrors the existing `orgSegmentation` fragment data structure (see `backend/src/business/reports/fragments/orgSegmentation`).

---

### Apply Segmentation (Single Org)

```
POST /api/organizations/:uuid/segmentation/apply

Body:
{
  "saveSalesforce": true | false
}

Response 200:
{
  "uuid": "abc-123",
  "applied": true,
  "salesforceRecordId": "0015X000..." | null
}
```

Triggered by the "Apply" button after modal confirmation. `saveSalesforce` corresponds to the checkbox in the apply modal.

---

### List Entities (TEST / organization)

```
GET /api/lists
  ?type=TEST
  &subtype=organization

Response 200:
[
  {
    "id": "list-uuid-1",
    "name": "Q4 2025 — Tech Prospects",
    "count": 12,
    "type": "TEST",
    "subtype": "organization",
    "createdAt": "2025-10-01T00:00:00Z"
  },
  ...
]
```

Used to populate the list dropdown in the "List of Organizations" tab. Filters to `list` entity type with `type=TEST` and `subtype=organization`.

---

### Get Organizations in a List

```
GET /api/lists/:listId/organizations

Response 200:
[
  {
    "id": "list-org-row-uuid",
    "organizationUuid": "abc-123",
    "name": "Acme Corp",
    "currentIndustry": "Manufacturing",
    "currentFocus": "Industrial B2B"
  },
  ...
]
```

Loaded when the user selects a list. Drives the bulk table rows.

---

### Upload a List

```
POST /api/lists/upload
Content-Type: multipart/form-data

Fields:
  file: CSV or XLSX
  type: "TEST"
  subtype: "organization"

Response 201:
{
  "id": "list-uuid-new",
  "name": "Uploaded List — 2025-04-21",
  "count": 34
}
```

Triggered by the "Upload List" button. Expected CSV columns: `organization_name`, `organization_uuid` (optional — used for matching if provided).

---

### Run Segmentation for One Org in a List

```
POST /api/lists/:listId/organizations/:rowId/segmentation/run

Response 200: (same shape as single-org /run response above)
```

Called one at a time when the user clicks "Segment" on a row, or sequentially when "Segment All" is clicked. The frontend queues them and fires them one at a time.

---

### Apply Segmentation for One Org in a List

```
POST /api/lists/:listId/organizations/:rowId/segmentation/apply

Body:
{
  "saveSalesforce": true | false
}

Response 200:
{
  "rowId": "list-org-row-uuid",
  "applied": true,
  "salesforceRecordId": "..." | null
}
```

---

## Frontend State Model

### Single Org Tab

| State | Type | Notes |
|---|---|---|
| `query` | string | Search box value |
| `selectedOrg` | object \| null | Chosen org from dropdown |
| `isSegmenting` | boolean | Shimmer shown while POST is in flight |
| `result` | object \| null | Proposed segments + reasons |
| `applied` | boolean | Whether Apply was confirmed |

### List Orgs Tab

| State | Type | Notes |
|---|---|---|
| `selectedListId` | string | Drives list org table |
| `segmentingIds` | Set\<string\> | Row IDs currently running segmentation |
| `results` | Map\<rowId → result\> | Per-row segmentation results |
| `applied` | Set\<rowId\> | Rows where Apply was confirmed |

---

## Segmentation Result Display

The "Proposed Segments" panel and "Segmentation Reasoning" table mirror the data produced by `backend/src/business/reports/fragments/orgSegmentation`. Key fields:

- `proposed.industry[]` — one or more industry tags (shown as green `Tag` components)
- `proposed.focus[]` — one or more focus tags
- `reasons[]` — table rows: Source · Sector · Industry · Focus · Reason (may contain highlighted quote spans)
- `emIndustry` — EM Industry decision block (source, calculated vs. selected, whether Salesforce value was used)

The Reasoning table should render reason text as HTML (use `dangerouslySetInnerHTML` for the highlighted `<span class="highlight">` markup that comes from the backend).

---

## Salesforce Integration

The "Save in Salesforce" checkbox in the Apply modal maps to `saveSalesforce: true` in the apply POST body. The backend writes to Salesforce using the existing Salesforce sync infrastructure. The frontend should reflect the saved Salesforce record ID in a success toast after apply.

---

## Navigation

- Tools section added to sidebar nav (`navigation.mjs`) between Marketing and Admin.
- Tools registry lives in `app/models/tools-config.mjs` — add entries here to surface new tools on the index page.
- Production route: `/tools/resegmentation`
- Design mock: `/design/tools-resegmentation`
