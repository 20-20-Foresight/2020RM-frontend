# Integration & Visual Testing Proposal

## Problem Statement

As the codebase grows and AI-assisted coding accelerates feature development, UI regressions
slip through undetected. Currently only 4 pages have E2E coverage out of ~20+ routes. The goal
is a test suite that:

- Catches visual regressions on every page automatically
- Verifies every route loads and behaves correctly against a **real backend** (not just mocked JSON)
- Allows a bug to be reproduced by ID, with a test and the production data that triggered it
- Runs entirely on a MacBook without connecting to production
- Is maintained as a first-class artifact alongside the code

---

## Architecture Overview

The 2020RM stack is a Remix BFF (frontend + proxy) that sits in front of `2020RM-backend`:

```
Browser → Remix/Express (port 4173 in test) → 2020RM-backend (port 3001) → Database
```

Tests operate at two levels:

| Level | What runs | Auth | Data source |
|---|---|---|---|
| **Fixture mode** (fast) | Remix only | `AUTH_ENABLED=false` | JSON files in `test/fixtures/` |
| **Integration mode** (thorough) | Remix + backend + DB | `AUTH_ENABLED=false` | Local test DB seeded from production snapshots |

Both modes share the same Playwright specs. A `TEST_MODE` environment variable switches
between them.

---

## Auth Bypass

The application already has a complete Microsoft OAuth bypass built in. When
`AUTH_ENABLED=false`:

- The `requireSessionAuth` middleware injects a mock user object directly, skipping token
  validation entirely
- `/auth/login` immediately sets session state and redirects without calling Microsoft
- The mock user identity is configurable via env vars:
  ```
  AUTH_MOCK_USER_FIRST_NAME=Test
  AUTH_MOCK_USER_LAST_NAME=User
  AUTH_MOCK_USER_EMAIL=test.user@example.com
  ```

This bypass is already used by all 4 existing E2E specs. No additional work is needed —
it just needs to be documented as the standard for all test environments.

**Security note:** `AUTH_ENABLED` must never be set to `false` in any environment that
connects to production data. The integration test database is a copy, not a connection.

---

## Test Modes

### Fixture Mode (default, `npm run test:e2e`)

Remix starts with `AUTH_ENABLED=false` and `*_FIXTURE_PATH` env vars pointing to JSON files.
Requests that would normally proxy to `2020RM-backend` are intercepted at the BFF layer and
served from fixture files instead.

- No backend process needed
- Deterministic — same data every run
- Fast (< 3 min for full suite on MacBook)
- Good for: visual regression, smoke tests, interaction flows

### Integration Mode (`npm run test:e2e:integration`)

Both Remix and `2020RM-backend` start. The backend connects to a local test database
pre-seeded with production snapshots. No fixture interception — real API calls flow end-to-end.

- Requires `2020RM-backend` repo checked out alongside this one
- Requires local test database running (Docker Compose or local install)
- Slower (30–60 sec startup, real query time)
- Good for: bug reproduction, data-dependent edge cases, backend contract verification

Configuration in `playwright.config.cjs`:

```js
const integrationMode = process.env.TEST_MODE === 'integration';

module.exports = {
  // ... shared config
  webServer: integrationMode
    ? {
        command: "npm run test:integration:start",
        url: "http://127.0.0.1:4173/dashboard",
        timeout: 120000
      }
    : {
        // existing fixture-mode webServer block
      }
};
```

`package.json` additions:

```json
"test:e2e:integration": "TEST_MODE=integration playwright test",
"test:integration:start": "concurrently \"npm run start:test\" \"cd ../2020RM-backend && npm run start:test\""
```

---

## Three-Tier Test Strategy

### Tier 1 — Smoke Tests (every route, every build)

One spec file (`e2e/smoke.spec.js`) with a parameterized test for every route. Each test:
1. Navigates to the route
2. Asserts the page heading or a landmark element is visible
3. Asserts no error boundary text is present

Routes to cover:

| Route | Key assertion |
|---|---|
| `/dashboard` | Heading "Welcome back" |
| `/app/admin/data` | Heading "Data" |
| `/app/admin/data/:id` | Detail heading visible |
| `/app/admin/segmentation` | Heading "Segmentation" |
| `/app/admin/user-management` | Heading "User Management" |
| `/app/services` (ES list) | Services list visible |
| `/app/services/:id` (ES detail) | Milestone chevrons visible |
| `/app/services` (EM list) | Services list visible |
| `/app/services/:id` (EM detail) | Milestone chevrons visible |
| `/settings/feeds` | Feeds heading visible |
| `/app/design/learn` | Learn heading visible |
| `/app/design/examples` | Examples heading visible |
| `/app/design/settings` | Settings heading visible |
| `/app/design/resegmentation` | Resegmentation tool visible |

