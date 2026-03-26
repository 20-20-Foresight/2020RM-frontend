const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAppLoadingOverlayState,
  getEntityDetailTypeFromPath,
  isAdminDataPath,
  isEntitySearchPath
} = require("../app/models/app-loading-state");

test("isAdminDataPath matches the admin data route tree", () => {
  assert.equal(isAdminDataPath("/admin/data"), true);
  assert.equal(isAdminDataPath("/admin/data/crm.data%3Aexample"), true);
  assert.equal(isAdminDataPath("/organizations"), false);
});

test("isEntitySearchPath matches the list routes", () => {
  assert.equal(isEntitySearchPath("/organizations"), true);
  assert.equal(isEntitySearchPath("/people"), true);
  assert.equal(isEntitySearchPath("/organization/org-1"), false);
});

test("getEntityDetailTypeFromPath recognizes singular detail routes", () => {
  assert.equal(getEntityDetailTypeFromPath("/organization/org-1"), "organization");
  assert.equal(getEntityDetailTypeFromPath("/person/person-1"), "person");
  assert.equal(getEntityDetailTypeFromPath("/people"), null);
});

test("loading overlay state stays idle when nothing is in flight", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/organizations",
      navigationState: "idle",
      fetcherStates: []
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
    }
  );
});

test("loading overlay labels organization searches clearly", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/organizations",
      navigationState: "loading",
      navigationPathname: "/organizations",
      fetcherStates: []
    }),
    {
      isLoading: true,
      isSubmitting: false,
      label: "Searching organizations..."
    }
  );
});

test("loading overlay labels person searches clearly", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/people",
      navigationState: "loading",
      navigationPathname: "/people",
      fetcherStates: []
    }),
    {
      isLoading: true,
      isSubmitting: false,
      label: "Searching people..."
    }
  );
});

test("loading overlay labels organization detail navigations clearly", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/organizations",
      navigationState: "loading",
      navigationPathname: "/organization/org-1",
      fetcherStates: []
    }),
    {
      isLoading: true,
      isSubmitting: false,
      label: "Loading organization..."
    }
  );
});

test("loading overlay labels person detail navigations clearly", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/people",
      navigationState: "loading",
      navigationPathname: "/person/person-1",
      fetcherStates: []
    }),
    {
      isLoading: true,
      isSubmitting: false,
      label: "Loading person..."
    }
  );
});

test("loading overlay preserves saving copy for admin data submissions", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/admin/data/crm.data%3Acompany%20abbreviations",
      navigationState: "submitting",
      navigationPathname: "/admin/data/crm.data%3Acompany%20abbreviations",
      fetcherStates: []
    }),
    {
      isLoading: true,
      isSubmitting: true,
      label: "Saving changes..."
    }
  );
});
