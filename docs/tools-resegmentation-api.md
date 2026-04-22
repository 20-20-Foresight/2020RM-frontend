# Resegmentation Tool — API And Phase Plan

## Goal

Move the resegmentation tool from `/design/tools-resegmentation` into the real
`/tools/resegmentation` flow using the backend list support that already exists.

Status on April 22, 2026:

- phase 1 is now implemented in the production route
- the design mock still exists at `/design/tools-resegmentation`
- CSV/XLSX import remains phase 2

Phase 1 is intentionally narrow:

- disable list import on the page
- seed a couple of real organization lists for testing
- add one dry-run resegmentation RPC that can also persist on rerun
- wire single-org and list-org review flows against that contract

CSV/XLSX import is phase 2 and is not part of the first implementation pass.

## Current Backend Reality

### Already available

- `entity/findOrganization`
- `entity/exportOrganization`
- `entity/findList`
- `entity/getListDetail`
- `entity/saveList`
- `entity/addListMember`
- `entity/resegmentOrganization`

### Not available yet

- list upload / import endpoint
- bulk list resegmentation RPC

That means phase 1 should reuse the list browse/detail APIs we already have and
call resegmentation one organization at a time.

## Phase 1 Scope

### 1. Disable list import in the tool UI

The design mock currently exposes an upload action. For phase 1 that control
should be disabled and explicitly labeled as phase 2.

Reason: the backend can browse and read lists now, but it cannot ingest CSV or
Excel into list membership yet.

### 2. Seed two real organization lists for testing

Seed two static lists in the backend:

- organizations where `organization.name ILIKE '%rose%'`
- organizations where `organization.name ILIKE '%builders%'`

Use these list headers:

- `listTypeSlug = 'LIST'`
- `listSubTypeSlug = 'ORGANIZATION'`
- `subjectType = 'organization'`
- `membershipMode = 'static'`
- `status = 'active'`

The SQL for this lives in
`backend-v3.11/sql/2026-04-22-resegmentation-test-lists.sql`.

### 3. Add one organization resegmentation RPC

Do not split preview and apply into separate algorithms. Instead, add one RPC
action that reruns segmentation every time:

- first call with `dryRun: true`
- second call with `dryRun: false` to persist

This matches the product assumption that recomputing is cheap and avoids
introducing stateful preview tokens or cached draft rows.

### 4. Keep list-mode execution client-side in phase 1

Do not add a list-wide bulk RPC yet.

The list tab can:

- load the selected list header + members
- call the same organization resegmentation RPC per row
- fan out "Segment All" from the client with normal loading state

That keeps the first pass simple and uses the same review/apply path everywhere.

## Existing RPC Contracts To Use

### Organization search

Use `entity/findOrganization` for the single-organization picker.

Requested settings:

```json
{
  "name": "rose",
  "limit": 20
}
```

Returned rows already look like lightweight candidates:

```json
[
  {
    "uuid": "org-uuid",
    "name": "Rose Builders Group",
    "website": "https://example.com",
    "linkedin": "https://www.linkedin.com/company/example",
    "match": {
      "score": 20,
      "matchedOn": ["name"],
      "explanation": "Matched on name."
    }
  }
]
```

Important: this lookup does not return current industry/focus. After selection,
load the full organization document separately.

### Current organization document

Use `entity/exportOrganization` after an org is selected.

Requested settings:

```json
{
  "uuid": "org-uuid"
}
```

Use this response for:

- current segmentation chips
- any baseline data needed before dry-run

The frontend already has `buildOrganizationSegmentationViewModel`, so the new
tool should reuse that normalization logic instead of inventing a second display
shape.

### Organization list picker

Use `entity/findList` for the list dropdown.

Requested settings:

```json
{
  "listTypeSlug": "LIST",
  "listSubTypeSlug": "ORGANIZATION",
  "subjectType": "organization",
  "status": "active",
  "membershipMode": "static",
  "limit": 100
}
```

Returned rows:

```json
[
  {
    "uuid": "list-uuid",
    "type": "list",
    "name": "Resegmentation Test - Rose Organizations",
    "listTypeSlug": "LIST",
    "listSubTypeSlug": "ORGANIZATION",
    "status": "active",
    "membershipMode": "static",
    "subjectType": "organization",
    "memberCount": 12,
    "createdDate": "2026-04-22T15:00:00.000Z",
    "modifiedDate": "2026-04-22T15:00:00.000Z"
  }
]
```

### Selected list detail

Use `entity/getListDetail` once a list is chosen.

Requested settings:

```json
{
  "uuid": "list-uuid"
}
```

Returned detail:

```json
{
  "list": {
    "uuid": "list-uuid",
    "type": "list",
    "name": "Resegmentation Test - Rose Organizations",
    "listTypeSlug": "LIST",
    "listSubTypeSlug": "ORGANIZATION",
    "status": "active",
    "membershipMode": "static",
    "subjectType": "organization",
    "memberCount": 12
  },
  "members": [
    {
      "uuid": "membership-uuid",
      "relation": "LIST_MEMBER",
      "position": 1,
      "addedAt": "2026-04-22T15:00:00.000Z",
      "source": "seed_sql",
      "member": {
        "uuid": "org-uuid",
        "type": "organization",
        "name": "Rose Builders Group"
      }
    }
  ],
  "targets": [],
  "permissions": {
    "owners": [],
    "viewers": [],
    "editors": []
  }
}
```