Run time target: < 60 seconds.

---

### Tier 2 — Visual Regression (screenshot every page)

Full-page screenshots committed to git as baselines. Playwright diffs on every run.

```
e2e/
  smoke.spec.js                       ← Tier 1
  dashboard-shell.spec.js             ← exists, extend
  contact-detail.spec.js              ← exists, extend
  organization-detail.spec.js         ← exists, extend
  admin-data-category-editor.spec.js  ← exists, extend
  admin-segmentation.spec.js          ← new
  admin-user-management.spec.js       ← new
  services-list.spec.js               ← new
  services-detail.spec.js             ← new
  feeds-settings.spec.js              ← new
  design-pages.spec.js                ← new
```

```bash
npm run test:e2e              # diff against committed baselines
npm run test:e2e:update       # regenerate baselines after intentional changes
```

---

### Tier 3 — Interaction Tests (critical flows)

Added as additional `test()` blocks in the same spec files:

| Feature | Interaction | Assertion |
|---|---|---|
| Admin Data | Click item in list | Detail panel opens, URL updates, no full reload |
| Admin Segmentation | Switch between tabs | Correct tab content renders |
| Organization Detail | Switch between tabs | Correct tab content renders |
| Contact Detail | Switch between tabs | Correct tab content renders |
| Services | Click service card | Detail loads with milestone chevrons |
| Feeds | Edit feed source | Form validates, save reflects in list |
| Navigation | Collapse sidebar | Sidebar collapses, content expands |

---

## Bug-Linked Tests

### The Problem

Bugs get fixed but the data that triggered them is lost. The same bug re-emerges months
later under slightly different data. There is no way to know if a given bug has test coverage.

### The Pattern

Every bug gets a test. The test carries the bug ID in its title using Playwright's tag
syntax. Playwright 1.42+ (already installed) supports `test.tag()`:

```js
test('organization detail shows correct segmentation for multi-industry orgs @bug-42',
  { tag: '@bug-42' },
  async ({ page }) => {
    // ...
  }
);
```

Alternatively, encode directly in the test name (simpler, works in all reporters):

```js
test('[BUG-42] organization detail shows correct segmentation for multi-industry orgs', async ({ page }) => {
```

### Bug Registry

A lightweight manifest at `test/bugs.json` maps bug IDs to test locations:

```json
{
  "BUG-42": {
    "title": "Organization detail shows wrong segmentation for multi-industry orgs",
    "spec": "e2e/organization-detail.spec.js",
    "fixtureData": "test/fixtures/org-bug-42.json",
    "status": "covered",
    "reportedAt": "2026-04-15"
  }
}
```

Statuses: `covered` | `pending` | `wont-fix`

### Coverage Validator

A script (`scripts/validate-bug-coverage.js`) run as part of `npm test`:

```
node scripts/validate-bug-coverage.js
```

It reads `test/bugs.json`, scans all `e2e/*.spec.js` files for matching `[BUG-N]` tags,
and exits non-zero if any `covered` bug has no matching test. This makes "write the test"
a hard requirement before marking a bug as covered.

---

## Production Data Seeding

### The Problem

Bugs are triggered by specific production data shapes that don't occur in hand-crafted
fixtures. Reproducing a bug requires the exact data that caused it.

### Fixture Seeding (for Fixture Mode)

A script (`scripts/seed-fixture-from-prod.js`) pulls a specific entity from production
and writes it as a fixture file:

```bash
# Pull an org by UUID from prod, sanitize PII, write to test/fixtures/
node scripts/seed-fixture-from-prod.js --entity organization --uuid abc-123 --out org-bug-42

# Resulting file: test/fixtures/org-bug-42.json
# Referenced in playwright.config.cjs as ORGANIZATION_DETAIL_FIXTURE_PATH for that spec
```

**What sanitization does:**
- Replaces real email addresses with `user-{n}@example.com`
- Replaces real phone numbers with `555-000-{n}`
- Replaces person names with `Test Person {n}` / `Test Organization {n}`
- Preserves all structural fields, IDs, status codes, and segmentation data unchanged

The point is to keep the data shape that triggered the bug while removing PII. The
sanitized fixture is committed to git so the reproduction is permanent.

### Integration Database Seeding (for Integration Mode)

For bugs that require the backend's query logic to reproduce (not just a data shape),
a database-level seed is needed. A script (`scripts/seed-db-from-prod.js`) exports a
minimal entity graph from production and imports it into the local test database:

```bash
# Export an org and its related people, jobs, segmentation from prod
node scripts/seed-db-from-prod.js --entity organization --uuid abc-123 --scenario bug-42

# Creates: test/db-seeds/bug-42.sql (or .json depending on DB type)
```

The seed file is committed. When integration tests run, the setup phase imports it:

