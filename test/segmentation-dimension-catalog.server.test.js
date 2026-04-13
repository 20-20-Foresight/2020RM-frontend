const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadSegmentationDimensionCatalog
} = require("../app/models/segmentation-dimension-catalog.server");

test("loadSegmentationDimensionCatalog loads dimension ids and labels from definition docs", async () => {
  const rows = await loadSegmentationDimensionCatalog({
    request: new Request("http://localhost:3000/admin/segmentation/categories"),
    loadDimensionDefinitionDocuments: async () => [
      {
        id: "crm.data:dimensions"
      }
    ],
    loadRawAdminDataDocument: async () => ({
      document: {
        values: [
          {
            id: "dimension-industry",
            key: "industry",
            label: "Industry"
          },
          {
            id: "dimension-focus",
            key: "focus",
            label: "Focus"
          }
        ]
      }
    })
  });

  assert.deepEqual(rows, [
    {
      id: "dimension-focus",
      label: "Focus"
    },
    {
      id: "dimension-industry",
      label: "Industry"
    }
  ]);
});