Important: `members[]` only gives the lightweight organization summary. If the
table needs current industry/focus on initial load, the frontend will need to
hydrate those rows separately. Phase 1 should prefer lazy row hydration:

- show name immediately from `getListDetail`
- fetch `entity/exportOrganization` when a row is reviewed or segmented
- optionally prefetch visible rows later if needed

## New RPC To Add

### Action name

Recommended action: `entity/resegmentOrganization`

### Why one action instead of two

The user flow wants dry-run first, then save by rerunning the same logic. A
single action with `dryRun` keeps the backend and frontend simpler:

- same request shape
- same response shape
- no temporary preview state to store
- no risk of applying stale preview data

### Request shape

```json
{
  "uuid": "org-uuid",
  "dryRun": true,
  "saveSalesforce": false,
  "includeExplanation": true
}
```

Rules:

- `dryRun` defaults to `true`
- `saveSalesforce` is ignored when `dryRun` is `true`
- apply is just the same action with `dryRun: false`

### Response shape

```json
{
  "organization": {
    "uuid": "org-uuid",
    "name": "Rose Builders Group"
  },
  "current": {
    "sector": "Real Estate",
    "industry": ["Homebuilding"],
    "focus": ["Residential Builders"],
    "calculatedEMIndustry": "Home Builders"
  },
  "proposed": {
    "sector": "Real Estate",
    "industry": ["Homebuilding"],
    "focus": ["Residential Builders"],
    "calculatedEMIndustry": "Home Builders"
  },
  "explanations": [
    {
      "source": "companyName",
      "dimension": "Focus",
      "value": "Homebuilding",
      "score": 5,
      "crosswalkDocumentName": null,
      "rule": "reason-uuid",
      "reasonHtml": "&ldquo;Rose <mark>Builders</mark> Group...&rdquo;"
    }
  ],
  "persisted": false,
  "salesforce": {
    "attempted": false,
    "staged": false,
    "stagedCount": 0,
    "recordIds": []
  }
}
```

Implementation note: phase 1 stages Salesforce account updates when the user
checks the apply-modal option. It does not run a separate direct-save workflow
inside the RPC request.

### Explanation payload requirement

The response must return the explanation rows in a format the frontend can
render directly inside the existing explanation table:

- `source`
- `dimension`
- `value`
- `score`
- `crosswalkDocumentName`
- `rule`
- `reasonHtml`

That aligns with the current `OrganizationSegmentationSection` display model and
avoids a second explanation adapter in the frontend.

### Apply call

Apply is the same action with:

```json
{
  "uuid": "org-uuid",
  "dryRun": false,
  "saveSalesforce": true,
  "includeExplanation": true
}
```

The response should still include the full result payload so the UI can refresh
from the save call directly.

## Frontend Wiring Plan

### Single organization tab

1. Use `entity/findOrganization` for the search dropdown.
2. Use `entity/exportOrganization` after selection to populate current values.
3. Call `entity/resegmentOrganization` with `dryRun: true` when "Segment Now" is
   clicked.
4. Show explanation rows from `result.explanations`.
5. Call the same action with `dryRun: false` when the user confirms "Apply".

### List tab

1. Use `entity/findList` to populate the dropdown.
2. Use `entity/getListDetail` after selection.
3. Disable import in phase 1.
4. For row review, call `entity/exportOrganization` if current segmentation has
   not been hydrated yet.
5. For "Segment" and "Segment All", call `entity/resegmentOrganization` per
   organization row.
6. For "Apply", call the same action again with `dryRun: false`.

### BFF shape

The production route uses thin Remix loader/action helpers that post to
`/api/rpc`. The source of truth stays the backend RPC actions above; there is no
separate guessed REST contract for resegmentation.

## Seed SQL

Seed script:

- `backend-v3.11/sql/2026-04-22-resegmentation-test-lists.sql`

What it does:

- creates or updates two list headers
- attaches matching organizations through `LIST_MEMBER`
- recalculates `metadata.memberCount`
- leaves the lists in a stable shape for repeat dev/test runs

Expected seeded list names:

- `Resegmentation Test - Rose Organizations`
- `Resegmentation Test - Builders Organizations`

## Phase 2: CSV And Excel Import

Phase 2 starts only after phase 1 is working end to end.

### Required backend work

- import RPC or upload endpoint
- CSV/XLSX parsing
- organization matching strategy
- import preview summary
- duplicate handling
- list creation + membership writes from the parsed file

### Required product decisions

- accepted columns
- whether UUID is required or optional
- matching precedence: UUID, website/domain, exact name, fuzzy name
- how unmatched rows are reported
- whether import is synchronous or queued

### Recommendation

Do not design the final import contract until phase 1 proves that the browse,
review, dry-run, and apply flow is correct.
