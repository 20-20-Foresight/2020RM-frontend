const test = require("node:test");
const assert = require("node:assert/strict");

test("data categories expose the requested first-pass landing cards", async () => {
  const { listAdminDataCategories } = await import("../app/models/admin-data-categories.mjs");
  const categories = listAdminDataCategories();

  assert.deepEqual(
    categories.map((category) => category.title),
    [
      "Organization Segmentation",
      "Person Transformations",
      "Places",
      "Company Transformations",
      "Position Levels",
      "Email Scanning",
      "Internet",
      "Reference Material",
      "View All"
    ]
  );
  assert.equal(categories[0].to, "/admin/data/segmentation");
  assert.equal(categories.at(-1).to, "/admin/data/all");
});

test("resolveAdminDataCategoryEntries prefers direct editor matches and falls back to View All search", async () => {
  const { getAdminDataCategoryBySlug, resolveAdminDataCategoryEntries } = await import(
    "../app/models/admin-data-categories.mjs"
  );
  const category = getAdminDataCategoryBySlug("person-transformations");

  const entries = resolveAdminDataCategoryEntries(category, [
    {
      id: "crm.data:nicknames",
      key: "nicknames",
      name: "Nicknames",
      description: "Nickname crosswalk"
    }
  ]);

  assert.equal(entries[0].label, "Name Prefixes");
  assert.equal(entries[0].status, "search");
  assert.equal(entries[0].to, "/admin/data/all?q=Name%20Prefixes");
  assert.equal(entries[2].label, "Nicknames");
  assert.equal(entries[2].status, "available");
  assert.equal(entries[2].to, "/admin/data/crm.data%3Anicknames");
});

test("resolveAdminDataCategoryEntries supports stored typo aliases for direct editor matches", async () => {
  const { getAdminDataCategoryBySlug, resolveAdminDataCategoryEntries } = await import(
    "../app/models/admin-data-categories.mjs"
  );
  const category = getAdminDataCategoryBySlug("position-levels");

  const entries = resolveAdminDataCategoryEntries(category, [
    {
      id: "crm.data:title acroynms",
      key: "title acroynms",
      name: "Title Acroynms",
      description: "Acronym expansions for job titles"
    }
  ]);

  assert.equal(entries[2].label, "Title Acronyms");
  assert.equal(entries[2].status, "available");
  assert.equal(entries[2].to, "/admin/data/crm.data%3Atitle%20acroynms");
});
