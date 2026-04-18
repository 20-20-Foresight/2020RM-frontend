const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getOrganizationDetailTabUiState,
  isSameOrganizationDetailNavigation,
  parseOrganizationDetailPath,
  shouldRevalidateOrganizationDetailRoute
} = require("../app/models/organization-detail-tabs");

test("parseOrganizationDetailPath resolves organization info and people tab paths", () => {
  assert.deepEqual(parseOrganizationDetailPath("/organization/org-1"), {
    organizationUUID: "org-1",
    tabKey: "overview"
  });
  assert.deepEqual(parseOrganizationDetailPath("/organization/org-1/people"), {
    organizationUUID: "org-1",
    tabKey: "contacts"
  });
  assert.deepEqual(parseOrganizationDetailPath("/organization/org-1/jobs"), {
    organizationUUID: "org-1",
    tabKey: "jobs"
  });
  assert.deepEqual(parseOrganizationDetailPath("/organization/org-1/similar-organizations"), {
    organizationUUID: "org-1",
    tabKey: "similarOrganizations"
  });
  assert.equal(parseOrganizationDetailPath("/people"), null);
});

test("getOrganizationDetailTabUiState switches to the pending contacts tab and shows inline loading", () => {
  assert.deepEqual(
    getOrganizationDetailTabUiState({
      organizationUUID: "org-1",
      currentPathname: "/organization/org-1",
      navigationState: "loading",
      navigationPathname: "/organization/org-1/people"
    }),
    {
      activeTabKey: "contacts",
      isLoading: true,
      label: "Loading contacts..."
    }
  );
});

test("getOrganizationDetailTabUiState stays idle on the loaded jobs tab", () => {
  assert.deepEqual(
    getOrganizationDetailTabUiState({
      organizationUUID: "org-1",
      currentPathname: "/organization/org-1/jobs",
      navigationState: "idle",
      navigationPathname: null
    }),
    {
      activeTabKey: "jobs",
      isLoading: false,
      label: null
    }
  );
});

test("isSameOrganizationDetailNavigation matches same-organization tab switches only", () => {
  assert.equal(
    isSameOrganizationDetailNavigation({
      currentPathname: "/organization/org-1",
      navigationPathname: "/organization/org-1/people"
    }),
    true
  );
  assert.equal(
    isSameOrganizationDetailNavigation({
      currentPathname: "/organization/org-1",
      navigationPathname: "/organization/org-2/people"
    }),
    false
  );
});

test("shouldRevalidateOrganizationDetailRoute skips same-organization tab reloads", () => {
  assert.equal(
    shouldRevalidateOrganizationDetailRoute({
      currentUrl: new URL("http://localhost:3000/organization/org-1"),
      nextUrl: new URL("http://localhost:3000/organization/org-1/jobs"),
      formMethod: "GET",
      defaultShouldRevalidate: true
    }),
    false
  );

  assert.equal(
    shouldRevalidateOrganizationDetailRoute({
      currentUrl: new URL("http://localhost:3000/organization/org-1"),
      nextUrl: new URL("http://localhost:3000/organization/org-2"),
      formMethod: "GET",
      defaultShouldRevalidate: true
    }),
    true
  );
});
