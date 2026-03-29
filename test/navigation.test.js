const test = require("node:test");
const assert = require("node:assert/strict");

test("navigation model defines the requested subsection labels", async () => {
  const { navItems } = await import("../app/models/navigation.mjs");
  assert.deepEqual(
    navItems
      .filter((item) => Array.isArray(item.children))
      .map((item) => ({
        label: item.label,
        children: item.children.map((child) => child.label)
      })),
    [
      {
        label: "Organizations",
        children: ["Clients", "Advanced Search"]
      },
      {
        label: "People",
        children: ["Candidates", "EM Clients", "Advanced Search"]
      },
      {
        label: "Jobs",
        children: ["My Jobs", "All EM Jobs", "All ES Jobs", "Advanced Search"]
      },
      {
        label: "Admin",
        children: ["User Management", "Data", "Segmentation Types", "Segmentation Crosswalks"]
      }
    ]
  );
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

test("getExpandedNavItemKeys expands the matching section for subsection routes", async () => {
  const { getExpandedNavItemKeys } = await import("../app/models/navigation.mjs");
  assert.deepEqual(getExpandedNavItemKeys("/jobs/all-em-jobs"), ["jobs"]);
  assert.deepEqual(getExpandedNavItemKeys("/admin/user-management"), ["admin"]);
});
