const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getPersonDetailTabUiState,
  isSamePersonDetailNavigation,
  parsePersonDetailPath,
  shouldRevalidatePersonDetailRoute
} = require("../app/models/person-detail-tabs");

test("parsePersonDetailPath resolves contact overview and stitched tab paths", () => {
  assert.deepEqual(parsePersonDetailPath("/person/person-1"), {
    personUUID: "person-1",
    tabKey: "overview"
  });
  assert.deepEqual(parsePersonDetailPath("/person/person-1/lists"), {
    personUUID: "person-1",
    tabKey: "lists"
  });
  assert.deepEqual(parsePersonDetailPath("/person/person-1/similar-contacts"), {
    personUUID: "person-1",
    tabKey: "similarContacts"
  });
  assert.deepEqual(parsePersonDetailPath("/person/person-1/notes"), {
    personUUID: "person-1",
    tabKey: "notes"
  });
  assert.equal(parsePersonDetailPath("/people"), null);
});

test("getPersonDetailTabUiState switches to the pending similar contacts tab and shows inline loading", () => {
  assert.deepEqual(
    getPersonDetailTabUiState({
      personUUID: "person-1",
      currentPathname: "/person/person-1",
      navigationState: "loading",
      navigationPathname: "/person/person-1/similar-contacts"
    }),
    {
      activeTabKey: "similarContacts",
      isLoading: true,
      label: "Loading similar contacts..."
    }
  );
});

test("getPersonDetailTabUiState stays idle on the loaded lists tab", () => {
  assert.deepEqual(
    getPersonDetailTabUiState({
      personUUID: "person-1",
      currentPathname: "/person/person-1/lists",
      navigationState: "idle",
      navigationPathname: null
    }),
    {
      activeTabKey: "lists",
      isLoading: false,
      label: null
    }
  );
});

test("isSamePersonDetailNavigation matches same-contact tab switches only", () => {
  assert.equal(
    isSamePersonDetailNavigation({
      currentPathname: "/person/person-1",
      navigationPathname: "/person/person-1/notes"
    }),
    true
  );
  assert.equal(
    isSamePersonDetailNavigation({
      currentPathname: "/person/person-1",
      navigationPathname: "/person/person-2/notes"
    }),
    false
  );
});

test("shouldRevalidatePersonDetailRoute skips same-contact tab reloads", () => {
  assert.equal(
    shouldRevalidatePersonDetailRoute({
      currentUrl: new URL("http://localhost:3000/person/person-1"),
      nextUrl: new URL("http://localhost:3000/person/person-1/lists"),
      formMethod: "GET",
      defaultShouldRevalidate: true
    }),
    false
  );

  assert.equal(
    shouldRevalidatePersonDetailRoute({
      currentUrl: new URL("http://localhost:3000/person/person-1"),
      nextUrl: new URL("http://localhost:3000/person/person-2"),
      formMethod: "GET",
      defaultShouldRevalidate: true
    }),
    true
  );
});
