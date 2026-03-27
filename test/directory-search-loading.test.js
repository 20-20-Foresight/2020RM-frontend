const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getDirectorySearchLoadingLabel,
  isDirectorySearchLoading
} = require("../app/models/directory-search-loading");

test("directory search loading detects in-flight organization searches", () => {
  assert.equal(
    isDirectorySearchLoading({
      currentPathname: "/organizations",
      navigationState: "loading",
      navigationPathname: "/organizations"
    }),
    true
  );
});

test("directory search loading detects in-flight people searches", () => {
  assert.equal(
    isDirectorySearchLoading({
      currentPathname: "/people",
      navigationState: "submitting",
      navigationPathname: "/people"
    }),
    true
  );
});

test("directory search loading stays active for a pending local search submit", () => {
  assert.equal(
    isDirectorySearchLoading({
      currentPathname: "/people",
      navigationState: "idle",
      navigationPathname: null,
      hasPendingSearchSubmit: true
    }),
    true
  );
});

test("directory search loading ignores navigation away from the list page", () => {
  assert.equal(
    isDirectorySearchLoading({
      currentPathname: "/people",
      navigationState: "loading",
      navigationPathname: "/person/person-1"
    }),
    false
  );
});

test("directory search loading ignores idle navigation state", () => {
  assert.equal(
    isDirectorySearchLoading({
      currentPathname: "/organizations",
      navigationState: "idle",
      navigationPathname: "/organizations"
    }),
    false
  );
});

test("directory search loading returns the right overlay copy", () => {
  assert.equal(getDirectorySearchLoadingLabel("organization"), "Searching organizations...");
  assert.equal(getDirectorySearchLoadingLabel("person"), "Searching people...");
});
