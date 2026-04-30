const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildFocusToIndustryDocument,
  buildFocusToIndustryViewModel
} = require("../app/models/focus-to-industry-document");

test("buildFocusToIndustryViewModel reads ordered focus ids and scored industry targets", () => {
  const document = {
    rows: [
      {
        rowId: "row-focus-1",
        focusIds: ["focus-1", "focus-2", "focus-3"],
        industries: [
          { name: "Real Estate", score: 10 },
          { name: "Investment Firm", score: 4 }
        ],
        notes: "Primary pattern",
        reason: "manual"
      }
    ]
  };

  const viewModel = buildFocusToIndustryViewModel({
    document
  });

  assert.deepEqual(viewModel.rows, [
    {
      rowId: "row-focus-1",
      focusIds: ["focus-1", "focus-2", "focus-3"],
      industryTargets: [
        { name: "Real Estate", score: 10 },
        { name: "Investment Firm", score: 4 }
      ],
      notes: "Primary pattern",
      __extraFields: {
        reason: "manual"
      }
    }
  ]);
});

test("buildFocusToIndustryDocument rebuilds the rows wrapper and preserves sibling document keys", () => {
  const sourceDocument = {
    rows: [
      {
        rowId: "row-existing-1",
        focusIds: ["focus-existing"],
        industries: [
          { name: "Brokerage", score: 5 }
        ]
      }
    ],
    metadata: {
      source: "seed"
    }
  };

  const rebuilt = buildFocusToIndustryDocument({
    sourceDocument,
    rows: [
      {
        rowId: "row-existing-1",
        focusIds: ["focus-a", "focus-b"],
        industryTargets: [
          { name: "Real Estate", score: 10 },
          { name: "Investment Firm", score: 4 }
        ],
        notes: "Ordered subsequence",
        __extraFields: {
          reason: "manual"
        }
      },
      {
        focusIds: ["focus-c"],
        industryTargets: [
          { name: "Brokerage", score: 3 }
        ],
        notes: "",
        __extraFields: {}
      },
      {
        focusIds: [],
        industryTargets: [
          { name: "Skipped", score: 1 }
        ],
        notes: "",
        __extraFields: {}
      }
    ]
  });

  assert.equal(rebuilt.rows[0].rowId, "row-existing-1");
  assert.match(rebuilt.rows[1].rowId, /^[0-9a-f-]{36}$/i);
  assert.deepEqual(
    {
      ...rebuilt,
      rows: rebuilt.rows.map((row, index) =>
        index === 1
          ? {
              ...row,
              rowId: "<generated>"
            }
          : row
      )
    },
    {
      rows: [
        {
          rowId: "row-existing-1",
          focusIds: ["focus-a", "focus-b"],
          industry: "Real Estate",
          industries: [
            { name: "Real Estate", score: 10 },
            { name: "Investment Firm", score: 4 }
          ],
          notes: "Ordered subsequence",
          reason: "manual"
        },
        {
          rowId: "<generated>",
          focusIds: ["focus-c"],
          industry: "Brokerage",
          industries: [
            { name: "Brokerage", score: 3 }
          ]
        }
      ],
      metadata: {
        source: "seed"
      }
    }
  );
});
