const test = require("node:test");
const assert = require("node:assert/strict");

test("resolveLockedDimensionId locks the Focus page to the Focus dimension", () => {
  return import("../app/models/category-editor-page.mjs").then(({ resolveLockedDimensionId }) => {
  assert.equal(
    resolveLockedDimensionId({
      documentName: "Focus",
      dimensionCatalog: [
        { id: "dimension-industry", label: "Industry" },
        { id: "dimension-focus", label: "Focus" }
      ]
    }),
    "dimension-focus"
  );
  });
});

test("resolveLockedDimensionId falls back to metadata name and id matching", () => {
  return import("../app/models/category-editor-page.mjs").then(({ resolveLockedDimensionId }) => {
  assert.equal(
    resolveLockedDimensionId({
      metadataName: "Industry",
      dimensionCatalog: [
        { id: "dimension-focus", label: "Customer Focus" },
        { id: "dimension-industry", label: "Market Segment" }
      ]
    }),
    "dimension-industry"
  );
  });
});

test("applyLockedDimensionId overwrites a draft row dimension when the page is locked", () => {
  return import("../app/models/category-editor-page.mjs").then(({ applyLockedDimensionId }) => {
  assert.deepEqual(
    applyLockedDimensionId(
      {
        id: "focus-1",
        label: "Broker Dealer",
        dimensionId: "dimension-industry"
      },
      "dimension-focus"
    ),
    {
      id: "focus-1",
      label: "Broker Dealer",
      dimensionId: "dimension-focus"
    }
  );
  });
});
