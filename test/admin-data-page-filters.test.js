const test = require("node:test");
const assert = require("node:assert/strict");

test("generic admin-data row filter matches active column substrings", async () => {
  const { rowMatchesColumnFilters } = await import("../app/models/admin-data-page.mjs");

  assert.equal(
    rowMatchesColumnFilters(
      { name: "Nicknames", type: "crosswalk", description: "Nickname crosswalk for person matching" },
      { name: "nick", type: "cross" }
    ),
    true
  );

  assert.equal(
    rowMatchesColumnFilters(
      { name: "Nicknames", type: "crosswalk", description: "Nickname crosswalk for person matching" },
      { description: "company" }
    ),
    false
  );
});
