const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectCategoryLabels,
  loadSegmentationCategoryCatalog
} = require("../app/models/segmentation-category-catalog.server");

test("collectCategoryLabels reads active category labels from common document wrappers", () => {
  assert.deepEqual(
    collectCategoryLabels({
      values: [
        { label: "Private Equity" },
        { name: "Brokerage" },
        { label: "Retired", deleted: true },
        { label: "Inactive", active: false }
      ]
    }),
    ["Brokerage", "Private Equity"]
  );
});

test("loadSegmentationCategoryCatalog loads Industry and Focus labels from category documents", async () => {
  const requestedIds = [];
  const catalog = await loadSegmentationCategoryCatalog({
    request: new Request("http://localhost:3000/admin/data/crm.data%3Adescription-rules", {
      headers: {
        cookie: "sid=123"
      }
    }),
    loadCategoryDocuments: async () => [
      {
        id: "crm.data:Industry",
        name: "Industry"
      },
      {
        id: "crm.data:Focus",
        name: "Focus"
      }
    ],
    loadRawAdminDataDocument: async ({ id }) => {
      requestedIds.push(id);
      if (id === "crm.data:Industry") {
        return {
          document: {
            categories: [
              { label: "Real Estate" },
              { label: "Investment Firm" }
            ]
          }
        };
      }

      return {
        document: {
          values: [
            { label: "Brokerage" },
            { label: "REIT" }
          ]
        }
      };
    }
  });

  assert.deepEqual(requestedIds, ["crm.data:Industry", "crm.data:Focus"]);
  assert.deepEqual(catalog, {
    industryOptions: ["Investment Firm", "Real Estate"],
    focusOptions: ["Brokerage", "REIT"]
  });
});
