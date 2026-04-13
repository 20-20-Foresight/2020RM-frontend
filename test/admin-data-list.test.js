const test = require("node:test");
const assert = require("node:assert/strict");

const {
  filterAdminDataItems,
  listAdminDataTypes,
  sortAdminDataItems
} = require("../app/models/admin-data-list");

test("sortAdminDataItems orders by type then by name", () => {
  const rows = sortAdminDataItems([
    { type: "segmentation", name: "Zulu" },
    { type: null, name: "No Type" },
    { type: "categories", name: "Focus" },
    { type: "categories", name: "Industry" },
    { type: "dimension-definition", name: "Segmentation Dimensions" }
  ]);

  assert.deepEqual(
    rows.map((row) => `${row.type}:${row.name}`),
    [
      "categories:Focus",
      "categories:Industry",
      "dimension-definition:Segmentation Dimensions",
      "segmentation:Zulu",
      "null:No Type"
    ]
  );
});

test("listAdminDataTypes returns sorted unique types", () => {
  assert.deepEqual(
    listAdminDataTypes([
      { type: "segmentation" },
      { type: "categories" },
      { type: "segmentation" },
      { type: "dimension-definition" },
      { type: "" }
    ]),
    ["categories", "dimension-definition", "segmentation"]
  );
});

test("filterAdminDataItems applies type and text search", () => {
  const rows = [
    {
      type: "categories",
      name: "Industry",
      description: "Industry category values",
      key: "industry"
    },
    {
      type: "categories",
      name: "Focus",
      description: "Focus category values",
      key: "focus"
    },
    {
      type: "segmentation",
      name: "LinkedIn",
      description: "LinkedIn crosswalk",
      key: "linkedin"
    }
  ];

  assert.deepEqual(
    filterAdminDataItems(rows, { type: "categories", query: "ind" }).map(
      (row) => row.name
    ),
    ["Industry"]
  );
});
