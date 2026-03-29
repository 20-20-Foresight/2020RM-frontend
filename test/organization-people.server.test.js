const test = require("node:test");
const assert = require("node:assert/strict");

const { loadOrganizationPeoplePage } = require("../app/models/organization-people.server");

test("organization people loader calls the related-people REST endpoint and returns normalized data", async () => {
  const calls = [];
  const result = await loadOrganizationPeoplePage({
    request: new Request("http://localhost:3000/organization/org-1/people", {
      headers: {
        cookie: "sid=123"
      }
    }),
    organizationUUID: "org-1",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            organizationUUID: "org-1",
            entityType: "person",
            status: "completed",
            statusExplained: "Person lookup completed successfully.",
            results: [
              {
                uuid: "person-1",
                name: "Ada Lovelace",
                metadata: {
                  primaryemail: "ada@example.com"
                }
              }
            ],
            meta: {
              count: 1,
              limit: 25
            },
            schema: {
              namespace: "crm.schema",
              key: "person",
              version: 1,
              document: {
                fieldPaths: [
                  { path: "metadata.primaryemail" }
                ]
              }
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/organization/org-1/people");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(result, {
    organizationUUID: "org-1",
    entityType: "person",
    status: "completed",
    statusExplained: "Person lookup completed successfully.",
    results: [
      {
        uuid: "person-1",
        name: "Ada Lovelace",
        metadata: {
          primaryemail: "ada@example.com"
        }
      }
    ],
    meta: {
      count: 1,
      limit: 25
    },
    schema: {
      namespace: "crm.schema",
      key: "person",
      version: 1,
      document: {
        fieldPaths: [
          { path: "metadata.primaryemail" }
        ]
      }
    },
    error: null
  });
});
