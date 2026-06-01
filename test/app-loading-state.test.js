const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getAppLoadingOverlayState,
  getEntityDetailTypeFromPath,
  isAdminDataPath,
  isSegmentationPath,
  isEntitySearchPath
} = require("../app/models/app-loading-state");

test("isAdminDataPath matches the admin data route tree", () => {
  assert.equal(isAdminDataPath("/admin/data"), true);
  assert.equal(isAdminDataPath("/admin/data/crm.data%3Aexample"), true);
  assert.equal(isAdminDataPath("/organizations"), false);
});

test("isSegmentationPath matches the segmentation route tree", () => {
  assert.equal(isSegmentationPath("/admin/segmentation"), true);
  assert.equal(isSegmentationPath("/admin/segmentation/sectors"), true);
  assert.equal(isSegmentationPath("/admin/segmentation/real-estate/industries"), true);
  assert.equal(isSegmentationPath("/admin/data"), false);
});

test("isEntitySearchPath matches the list routes", () => {
  assert.equal(isEntitySearchPath("/organizations"), true);
  assert.equal(isEntitySearchPath("/people"), true);
  assert.equal(isEntitySearchPath("/organization/org-1"), false);
});

test("getEntityDetailTypeFromPath recognizes singular detail routes", () => {
  assert.equal(getEntityDetailTypeFromPath("/organization/org-1"), "organization");
  assert.equal(getEntityDetailTypeFromPath("/organization/org-1/people"), "organization");
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

test("app shell loading overlay ignores same-route organization searches", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/organizations",
      navigationState: "loading",
      navigationPathname: "/organizations",
      fetcherStates: []
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
    }
  );
});

test("app shell loading overlay ignores same-route person searches", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/people",
      navigationState: "loading",
      navigationPathname: "/people",
      fetcherStates: []
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
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

test("loading overlay ignores same-organization detail tab navigations so the page can render its inline loader", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/organization/org-1",
      navigationState: "loading",
      navigationPathname: "/organization/org-1/people",
      fetcherStates: []
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
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

test("loading overlay ignores same-person detail tab navigations so the page can render its inline loader", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/person/person-1",
      navigationState: "loading",
      navigationPathname: "/person/person-1/similar-contacts",
      fetcherStates: []
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
    }
  );
});

test("loading overlay ignores same-route admin data submissions", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/admin/data/crm.data%3Acompany%20abbreviations",
      navigationState: "submitting",
      navigationPathname: "/admin/data/crm.data%3Acompany%20abbreviations",
      fetcherStates: []
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
    }
  );
});

test("loading overlay ignores same-route admin data reloads", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/admin/data/segmentation/keywords",
      navigationState: "loading",
      navigationPathname: "/admin/data/segmentation/keywords",
      fetcherStates: []
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
    }
  );
});

test("loading overlay ignores inline fetcher saves on the current admin data page", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/admin/data/crm.data%3Abiscred",
      navigationState: "idle",
      fetchers: [
        {
          state: "submitting",
          formMethod: "post",
          formAction: "/admin/data/crm.data%3Abiscred"
        }
      ]
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
    }
  );
});

test("loading overlay uses segmentation-specific copy for navigations but not same-route segmentation saves", () => {
  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/admin/segmentation/sectors",
      navigationState: "loading",
      navigationPathname: "/admin/segmentation/real-estate/industries",
      fetcherStates: []
    }),
    {
      isLoading: true,
      isSubmitting: false,
      label: "Loading segmentation..."
    }
  );

  assert.deepEqual(
    getAppLoadingOverlayState({
      currentPathname: "/admin/segmentation/sectors",
      navigationState: "submitting",
      navigationPathname: "/admin/segmentation/sectors",
      fetcherStates: []
    }),
    {
      isLoading: false,
      isSubmitting: false,
      label: null
    }
  );
});
