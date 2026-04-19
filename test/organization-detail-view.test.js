const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildOrganizationHeaderViewModel,
  buildOrganizationOverviewViewModel,
  buildOrganizationLocationsViewModel
} = require("../app/models/organization-detail-view");

test("organization header view model prefers live organization metadata", () => {
  const result = buildOrganizationHeaderViewModel({
    record: {
      name: "Acme Aerospace",
      metadata: {
        website: "acme.example",
        phone: "+1 (312) 555-0100",
        socials: {
          linkedin: "https://www.linkedin.com/company/acme-aerospace"
        }
      }
    },
    schema: {
      document: {
        fieldPaths: [
          { path: "metadata.website" },
          { path: "metadata.phone" },
          { path: "metadata.socials.linkedin" }
        ]
      }
    },
    locations: [
      {
        city: "Chicago",
        regionCode: "IL",
        relationship: {
          metadata: {
            isHQ: true
          }
        }
      }
    ]
  });

  assert.deepEqual(result, {
    name: "Acme Aerospace",
    initials: "AA",
    hqLabel: "Chicago, IL",
    phone: "+1 (312) 555-0100",
    websiteLabel: "acme.example",
    websiteUrl: "https://acme.example",
    linkedInUrl: "https://www.linkedin.com/company/acme-aerospace"
  });
});

test("organization header view model formats phone objects with extensions", () => {
  const result = buildOrganizationHeaderViewModel({
    record: {
      name: "Acme Aerospace",
      metadata: {
        phone: {
          phone: "555-0101",
          ext: "22"
        }
      }
    },
    schema: {
      document: {
        fieldPaths: [{ path: "metadata.phone" }]
      }
    },
    locations: []
  });

  assert.equal(result.phone, "555-0101 x22");
});

test("organization header view model selects the first grouped phone value", () => {
  const result = buildOrganizationHeaderViewModel({
    record: {
      name: "Acme Aerospace",
      metadata: {
        phone: {
          work: [
            {
              phone: "+1 (312) 555-0199",
              extension: "104"
            }
          ],
          mobile: ["+1 (773) 555-0123"]
        }
      }
    },
    schema: {
      document: {
        fieldPaths: [{ path: "metadata.phone" }]
      }
    },
    locations: []
  });

  assert.equal(result.phone, "+1 (312) 555-0199 x104");
});

test("organization overview view model falls back to neutral placeholder values", () => {
  const result = buildOrganizationOverviewViewModel({
    record: {
      name: "Acme Aerospace"
    },
    schema: null,
    locations: []
  });

  assert.deepEqual(result, {
    description: "No organization description is available yet.",
    companySizeLabel: "0 employees",
    revenueLabel: "$0",
    customerSinceLabel: "Not available",
    accountHealthScore: 0,
    engagementLabel: "Unknown",
    churnRiskLabel: "Unknown",
    expertiseTags: ["Awaiting segmentation"]
  });
});

test("organization locations view model summarizes actual office records", () => {
  const result = buildOrganizationLocationsViewModel({
    locations: [
      {
        city: "Chicago",
        regionCode: "IL",
        countryCode: "US",
        relationship: {
          metadata: {
            isHQ: true
          }
        }
      },
      {
        city: "London",
        countryCode: "GB"
      }
    ]
  });

  assert.deepEqual(result.summary, {
    totalLocations: 2,
    globalHeadcount: 0,
    timezoneCount: 2,
    hqLabel: "Chicago, IL"
  });
  assert.equal(result.cards.length, 2);
  assert.deepEqual(result.cards[0], {
    key: "Chicago, IL-0",
    heading: "Chicago, IL",
    address: "Address not available",
    badge: "HQ",
    headcountLabel: "0 employees"
  });
});
