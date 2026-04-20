const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPersonHeaderViewModel,
  buildPersonOverviewViewModel
} = require("../app/models/person-detail-view");

test("person detail view model uses positionlevel, relationship-derived company data, and normalized skills", () => {
  const relationships = [
    {
      uuid: "rel-current",
      relation: "EMPLOYED_BY",
      entity1uuid: "org-2",
      entity2uuid: "person-1",
      metadata: {
        title: "Chief Mathematician"
      },
      organization: {
        uuid: "org-2",
        name: "Analytical Engines"
      }
    }
  ];
  const workHistory = [
    {
      relationshipUUID: "rel-current",
      organizationUUID: "org-2",
      organization: "Analytical Engines",
      title: "Chief Mathematician",
      start: "1836-01-01T00:00:00.000Z",
      end: null,
      current: true
    },
    {
      relationshipUUID: "rel-ignored",
      organizationUUID: "org-2",
      organization: "Analytical Engines",
      title: null,
      start: null,
      end: null,
      current: true
    },
    {
      relationshipUUID: "rel-prior",
      organizationUUID: "org-1",
      organization: "Byron Labs",
      title: "Analyst",
      start: "1833-01-01T00:00:00.000Z",
      end: "1835-01-01T00:00:00.000Z",
      current: false
    }
  ];
  const locations = [
    {
      uuid: "loc-office",
      city: "London",
      regionCode: "LDN",
      countryCode: "UK",
      subject: {
        uuid: "org-2",
        type: "organization",
        name: "Analytical Engines"
      },
      relationship: {
        uuid: "rel-office",
        relation: "OFFICE_OF",
        metadata: {
          isHQ: true
        }
      }
    },
    {
      uuid: "loc-home",
      city: "Oxford",
      regionCode: "OXF",
      countryCode: "UK",
      subject: {
        uuid: "person-1",
        type: "person",
        name: "Ada Lovelace"
      },
      relationship: {
        uuid: "rel-home",
        relation: "RESIDES_AT"
      }
    }
  ];
  const record = {
    uuid: "person-1",
    name: "Ada Lovelace",
    positionlevel: "Other",
    metadata: {
      skills: "Mathematics, Analytical Engines, Computation"
    }
  };

  const header = buildPersonHeaderViewModel({
    record,
    schema: null,
    locations,
    relationships
  });
  const overview = buildPersonOverviewViewModel({
    record,
    schema: null,
    locations,
    relationships,
    workHistory
  });

  assert.equal(header.organizationLabel, "Analytical Engines");
  assert.equal(overview.levelLabel, "Other");
  assert.equal(overview.tenureLabel, "190 years");
  assert.deepEqual(overview.expertiseTags, [
    "Mathematics",
    "Analytical Engines",
    "Computation"
  ]);
  assert.equal(overview.officeLocationLabel, "London, LDN");
  assert.equal(overview.homeLocationLabel, "Oxford, OXF");
  assert.deepEqual(overview.education, []);
  assert.deepEqual(overview.workHistory, [
    {
      title: "Chief Mathematician",
      subtitle: "Analytical Engines • 1836 — Present",
      description: "Professional history details are not connected yet."
    },
    {
      title: "Analyst",
      subtitle: "Byron Labs • 1833 — 1835",
      description: "Professional history details are not connected yet."
    }
  ]);
});

test("person detail view model normalizes array-shaped metadata.skills values", () => {
  const overview = buildPersonOverviewViewModel({
    record: {
      uuid: "person-2",
      name: "Grace Hopper",
      metadata: {
        skills: [
          "Compilers",
          {
            name: "COBOL"
          },
          {
            value: "Distributed Systems"
          }
        ]
      }
    },
    schema: null,
    locations: [],
    relationships: []
  });

  assert.deepEqual(overview.expertiseTags, [
    "Compilers",
    "COBOL",
    "Distributed Systems"
  ]);
});
