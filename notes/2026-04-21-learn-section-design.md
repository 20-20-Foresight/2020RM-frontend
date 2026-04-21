# Learn Section — Design Notes
**Date:** 2026-04-21

## Overview

A new read-only reference section called **Learn** that surfaces the existing segmentation dimension data (Focus, Industry, and future topics) in a user-friendly browsable format. The content is driven by the existing `categories` admin-data documents plus a new `learn-topics` config document that controls what appears and who can see it.

---

## Config Document: `crm.learn:topics`

A new admin-data document (type `learn-topics`) seeded in the backend. This is the single source of truth for the Learn landing page — it lists which topics to show, where their data comes from, what category they belong to, and who can see them.

### Full JSON shape

```json
{
  "id": "crm.learn:topics",
  "namespace": "crm.learn",
  "key": "topics",
  "type": "learn-topics",
  "name": "Learn Topics",
  "description": "Controls which topics appear in the Learn section",
  "document": {
    "topics": [
      {
        "id": "focus",
        "title": "Focus",
        "summary": "Understand the focus areas used to categorize organizations by their primary business activity.",
        "slug": "focus",
        "categoryDocumentId": "crm.data:focus",
        "category": "Segmentation",
        "permission": "all"
      },
      {
        "id": "industry",
        "title": "Industry",
        "summary": "Explore the industry segments used to classify organizations for segmentation and CRM tagging.",
        "slug": "industry",
        "categoryDocumentId": "crm.data:industry",
        "category": "Segmentation",
        "permission": "all"
      }
    ]
  }
}
```

### Field reference

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Stable identifier |
| `title` | string | Display name (shown as H2 on card, H1 on detail) |
| `summary` | string | Short description shown on the card and at top of detail page |
| `slug` | string | URL segment: `/learn/:slug` |
| `categoryDocumentId` | string | ID of the `categories` admin-data doc to load |
| `category` | string | Grouping label — shown as a colored bubble on card; used for filter |
| `permission` | string | Access control: `"all"` \| `"recruiter"` \| `"admin"` |

Adding a new topic = add one entry to this document + ensure its `categories` doc exists.

---

## Category Colors

| Category | Chakra colorScheme |
|---|---|
| Segmentation | `purple` |
| Talent | `orange` |
| Market | `blue` |
| Operations | `green` |

---

## Routing

| Route file | URL | Purpose |
|---|---|---|
| `_app.learn.jsx` | `/learn/*` | Layout wrapper (Outlet only) |
| `_app.learn._index.jsx` | `/learn` | Landing — topic card grid |
| `_app.learn.$topicSlug.jsx` | `/learn/focus` | Topic detail with ToC |

---

## Data Flow

### Landing page loader

1. `loadRawAdminDataDocument({ request, id: "crm.learn:topics" })`
2. Filter `document.topics` by `permission` against user's session role
3. Return filtered topic list (title, summary, slug, category — no need to fetch category docs)

### Topic detail loader

1. Fetch `crm.learn:topics` → find topic where `slug === params.topicSlug`
2. 404 if not found or user lacks permission
3. `loadRawAdminDataDocument({ request, id: topic.categoryDocumentId })`
4. `buildCategoryViewModel({ document: categoryDoc.document })` (reuse existing model)
5. Filter out retired rows (`row.deletedOn` truthy)
6. Return `{ topic, categories: activeRows }`

---

## Component Structure

```
app/components/
  LearnLandingPage.jsx       — card grid + filter bar
  LearnTopicCard.jsx         — individual topic card
  LearnTopicPage.jsx         — detail layout (content + ToC columns)
  LearnTableOfContents.jsx   — sticky right-side ToC with active tracking
```

### Landing page layout

```
┌─────────────────────────────────────────────────────┐
│  Learn                                              │
│  Reference guides for segmentation…                │
│                                                     │
│  [All] [Segmentation ●] [Talent ●] [Market ●]      │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ ● Segmentat. │  │ ● Segmentat. │  │ ● Talent │  │
│  │              │  │              │  │          │  │
│  │  Focus       │  │  Industry    │  │  Job Fn. │  │
│  │  [summary]   │  │  [summary]   │  │ [summary]│  │
│  │              │  │              │  │          │  │
│  │  Open →      │  │  Open →      │  │  Open →  │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────┘
```

### Topic detail layout

```
┌──── Sidebar ────┬──────── Content (flex:1) ──────┬──── ToC (220px) ───┐
│                 │                                 │                    │
│  ▶ Learn        │  h1: Focus                      │  CONTENTS          │
│                 │  ● Segmentation                 │  ──────────────    │
│                 │  p: topic summary               │  ▶ 3rd Party PM   │
│                 │  ────────────────────────       │    Healthcare T…   │
│                 │                                 │    Financial Tech  │
│                 │  h2: 3rd Party Property Mgmt    │    Retail Tech     │
│                 │  p: description                 │    Construction T  │
│                 │                                 │                    │
│                 │  EXAMPLES                       │  (sticky, active   │
│                 │  • AppFolio                     │   item red-600)    │
│                 │  • Yardi Voyager clients        │                    │
│                 │  • RealPage customers           │                    │
│                 │                                 │                    │
│                 │  h2: Healthcare Technology      │                    │
│                 │  …                              │                    │
└─────────────────┴─────────────────────────────────┴────────────────────┘
```

---

## Table of Contents — Active State

In production the ToC uses `IntersectionObserver` to track which H2 is currently in the viewport:

```js
useEffect(() => {
  const headings = document.querySelectorAll("h2[data-toc-id]");
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length) setActiveId(visible[0].target.dataset.tocId);
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );
  headings.forEach(h => observer.observe(h));
  return () => observer.disconnect();
}, []);
```

The design mockup uses `onClick` + `useState` to simulate active state.

---

## Permission Gating

`permission` values and what they mean:

| Value | Who sees it |
|---|---|
| `"all"` | All authenticated users |
| `"recruiter"` | Users with recruiter role or higher |
| `"admin"` | Admin users only |

The loader filters topics server-side before returning them. Users who navigate directly to a restricted slug get a 404 (same as a non-existent topic).

The nav item itself ("Learn") is visible to all authenticated users — permission gating happens at the content level.

---

## Navigation

Add to `navigation.mjs` after the `marketing` entry:

```js
{
  key: "learn",
  label: "Learn",
  to: "/learn",
  icon: "school"
}
```

The `school` icon is available in the existing Material Icons set used by `AppLayout.jsx`.

---

## Design Pages

Two live design pages in the `/design` sandbox:

- `/design/learn-landing` — card grid with category filter
- `/design/learn-topic` — topic detail with sticky ToC
