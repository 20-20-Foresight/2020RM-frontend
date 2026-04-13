const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildOrganizationSegmentationViewModel
} = require("../app/models/organization-segmentation");

test("buildOrganizationSegmentationViewModel chooses the most common sector and filters empty chips", () => {
  const result = buildOrganizationSegmentationViewModel({
    metadata: {
      segmentation: {
        sector: "real estate",
        industry: [
          "real estate operating companies",
          "",
          "investment services",
          "  "
        ],
        focus: [
          "development",
          " ",
          "property management"
        ],
        reasons: [
          {
            source: "preqin",
            sector: "Real Estate",
            industry: "Real Estate Operating Companies",
            focus: "Development",
            match: "redevelopment",
            phrase: "development, redevelopment and management of real estate assets"
          },
          {
            source: "linkedin",
            sector: "Financial Services",
            industry: "Investment Services",
            match: "Investment Management",
            phrase: "Owner's Representative & Investment Management firm"
          },
          {
            source: "salesnav",
            sector: "Real Estate",
            match: "Real Estate",
            reason: 'Industry Listed: "Real Estate"'
          }
        ]
      }
    }
  });

  assert.deepEqual(result.sectors, [
    "Real Estate",
    "Financial Services"
  ]);
  assert.equal(result.primarySector, "Real Estate");
  assert.deepEqual(result.industries, [
    "real estate operating companies",
    "investment services"
  ]);
  assert.deepEqual(result.focuses, [
    "development",
    "property management"
  ]);
  assert.equal(result.explanations.length, 3);
  assert.match(result.explanations[0].reasonHtml, /<mark>/);
});

test("buildOrganizationSegmentationViewModel uses nested projection reasons when available", () => {
  const result = buildOrganizationSegmentationViewModel({
    entityDimensionProjection: {
      industry: [
        {
          name: "PE RE",
          score: 8,
          sourceDocumentName: "Description Rules",
          reasons: [
            {
              reason: {
                source: "description",
                match: "reit",
                phrase: "Public REIT platform with private real estate investments"
              },
              crosswalkDocumentName: "Description Rules",
              rule: "row-reit-1"
            }
          ]
        }
      ],
      focus: [
        {
          name: "REIT",
          score: 5,
          reasons: [
            {
              reason: {
                source: "description",
                description: "Derived from existing data, awaiting fresh segmentation"
              },
              crosswalkDocumentName: "Description Rules",
              rule: "row-reit-1"
            }
          ]
        }
      ]
    }
  });

  assert.deepEqual(result.industries, ["PE RE"]);
  assert.deepEqual(result.focuses, ["REIT"]);
  assert.equal(result.explanations.length, 2);
  assert.deepEqual(result.explanations[0], {
    source: "description",
    dimension: "Industry",
    value: "PE RE",
    score: 8,
    crosswalkDocumentName: "Description Rules",
    rule: "row-reit-1",
    reasonHtml:
      "&ldquo;Public <mark>REIT</mark> platform with private real estate investments...&rdquo;"
  });
});

test("buildOrganizationSegmentationViewModel falls back to top-level segmentation data", () => {
  const result = buildOrganizationSegmentationViewModel({
    segmentation: {
      sector: "Financial Services",
      industry: [
        "banking services"
      ],
      focus: [
        "retail banking"
      ],
      reasons: []
    }
  });

  assert.deepEqual(result, {
    primarySector: "Financial Services",
    sectors: [
      "Financial Services"
    ],
    industries: [
      "banking services"
    ],
    focuses: [
      "retail banking"
    ],
    explanations: []
  });
});

test("buildOrganizationSegmentationViewModel returns null when segmentation has no usable values", () => {
  const result = buildOrganizationSegmentationViewModel({
    metadata: {
      segmentation: {
        sector: " ",
        industry: [
          ""
        ],
        focus: [
          "  "
        ],
        reasons: [
          {
            source: "linkedin",
            sector: " ",
            reason: ""
          }
        ]
      }
    }
  });

  assert.equal(result, null);
});

test("buildOrganizationSegmentationViewModel escapes explanation fallback text", () => {
  const result = buildOrganizationSegmentationViewModel({
    metadata: {
      segmentation: {
        sector: "Technology",
        industry: [
          "software"
        ],
        focus: [],
        reasons: [
          {
            source: "custom",
            sector: "Technology",
            reason: "Used <unsafe> literal"
          }
        ]
      }
    }
  });

  assert.equal(result.explanations.length, 1);
  assert.match(result.explanations[0].reasonHtml, /&lt;unsafe&gt;/);
});
