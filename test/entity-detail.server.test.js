const test = require("node:test");
const assert = require("node:assert/strict");

const { loadEntityDetailPage } = require("../app/models/entity-detail.server");
const { buildEntityDetailPath, buildEntityListPath } = require("../app/models/entity-route");

test("buildEntityDetailPath returns the singular organization route", () => {
  assert.equal(buildEntityDetailPath("organization", "org-1"), "/organization/org-1");
});

test("buildEntityDetailPath returns the singular person route", () => {
  assert.equal(buildEntityDetailPath("person", "person-1"), "/person/person-1");
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
              description: "Industrial manufacturer."
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
      description: "Industrial manufacturer."
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
