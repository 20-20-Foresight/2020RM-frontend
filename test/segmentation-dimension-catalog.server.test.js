const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadSegmentationDimensionCatalog,
  __testOnly
} = require("../app/models/segmentation-dimension-catalog.server");

test.afterEach(() => {
  __testOnly.resetCache();
});

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

test("loadSegmentationDimensionCatalog reuses cached rows until summary versions change", async () => {
  const requestedIds = [];
  let currentVersion = 1;

  const loadCatalog = () =>
    loadSegmentationDimensionCatalog({
      request: new Request("http://localhost:3000/admin/segmentation/categories"),
      loadDimensionDefinitionDocuments: async () => [
        {
          id: "crm.data:dimensions",
          version: currentVersion
        }
      ],
      loadRawAdminDataDocument: async ({ id }) => {
        requestedIds.push(`${id}@v${currentVersion}`);
        return {
          document: {
            values: [
              {
                id: `dimension-${currentVersion}`,
                key: `dimension-${currentVersion}`,
                label: `Dimension ${currentVersion}`
              }
            ]
          }
        };
      }
    });

  const first = await loadCatalog();
  const second = await loadCatalog();
  currentVersion = 2;
  const third = await loadCatalog();

  assert.deepEqual(requestedIds, [
    "crm.data:dimensions@v1",
    "crm.data:dimensions@v2"
  ]);
  assert.deepEqual(first, second);
  assert.notDeepEqual(second, third);
});
