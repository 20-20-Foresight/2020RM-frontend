const test = require("node:test");
const assert = require("node:assert/strict");

test("appendFocusOption prefers friendly labels over stored slugs", async () => {
  const { appendFocusOption } = await import("../app/models/focus-shortcut.mjs");

  assert.deepEqual(
    appendFocusOption(["broker-dealer"], "Broker Dealer"),
    ["Broker Dealer"]
  );
});

test("findExistingFocusRow matches slug-equivalent Focus labels", async () => {
  const { findExistingFocusRow } = await import("../app/models/focus-shortcut.mjs");

  assert.deepEqual(
    findExistingFocusRow(
      [
        {
          label: "Broker Dealer",
          deletedOn: ""
        }
      ],
      "broker-dealer"
    ),
    {
      label: "Broker Dealer",
      deletedOn: ""
    }
  );
});

test("buildCreatedFocusRow trims label, description, and dimension id", async () => {
  const { buildCreatedFocusRow } = await import("../app/models/focus-shortcut.mjs");

  assert.deepEqual(
    buildCreatedFocusRow({
      label: "  Asset Management  ",
      description: "  <p>Focused investors</p>  ",
      dimensionId: "  dimension-focus  "
    }),
    {
      id: "",
      label: "Asset Management",
      description: "<p>Focused investors</p>",
      examplesText: "",
      dimensionId: "dimension-focus",
      preference: null,
      deletedOn: "",
      __extraFields: {}
    }
  );
});
