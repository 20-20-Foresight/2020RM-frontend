const test = require("node:test");
const assert = require("node:assert/strict");

test("navigation model defines the requested subsection labels", async () => {
  const { navItems } = await import("../app/models/navigation.mjs");
  const subsectionLabels = navItems
    .filter((item) => item.key !== "design")
    .filter((item) => Array.isArray(item.children))
    .map((item) => ({
      label: item.label,
      children: item.children.map((child) => child.label)
    }));

  assert.deepEqual(subsectionLabels, [
    {
      label: "Organizations",
      children: ["Clients", "Advanced Search"]
    },
    {
      label: "People",
      children: ["Candidates", "EM Clients", "Advanced Search"]
    },
    {
      label: "Services",
      children: ["My Services", "EM Services", "ES Services", "Advanced Search"]
    },
    {
      label: "Tools",
      children: ["Resegmentation"]
    },
    {
      label: "Admin",
      children: ["Roles", "User Management"]
    },
    {
      label: "Settings",
      children: ["Research Feeds"]
    },
    {
      label: "Data",
      children: [
        "Organization Segmentation",
        "Person Transformations",
        "Places",
        "Company Transformations",
        "Position Levels",
        "Email Scanning",
        "Internet",
        "Reference Material"
      ]
    }
  ]);
  const jobsIndex = navItems.findIndex((item) => item.key === "jobs");
  const reportsIndex = navItems.findIndex((item) => item.key === "reports");
  const learnIndex = navItems.findIndex((item) => item.key === "learn");
  const marketingIndex = navItems.findIndex((item) => item.key === "marketing");

  assert.equal(reportsIndex, jobsIndex + 1);
  assert.equal(learnIndex, reportsIndex + 1);
  assert.equal(marketingIndex, learnIndex + 1);
});

test("isPathWithinItem matches parent routes and descendants", async () => {
  const { isPathWithinItem } = await import("../app/models/navigation.mjs");
  assert.equal(
    isPathWithinItem({ to: "/people" }, "/people"),
    true
  );
  assert.equal(
    isPathWithinItem({ to: "/people" }, "/people/candidates"),
    true
  );
  assert.equal(
    isPathWithinItem({ to: "/people" }, "/organizations"),
    false
  );
});

test("isNavItemActive treats child routes as active for the parent section", async () => {
  const { navItems, isNavItemActive } = await import("../app/models/navigation.mjs");
  const peopleItem = navItems.find((item) => item.key === "people");
  assert.equal(isNavItemActive(peopleItem, "/people/em-clients"), true);
  assert.equal(isNavItemActive(peopleItem, "/jobs"), false);
});

test("isNavItemActive does not keep Admin active for the separate top-level Data section", async () => {
  const { navItems, isNavItemActive } = await import("../app/models/navigation.mjs");
  const adminItem = navItems.find((item) => item.key === "admin");
  const dataItem = navItems.find((item) => item.key === "data");

  assert.equal(isNavItemActive(adminItem, "/admin/data"), false);
  assert.equal(isNavItemActive(dataItem, "/admin/data"), true);
  assert.equal(isNavItemActive(dataItem, "/admin/data/segmentation"), true);
});

test("getExpandedNavItemKeys expands the matching section for subsection routes", async () => {
  const { getExpandedNavItemKeys } = await import("../app/models/navigation.mjs");
  assert.deepEqual(getExpandedNavItemKeys("/jobs/all-em-jobs"), ["jobs"]);
  assert.deepEqual(getExpandedNavItemKeys("/admin/user-management"), ["admin"]);
});

test("getNavigationItems hides admin children when the session lacks admin permissions", async () => {
  const { getNavigationItems } = await import("../app/models/navigation.mjs");
  const items = getNavigationItems({
    permissions: {
      entity_access: {
        organization: ["read"]
      },
      tools_access: {},
      admin_access: {}
    }
  });

  assert.equal(items.some((item) => item.key === "admin"), false);
  assert.equal(items.some((item) => item.key === "data"), false);
});

test("getNavigationItems exposes only the allowed admin subsections", async () => {
  const { getNavigationItems } = await import("../app/models/navigation.mjs");
  const items = getNavigationItems({
    permissions: {
      entity_access: {},
      tools_access: {},
      admin_access: {
        configuration: ["access"]
      }
    }
  });
  const adminItem = items.find((item) => item.key === "admin");

  assert.deepEqual(adminItem.children.map((child) => child.label), ["Roles", "User Management"]);
  assert.equal(items.some((item) => item.key === "data"), false);
});

test("getNavigationItems exposes Data as a top-level item for data-settings users", async () => {
  const { getNavigationItems } = await import("../app/models/navigation.mjs");
  const items = getNavigationItems({
    permissions: {
      entity_access: {},
      tools_access: {},
      admin_access: {
        data_settings: ["access"]
      }
    }
  });

  const dataItem = items.find((item) => item.key === "data");
  assert.equal(dataItem?.label, "Data");
  assert.equal(dataItem?.to, "/admin/data");
  assert.equal(items.some((item) => item.key === "admin"), false);
});