```js
// e2e/organization-detail.spec.js
test.beforeAll(async () => {
  if (process.env.TEST_MODE === 'integration') {
    await execSync('node scripts/load-db-seed.js --scenario bug-42');
  }
});
```

**Access requirement:** The seeding scripts connect to a production read-only replica
(or use an export from ops). They are run manually to capture a bug — they do not
run automatically as part of the test suite. The output (sanitized SQL/JSON) is what
gets committed and replayed.

### Seed File Organization

```
test/
  fixtures/           ← sanitized JSON for fixture mode
    org-bug-42.json
    person-bug-17.json
  db-seeds/           ← sanitized SQL/JSON for integration mode
    bug-42.sql
    bug-17.sql
  bugs.json           ← bug registry
```

---

## Running Locally on a MacBook

### Fixture Mode (no backend needed)

```bash
# First-time baseline creation
npm run test:e2e:update

# Normal run (diffs against baselines)
npm run test:e2e

# Debug a specific test
npm run test:e2e:headed -- --grep "dashboard"

# Run only bug-regression tests
npm run test:e2e -- --grep "\[BUG-"

# View HTML report
npx playwright show-report .store/playwright-results
```

### Integration Mode (requires 2020RM-backend)

```bash
# One-time setup: start the local test database (Docker Compose)
docker compose -f docker-compose.test.yml up -d

# Load a specific bug scenario into the test DB
node scripts/load-db-seed.js --scenario bug-42

# Run integration tests
npm run test:e2e:integration

# Run only a specific spec in integration mode
TEST_MODE=integration npx playwright test e2e/organization-detail.spec.js
```

### Seeding a Bug Reproduction

```bash
# 1. Capture the production data (run once, requires prod read access)
node scripts/seed-fixture-from-prod.js --entity organization --uuid <prod-uuid> --out org-bug-99

# 2. Add the bug to the registry
# Edit test/bugs.json

# 3. Write the test referencing the fixture
# e2e/organization-detail.spec.js — add [BUG-99] test

# 4. Validate coverage passes
npm test  # includes validate-bug-coverage.js
```

---

## Enforcing Test Maintenance During AI-Assisted Development

Add to `CLAUDE.md`:

```markdown
## Testing Rules

### Routes
When adding or modifying a route:
- Add or update the smoke test entry in `e2e/smoke.spec.js`
- Add or update the visual regression screenshot in the relevant spec file
- If the route uses new fixture data, add the fixture file and env var to
  `playwright.config.cjs` and `test/fixtures/`
- Run `npm run test:e2e:update` if the visual change is intentional and commit
  the updated snapshots alongside the code change

When renaming or removing a route, remove the corresponding test entries.

### Bug Fixes
When fixing a bug:
- Add an entry to `test/bugs.json` with status "covered"
- Write a Playwright test with `[BUG-N]` in the test name
- Add the fixture or seed data that reproduces the bug
- `npm test` must pass (includes bug coverage validator)

Do not mark a bug as "covered" in bugs.json without a test that would catch a regression.
```

---

## What This Does Not Cover

| Concern | Status | Notes |
|---|---|---|
| Automated PII scrubbing during seeding | Manual review required | Sanitization script covers common fields; edge cases need human review before committing seed data |
| Continuous integration (GitHub Actions) | Future work | Fixture-mode suite is suitable for CI; integration mode needs a DB service container |
| Accessibility auditing | Possible extension | `@axe-core/playwright` is a low-effort add-on to existing specs |
| Cross-browser testing | Out of scope | Chromium-only is sufficient for an internal CRM tool |
| Performance (LCP, CLS) | Out of scope | Not a current concern |

---

## Implementation Sequence

1. **Auth bypass documentation** — add to CLAUDE.md and README (bypass already works)
2. **Write `e2e/smoke.spec.js`** — parameterized loader for all routes, fixture stubs for missing ones
3. **Extend existing 4 specs** — add screenshot assertions for sub-states
4. **Write new specs** — one per feature area
5. **Add `test/bugs.json` + `scripts/validate-bug-coverage.js`** — wire into `npm test`
6. **Add `CLAUDE.md` testing rules** — enforce going forward
7. **Commit fixture-mode baselines** — `npm run test:e2e:update`
8. **Write `scripts/seed-fixture-from-prod.js`** — enables bug data capture
9. **Integration mode setup** — `playwright.config.cjs` dual-mode, Docker Compose for DB, `scripts/seed-db-from-prod.js`

Steps 1–7 can be done without the backend repo and without production access. Step 8
requires prod read access. Step 9 requires coordination with the backend team.

Total estimated build effort:
- Steps 1–7: 2–3 focused sessions (self-contained frontend work)
- Step 8: 1 session (depends on prod API shape)
- Step 9: 2–3 sessions (depends on backend team availability)
