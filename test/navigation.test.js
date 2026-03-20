const test = require("node:test");
const assert = require("node:assert/strict");

const {
  navItems,
  isPathWithinItem,
  isNavItemActive,
  getExpandedNavItemKeys
} = require("../app/models/navigation");

test("navigation model defines the requested subsection labels", () => {
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
        children: ["User Management", "Data"]
      }
    ]
  );
});

test("isPathWithinItem matches parent routes and descendants", () => {
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

test("isNavItemActive treats child routes as active for the parent section", () => {
  const peopleItem = navItems.find((item) => item.key === "people");
  assert.equal(isNavItemActive(peopleItem, "/people/em-clients"), true);
  assert.equal(isNavItemActive(peopleItem, "/jobs"), false);
});

test("getExpandedNavItemKeys expands the matching section for subsection routes", () => {
  assert.deepEqual(getExpandedNavItemKeys("/jobs/all-em-jobs"), ["jobs"]);
  assert.deepEqual(getExpandedNavItemKeys("/admin/user-management"), ["admin"]);
});
