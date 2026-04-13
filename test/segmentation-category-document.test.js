const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCategoryDocument,
  buildCategoryViewModel
} = require("../app/models/segmentation-category-document");

test("buildCategoryViewModel reads category rows and preserves retired entries", () => {
  const viewModel = buildCategoryViewModel({
    document: {
      values: [
        {
          id: "industry-1",
          label: "PE RE",
          description: "Private equity real estate",
          examples: ["Blackstone Real Estate"],
          dimensionId: "dimension-industry",
          preference: 2
        },
        {
          id: "industry-2",
          label: "Corporate RE",
          description: "Corporate real estate",
          examples: ["CBRE corporate occupier"],
          dimensionId: "dimension-industry",
          preference: 5,
          deletedOn: "2026-04-01T12:00:00.000Z"
        }
      ]
    },
    supportsPreference: true
  });

  assert.deepEqual(viewModel.rows, [
    {
      id: "industry-1",
      label: "PE RE",
      description: "Private equity real estate",
      examplesText: "Blackstone Real Estate",
      dimensionId: "dimension-industry",
      preference: 2,
      deletedOn: "",
      __extraFields: {}
    },
    {
      id: "industry-2",
      label: "Corporate RE",
      description: "Corporate real estate",
      examplesText: "CBRE corporate occupier",
      dimensionId: "dimension-industry",
      preference: 5,
      deletedOn: "2026-04-01T12:00:00.000Z",
      __extraFields: {}
    }
  ]);
});

test("buildCategoryDocument preserves wrapper shape and normalizes active industry preference order", () => {
  const document = buildCategoryDocument({
    sourceDocument: {
      values: []
    },
    supportsPreference: true,
    rows: [
      {
        id: "industry-2",
        label: "Corporate RE",
        description: "Corporate real estate",
        examplesText: "CBRE corporate occupier",
        dimensionId: "dimension-industry",
        preference: 99,
        deletedOn: "2026-04-01T12:00:00.000Z",
        __extraFields: {}
      },
      {
        id: "industry-1",
        label: "PE RE",
        description: "Private equity real estate",
        examplesText: "Blackstone Real Estate\nStarwood Capital",
        dimensionId: "dimension-industry",
        preference: 12,
        deletedOn: "",
        __extraFields: {}
      },
      {
        id: "industry-3",
        label: "Brokerage",
        description: "",
        examplesText: "",
        dimensionId: "dimension-industry",
        preference: 50,
        deletedOn: "",
        __extraFields: {}
      }
    ]
  });

  assert.deepEqual(document, {
    values: [
      {
        id: "industry-2",
        label: "Corporate RE",
        description: "Corporate real estate",
        examples: ["CBRE corporate occupier"],
        dimensionId: "dimension-industry",
        preference: 99,
        deletedOn: "2026-04-01T12:00:00.000Z"
      },
      {
        id: "industry-1",
        label: "PE RE",
        description: "Private equity real estate",
        examples: ["Blackstone Real Estate", "Starwood Capital"],
        dimensionId: "dimension-industry",
        preference: 1
      },
      {
        id: "industry-3",
        label: "Brokerage",
        dimensionId: "dimension-industry",
        preference: 2
      }
    ]
  });
});

test("buildCategoryDocument generates ids for new category values", () => {
  const document = buildCategoryDocument({
    sourceDocument: {
      values: []
    },
    supportsPreference: false,
    rows: [
      {
        label: "REIT",
        description: "",
        examplesText: "",
        dimensionId: "dimension-focus",
        preference: null,
        deletedOn: "",
        __extraFields: {}
      }
    ]
  });

  assert.match(document.values[0].id, /^[0-9a-f-]{36}$/i);
  assert.equal(document.values[0].label, "REIT");
  assert.equal(document.values[0].dimensionId, "dimension-focus");
});
