const test = require("node:test");
const assert = require("node:assert/strict");

test("readDisplayValue resolves stored slugs to friendly Industry and Focus labels", async () => {
  const { buildTaxonomyOptions, readDisplayValue } = await import(
    "../app/models/segmentation-default-page.mjs"
  );

  const taxonomyOptions = buildTaxonomyOptions(
    {
      industryOptions: ["RE Commercial"],
      focusOptions: ["Broker Dealer"]
    },
    [
      {
        industry: "re-commercial",
        focus: "broker-dealer"
      }
    ]
  );

  assert.equal(
    readDisplayValue({
      key: "industry",
      row: {
        industry: "re-commercial",
        industryTargets: [{ name: "re-commercial", score: 3 }]
      },
      taxonomyOptions
    }),
    "RE Commercial (3)"
  );
  assert.equal(
    readDisplayValue({
      key: "focus",
      row: {
        focus: "broker-dealer",
        focusTargets: [{ name: "broker-dealer", score: 3 }]
      },
      taxonomyOptions
    }),
    "Broker Dealer (3)"
  );
  assert.deepEqual(taxonomyOptions.industryOptions, ["RE Commercial"]);
  assert.deepEqual(taxonomyOptions.focusOptions, ["Broker Dealer"]);
});

test("rowMatchesFilters matches friendly Industry labels instead of scored display strings", async () => {
  const { rowMatchesFilters } = await import("../app/models/segmentation-default-page.mjs");

  const taxonomyOptions = {
    industryOptions: ["RE Commercial"],
    focusOptions: ["Asset Management"]
  };

  assert.equal(
    rowMatchesFilters(
      {
        categories: ["Real Estate"],
        description: "Commercial owners",
        sector: "Real Estate",
        industryTargets: [{ name: "RE Commercial", score: 3 }],
        focusTargets: [{ name: "Asset Management", score: 2 }]
      },
      {
        industry: "RE Commercial",
        focus: "Asset Management"
      },
      taxonomyOptions
    ),
    true
  );
});

test("rowMatchesFilters matches friendly labels when legacy row data only stores slugs", async () => {
  const { rowMatchesFilters } = await import("../app/models/segmentation-default-page.mjs");

  assert.equal(
    rowMatchesFilters(
      {
        categories: ["Real Estate"],
        description: "Commercial owners",
        sector: "Real Estate",
        industry: "re-commercial",
        focus: "asset-management"
      },
      {
        industry: "RE Commercial",
        focus: "Asset Management"
      },
      {
        industryOptions: ["RE Commercial"],
        focusOptions: ["Asset Management"]
      }
    ),
    true
  );
});

test("readRowTaxonomyWarnings reports unresolved and mismatched taxonomy values", async () => {
  const { readRowTaxonomyWarnings } = await import("../app/models/segmentation-default-page.mjs");

  assert.deepEqual(
    readRowTaxonomyWarnings(
      {
        industry: "RE Commercial",
        industryTargets: [{ name: "corporate-re", score: 3 }],
        focus: "unknown-focus",
        focusTargets: [{ name: "Asset Management", score: 2 }]
      },
      {
        industryOptions: ["RE Commercial", "Corporate RE"],
        focusOptions: ["Asset Management"]
      }
    ),
    [
      "Industry primary value (RE Commercial) does not match first target (Corporate RE)",
      "Focus has values not found in taxonomy: unknown-focus",
      "Focus primary value (unknown-focus) does not match first target (Asset Management)"
    ]
  );
});

test("applyBulkSelectionUpdate updates the selected rows only", async () => {
  const { applyBulkSelectionUpdate } = await import("../app/models/segmentation-default-page.mjs");

  const result = applyBulkSelectionUpdate(
    [
      {
        industry: "re-commercial",
        industryTargets: [{ name: "re-commercial", score: 3 }],
        focus: "broker-dealer",
        focusTargets: [{ name: "broker-dealer", score: 2 }]
      },
      {
        industry: "RE Commercial",
        industryTargets: [{ name: "RE Commercial", score: 4 }],
        focus: "",
        focusTargets: []
      },
      {
        industry: "Corporate RE",
        industryTargets: [{ name: "corporate-re", score: 2 }],
        focus: "old-focus",
        focusTargets: [{ name: "old-focus", score: 5 }]
      }
    ],
    {
      industry: "RE Commercial",
      focus: "Asset Management"
    },
    [0, 2]
  );

  assert.equal(result.changedRowCount, 2);
  assert.equal(result.changedValueCount, 8);
  assert.deepEqual(result.changedRowIndexes, [0, 2]);
  assert.deepEqual(result.rows[0], {
    industry: "RE Commercial",
    industryTargets: [{ name: "RE Commercial", score: "3" }],
    focus: "Asset Management",
    focusTargets: [{ name: "Asset Management", score: "3" }]
  });
  assert.deepEqual(result.rows[1], {
    industry: "RE Commercial",
    industryTargets: [{ name: "RE Commercial", score: 4 }],
    focus: "",
    focusTargets: []
  });
  assert.deepEqual(result.rows[2], {
    industry: "RE Commercial",
    industryTargets: [{ name: "RE Commercial", score: "3" }],
    focus: "Asset Management",
    focusTargets: [{ name: "Asset Management", score: "3" }]
  });
});
