const test = require("node:test");
const assert = require("node:assert/strict");

const {
  loadFocusToIndustryCatalog,
  __testOnly
} = require("../app/models/focus-to-industry-catalog.server");

test.afterEach(() => {
  __testOnly.resetCache();
});

test("loadFocusToIndustryCatalog loads visible industry labels and focus ids", async () => {
  const requestedIds = [];
  const catalog = await loadFocusToIndustryCatalog({
    request: new Request("http://localhost:3000/admin/data/crm.data%3Afocus_to_industry", {
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
            values: [
              { id: "industry-1", label: "Real Estate" },
              { id: "industry-2", label: "Investment Firm", deletedOn: "2026-01-01T00:00:00.000Z" },
              { id: "industry-3", label: "Brokerage" }
            ]
          }
        };
      }

      return {
        document: {
          values: [
            { id: "focus-2", label: "Brokerage", description: "<p>Brokerage description</p>" },
            { id: "focus-1", label: "REIT", description: "<p>REIT description</p>" },
            { id: "focus-3", label: "Retired", deletedOn: "2026-01-01T00:00:00.000Z" }
          ]
        }
      };
    }
  });

  assert.deepEqual(requestedIds, ["crm.data:Industry", "crm.data:Focus"]);
  assert.deepEqual(catalog, {
    industryOptions: ["Brokerage", "Real Estate"],
    focusOptions: [
      { id: "focus-2", label: "Brokerage", description: "Brokerage description" },
      { id: "focus-1", label: "REIT", description: "REIT description" }
    ]
  });
});

test("loadFocusToIndustryCatalog reuses cached category rows until relevant versions change", async () => {
  const requestedIds = [];
  let currentVersion = 1;

  const loadCatalog = () =>
    loadFocusToIndustryCatalog({
      request: new Request("http://localhost:3000/admin/data/crm.data%3Afocus_to_industry"),
      loadCategoryDocuments: async () => [
        {
          id: "crm.data:Industry",
          name: "Industry",
          version: currentVersion
        },
        {
          id: "crm.data:Focus",
          name: "Focus",
          version: currentVersion
        }
      ],
      loadRawAdminDataDocument: async ({ id }) => {
        requestedIds.push(`${id}@v${currentVersion}`);
        if (id === "crm.data:Industry") {
          return {
            document: {
              values: [
                { id: `industry-${currentVersion}`, label: `Industry ${currentVersion}` }
              ]
            }
          };
        }

        return {
          document: {
            values: [
              { id: `focus-${currentVersion}`, label: `Focus ${currentVersion}`, description: `<p>Description ${currentVersion}</p>` }
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
    "crm.data:Industry@v1",
    "crm.data:Focus@v1",
    "crm.data:Industry@v2",
    "crm.data:Focus@v2"
  ]);
  assert.deepEqual(first, second);
  assert.notDeepEqual(second, third);
});
