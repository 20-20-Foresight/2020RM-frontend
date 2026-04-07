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
