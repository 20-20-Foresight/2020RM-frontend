const test = require("node:test");
const assert = require("node:assert/strict");

test("phrases view model reads rows into regex, sets, focus, notes fields", async () => {
  const { buildPhrasesViewModel } = await import("../app/models/phrases-document.mjs");

  const model = buildPhrasesViewModel({
    document: {
      documentType: "segmentation.phrases",
      rows: [
        {
          regex: "management of {asset}",
          sets: ["retail", "real estate assets"],
          focuses: [{ name: "Property Management", score: 5 }, { name: "Real Estate", score: 2 }],
          notes: "Test row"
        }
      ]
    }
  });

  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].regex, "management of {asset}");
  assert.equal(model.rows[0].patternTemplate, "management of {asset}");
  assert.deepEqual(model.rows[0].sets, ["retail", "real estate assets"]);
  assert.equal(model.rows[0].setsText, "retail, real estate assets");
  assert.deepEqual(model.rows[0].focuses, [{ name: "Property Management", score: 5 }, { name: "Real Estate", score: 2 }]);
  assert.equal(model.rows[0].focusesText, "Property Management (5), Real Estate (2)");
  assert.equal(model.rows[0].notes, "Test row");
});

test("phrases document builder normalizes sets and focus text", async () => {
  const { buildPhrasesDocument } = await import("../app/models/phrases-document.mjs");

  const document = buildPhrasesDocument({
    rows: [
      {
        regex: "management of {asset}",
        setsText: "retail, real estate assets",
        focusesText: "Property Management, Real Estate",
        notes: "Test row"
      }
    ]
  });

  assert.equal(document.documentType, "segmentation.phrases");
  assert.deepEqual(document.rows, [
    {
      regex: "management of {asset}",
      sets: ["retail", "real estate assets"],
      focuses: [{ name: "Property Management", score: 3 }, { name: "Real Estate", score: 3 }],
      notes: "Test row"
    }
  ]);
});

test("phrases document builder accepts scored focus arrays directly", async () => {
  const { buildPhrasesDocument } = await import("../app/models/phrases-document.mjs");

  const document = buildPhrasesDocument({
    rows: [
      {
        regex: "management of {asset}",
        sets: ["retail", "real estate assets", "Retail"],
        focuses: [
          { name: "Property Management", score: 5 },
          { name: "Real Estate", score: 2 },
          { name: "Property Management", score: 1 }
        ],
        notes: "Catalog-backed"
      }
    ]
  });

  assert.deepEqual(document.rows, [
    {
      regex: "management of {asset}",
      sets: ["retail", "real estate assets"],
      focuses: [{ name: "Property Management", score: 5 }, { name: "Real Estate", score: 2 }],
      notes: "Catalog-backed"
    }
  ]);
});

test("phrases document builder preserves matcher objects and pattern templates", async () => {
  const { buildPhrasesDocument, buildPhrasesViewModel } = await import("../app/models/phrases-document.mjs");

  const document = buildPhrasesDocument({
    rows: [
      {
        matcher: {
          version: 1,
          kind: "phrase-matcher",
          tokens: [
            { type: "literal", value: "management", caseInsensitive: true },
            { type: "literal", value: "of", caseInsensitive: true },
            { type: "set", setName: "real estate assets" }
          ]
        },
        patternTemplate: "management[\\s\\/\\-]+of[\\s\\/\\-]+{real estate assets}",
        setsText: "property management templates",
        focuses: [{ name: "Property Management", score: 4 }],
        notes: "Matcher row"
      }
    ]
  });

  assert.deepEqual(document.rows[0].matcher, {
    version: 1,
    kind: "phrase-matcher",
    anchorStart: false,
    anchorEnd: false,
    tokens: [
      { type: "literal", value: "management", options: [], setName: "", optional: false, negated: false, caseInsensitive: true },
      { type: "literal", value: "of", options: [], setName: "", optional: false, negated: false, caseInsensitive: true },
      { type: "set", value: "", options: [], setName: "real estate assets", optional: false, negated: false, caseInsensitive: true }
    ]
  });
  assert.equal(
    document.rows[0].regex,
    "management[\\s\\/\\-]+of[\\s\\/\\-]+{real estate assets}"
  );
  assert.deepEqual(document.rows[0].sets, ["property management templates"]);
  assert.deepEqual(document.rows[0].focuses, [{ name: "Property Management", score: 4 }]);

  const model = buildPhrasesViewModel({ document });
  assert.equal(model.rows[0].patternTemplate, "management[\\s\\/\\-]+of[\\s\\/\\-]+{real estate assets}");
  assert.equal(model.rows[0].matcher.tokens[2].setName, "real estate assets");
});

test("phrases document builder reads legacy object sets as memberships", async () => {
  const { buildPhrasesDocument } = await import("../app/models/phrases-document.mjs");

  const document = buildPhrasesDocument({
    rows: [
      {
        regex: "management of {asset}",
        setsText: '{"retail":["shopping center","gas station"],"real estate assets":["shopping center"]}',
        focusesText: "Property Management",
        notes: ""
      }
    ]
  });

  assert.deepEqual(document.rows, [
    {
      regex: "management of {asset}",
      sets: ["retail", "real estate assets"],
      focuses: [{ name: "Property Management", score: 3 }]
    }
  ]);
});
