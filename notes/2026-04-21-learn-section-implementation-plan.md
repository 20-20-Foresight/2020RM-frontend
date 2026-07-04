# Learn Section — Implementation Plan
**Date:** 2026-04-21

## Prerequisites

- Backend must seed `crm.learn:topics` (type `learn-topics`) in the admin-data store
- `crm.data:focus` and `crm.data:industry` category documents must exist (they do)

---

## Step 1 — Backend: Seed the topics config document

Create document `crm.learn:topics` with the initial two topics (Focus + Industry). See design notes for full JSON shape.

Fields per topic: `id`, `title`, `summary`, `slug`, `categoryDocumentId`, `category`, `permission`.

**Dependency:** All frontend steps depend on this existing. Use mock/fallback in loaders during development.

---

## Step 2 — Model: `app/models/learn.server.js`

New server-side model file. Exposes two functions:

### `loadLearnTopics({ request })`

```js
async function loadLearnTopics({ request }) {
  const doc = await loadRawAdminDataDocument({ request, id: "crm.learn:topics" });
  const topics = Array.isArray(doc?.document?.topics) ? doc.document.topics : [];
  // Filter by permission against session meta (fetched separately or passed in)
  return topics;
}
```

### `loadLearnTopicDetail({ request, slug })`

```js
async function loadLearnTopicDetail({ request, slug }) {
  const topics = await loadLearnTopics({ request });
  const topic = topics.find(t => t.slug === slug);
  if (!topic) return null;

  const categoryDoc = await loadRawAdminDataDocument({ request, id: topic.categoryDocumentId });
  const { rows } = buildCategoryViewModel({ document: categoryDoc.document });
  return {
    topic,
    categories: rows.filter(r => !r.deletedOn)
  };
}
```

**Imports:** `loadRawAdminDataDocument` from `./admin-data.server`, `buildCategoryViewModel` from `./segmentation-category-document`.

---

## Step 3 — Permission filtering

The permission field on each topic maps to user roles from the session. Add a helper (either in `learn.server.js` or a shared util):

```js
function userCanViewTopic(topic, meta) {
  if (topic.permission === "all") return true;
  const adminActions = meta?.permissions?.admin_access?.system ?? [];
  if (topic.permission === "admin") return adminActions.includes("object_editing");
  if (topic.permission === "recruiter") return true; // expand as roles are defined
  return false;
}
```

Apply this filter in `loadLearnTopics` after loading the topics array.

---

## Step 4 — Routes

### `app/routes/_app.learn.jsx` (layout)

Minimal — just an `<Outlet />`. Could add shared breadcrumb or page header later.

```jsx
import { Outlet } from "@remix-run/react";
export default function LearnLayout() {
  return <Outlet />;
}
```

### `app/routes/_app.learn._index.jsx` (landing)

```jsx
export async function loader({ request }) {
  const topics = await loadLearnTopics({ request });
  return json({ topics });
}

export default function LearnIndexRoute() {
  const { topics } = useLoaderData();
  return <LearnLandingPage topics={topics} />;
}
```

### `app/routes/_app.learn.$topicSlug.jsx` (detail)

```jsx
export async function loader({ request, params }) {
  const data = await loadLearnTopicDetail({ request, slug: params.topicSlug });
  if (!data) throw new Response("Not Found", { status: 404 });
  return json(data);
}

export default function LearnTopicRoute() {
  const { topic, categories } = useLoaderData();
  return <LearnTopicPage topic={topic} categories={categories} />;
}
```

---

## Step 5 — Components

### `app/components/LearnLandingPage.jsx`

Props: `topics[]`

- `useState` for active category filter (`"All"` default)
- Derive unique categories from topics array
- Render filter tag row + `SimpleGrid` of `LearnTopicCard`

### `app/components/LearnTopicCard.jsx`

Props: `topic`

- `Box` with border/shadow, flex column layout
- Category `Badge` (colored, rounded-full) top-left
- Permission badge top-right when `permission !== "all"`
- `Heading as="h2"` for topic title
- `Text` for summary
- `Link as={RouterLink} to={/learn/${topic.slug}}` for "Open →"

### `app/components/LearnTopicPage.jsx`

Props: `topic`, `categories[]`

- `Flex` layout: content column (flex 1) + `LearnTableOfContents` (220px, flexShrink 0)
- Content: H1, category badge, summary, Divider, then category sections
- Each category section: `Box id={cat.id}`, H2, description (dangerouslySetInnerHTML), Examples H3 + UnorderedList
- Pass `activeId` state down to ToC; update on scroll via IntersectionObserver

### `app/components/LearnTableOfContents.jsx`

Props: `categories[]`, `activeId`, `onActiveChange` (or manage state internally)

- `useEffect` sets up `IntersectionObserver` on `h2[data-toc-id]` elements
- Sticky container, `position="sticky" top={4}`
- Left border treatment; active item gets red-600 left border + bold text
- `ChakraLink href={\`#${cat.id}\`}` for each item

IntersectionObserver setup:
```js
useEffect(() => {
  const headings = document.querySelectorAll("[data-toc-id]");
  const observer = new IntersectionObserver(
    entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length) setActiveId(visible[0].target.dataset.tocId);
    },
    { rootMargin: "-10% 0px -80% 0px" }
  );
  headings.forEach(h => observer.observe(h));
  return () => observer.disconnect();
}, [categories]);
```

Use `data-toc-id={cat.id}` on the H2 element (not just `id`) so the observer selector is unambiguous.

---

## Step 6 — Navigation

Edit `app/models/navigation.mjs` — add after the `marketing` entry:

```js
{
  key: "learn",
  label: "Learn",
  to: "/learn",
  icon: "school"
}
```

No permission gating on the nav item — the content-level loader filters what each user sees.

---

## Step 7 — Error / empty states

- `_app.learn._index.jsx`: if `topics` is empty, show a placeholder ("No topics available")
- `_app.learn.$topicSlug.jsx`: `throw new Response("Not Found", { status: 404 })` if topic not found or permission denied
- If `crm.learn:topics` doc doesn't exist yet (backend not seeded), `loadRawAdminDataDocument` will throw — catch and return empty array in `loadLearnTopics`

---

## File Checklist

| File | Action |
|---|---|
| Backend: `crm.learn:topics` document | Create (backend) |
| `app/models/learn.server.js` | Create |
| `app/routes/_app.learn.jsx` | Create |
| `app/routes/_app.learn._index.jsx` | Create |
| `app/routes/_app.learn.$topicSlug.jsx` | Create |
| `app/components/LearnLandingPage.jsx` | Create |
| `app/components/LearnTopicCard.jsx` | Create |
| `app/components/LearnTopicPage.jsx` | Create |
| `app/components/LearnTableOfContents.jsx` | Create |
| `app/models/navigation.mjs` | Edit — add Learn nav item |

---

## Sequencing

```
Backend seed
    └─▶ learn.server.js
            └─▶ _app.learn.jsx (layout)
            └─▶ _app.learn._index.jsx  ──▶  LearnLandingPage + LearnTopicCard
            └─▶ _app.learn.$topicSlug.jsx  ──▶  LearnTopicPage + LearnTableOfContents
                                                    └─▶  navigation.mjs (add nav item last, once pages work)
```

Frontend can be built and tested against the design mocks before the backend seed is complete by having the loader catch `AdminDataApiError` and return empty/fallback data.
