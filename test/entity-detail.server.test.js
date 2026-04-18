const test = require("node:test");
const assert = require("node:assert/strict");

const { loadEntityDetailPage } = require("../app/models/entity-detail.server");
const {
  buildEntityDetailPath,
  buildOrganizationDetailTabPath,
  buildEntityListPath,
  buildOrganizationPeoplePath
} = require("../app/models/entity-route");

test("buildEntityDetailPath returns the singular organization route", () => {
  assert.equal(buildEntityDetailPath("organization", "org-1"), "/organization/org-1");
});

test("buildEntityDetailPath returns the singular person route", () => {
  assert.equal(buildEntityDetailPath("person", "person-1"), "/person/person-1");
});

test("buildOrganizationPeoplePath returns the organization people route", () => {
  assert.equal(buildOrganizationPeoplePath("org-1"), "/organization/org-1/people");
});

test("buildOrganizationDetailTabPath returns the expected organization tab routes", () => {
  assert.equal(buildOrganizationDetailTabPath("org-1", "overview"), "/organization/org-1");
  assert.equal(buildOrganizationDetailTabPath("org-1", "contacts"), "/organization/org-1/people");
  assert.equal(buildOrganizationDetailTabPath("org-1", "jobs"), "/organization/org-1/jobs");
  assert.equal(buildOrganizationDetailTabPath("org-1", "outreach"), "/organization/org-1/outreach");
  assert.equal(
    buildOrganizationDetailTabPath("org-1", "similarOrganizations"),
    "/organization/org-1/similar-organizations"
  );
  assert.equal(buildOrganizationDetailTabPath("org-1", "locations"), "/organization/org-1/locations");
  assert.equal(buildOrganizationDetailTabPath("org-1", "notes"), "/organization/org-1/notes");
});

test("buildEntityListPath returns the matching list route", () => {
  assert.equal(buildEntityListPath("organization"), "/organizations");
  assert.equal(buildEntityListPath("person"), "/people");
});

test("entity detail loader calls the organization detail REST endpoint and returns normalized detail data", async () => {
  const calls = [];
  const result = await loadEntityDetailPage({
    request: new Request("http://localhost:3000/organization/org-1", {
      headers: {
        cookie: "sid=123"
      }
    }),
    entityType: "organization",
    uuid: "org-1",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            entityType: "organization",
            uuid: "org-1",
            status: "completed",
            statusExplained: "Organization detail loaded successfully.",
            record: {
              uuid: "org-1",
              name: "Acme",
              description: "Industrial manufacturer.",
              entityDimensionProjection: {
                industry: [
                  {
                    name: "Industrial",
                    score: 7,
                    reasons: [
                      {
                        crosswalk: "Description Rules",
                        rule: "row-1",
                        reason: {
                          description: "Keyword match"
                        }
                      }
                    ]
                  }
                ],
                focus: [
                  {
                    name: "Manufacturing",
                    score: 3,
                    reasons: []
                  }
                ]
              }
            },
            locations: [
              {
                uuid: "loc-1",
                city: "Chicago",
                regionCode: "IL"
              }
            ],
            meta: {
              count: 1
            },
            schema: {
              namespace: "crm.schema",
              key: "organization",
              version: 1,
              document: {
                fieldPaths: [
                  { path: "metadata.website" }
                ]
              }
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/organization/org-1");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(result, {
    entityType: "organization",
    uuid: "org-1",
    status: "completed",
    statusExplained: "Organization detail loaded successfully.",
    record: {
      uuid: "org-1",
      name: "Acme",
      description: "Industrial manufacturer.",
      entityDimensionProjection: {
        industry: [
          {
            name: "Industrial",
            score: 7,
            reasons: [
              {
                crosswalk: "Description Rules",
                rule: "row-1",
                reason: {
                  description: "Keyword match"
                }
              }
            ]
          }
        ],
        focus: [
          {
            name: "Manufacturing",
            score: 3,
            reasons: []
          }
        ]
      }
    },
    locations: [
      {
        uuid: "loc-1",
        city: "Chicago",
        regionCode: "IL"
      }
    ],
    meta: {
      count: 1
    },
    schema: {
      namespace: "crm.schema",
      key: "organization",
      version: 1,
      document: {
        fieldPaths: [
          { path: "metadata.website" }
        ]
      }
    },
    error: null
  });
});

test("entity detail loader returns a not found state when the backend returns 404", async () => {
  const result = await loadEntityDetailPage({
    request: new Request("http://localhost:3000/person/person-404"),
    entityType: "person",
    uuid: "person-404",
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      async json() {
        return {
          message: "Person not found."
        };
      }
    })
  });

  assert.deepEqual(result, {
    entityType: "person",
    uuid: "person-404",
    status: "not_found",
    statusExplained: "Requested record was not found.",
    record: null,
    locations: [],
    meta: {
      count: 0
    },
    schema: null,
    error: "Person not found."
  });
});
