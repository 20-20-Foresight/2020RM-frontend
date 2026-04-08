const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildDimensionDefinitionDocument,
  buildDimensionDefinitionViewModel
} = require("../app/models/dimension-definition-document");

test("buildDimensionDefinitionViewModel reads wrapped definition rows", () => {
  const viewModel = buildDimensionDefinitionViewModel({
    document: {
      values: [
        {
          id: "dimension-industry",
          key: "industry",
          label: "Industry",
          description: "Primary industry classification",
          examples: ["PE RE", "Corporate RE"]
        }
      ]
    }
  });

  assert.deepEqual(viewModel.rows, [
    {
      id: "dimension-industry",
      key: "industry",
      label: "Industry",
      description: "Primary industry classification",
      examplesText: "PE RE\nCorporate RE",
      __extraFields: {}
    }
  ]);
});

test("buildDimensionDefinitionDocument preserves wrapper and generates ids for new rows", () => {
  const document = buildDimensionDefinitionDocument({
    sourceDocument: {
      values: []
    },
    rows: [
      {
        key: "industry",
        label: "Industry",
        description: "Primary industry classification",
        examplesText: "PE RE\nCorporate RE",
        __extraFields: {}
      }
    ]
  });

  assert.equal(Array.isArray(document.values), true);
  assert.match(document.values[0].id, /^[0-9a-f-]{36}$/i);
  assert.deepEqual(document.values[0], {
    id: document.values[0].id,
    key: "industry",
    label: "Industry",
    description: "Primary industry classification",
    examples: ["PE RE", "Corporate RE"]
  });
});
