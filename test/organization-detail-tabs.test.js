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
    tabKey: "info"
  });
  assert.deepEqual(parseOrganizationDetailPath("/organization/org-1/people"), {
    organizationUUID: "org-1",
    tabKey: "people"
  });
  assert.equal(parseOrganizationDetailPath("/people"), null);
});

test("getOrganizationDetailTabUiState switches to the pending people tab and shows inline loading", () => {
  assert.deepEqual(
    getOrganizationDetailTabUiState({
      organizationUUID: "org-1",
      currentPathname: "/organization/org-1",
      navigationState: "loading",
      navigationPathname: "/organization/org-1/people"
    }),
    {
      activeTabKey: "people",
      isLoading: true,
      label: "Loading people..."
    }
  );
});

test("getOrganizationDetailTabUiState stays idle on the loaded people tab", () => {
  assert.deepEqual(
    getOrganizationDetailTabUiState({
      organizationUUID: "org-1",
      currentPathname: "/organization/org-1/people",
      navigationState: "idle",
      navigationPathname: null
    }),
    {
      activeTabKey: "people",
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
      nextUrl: new URL("http://localhost:3000/organization/org-1/people"),
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
