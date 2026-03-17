const test = require("node:test");
const assert = require("node:assert/strict");

const { loadRestSearchPage } = require("../app/models/rest-search.server");

test("rest search loader returns idle state when name is missing", async () => {
  const result = await loadRestSearchPage({
    request: new Request("http://localhost:3000/organizations"),
    entityType: "organization",
    fetchImpl: async () => {
      throw new Error("fetch should not be called");
    }
  });

  assert.deepEqual(result, {
    query: {
      name: ""
    },
    status: "idle",
    statusExplained: "Enter a name to search organizations.",
    results: [],
    meta: {
      count: 0
    },
    error: null
  });
});

test("rest search loader calls the organization REST endpoint and returns normalized results", async () => {
  const calls = [];
  const result = await loadRestSearchPage({
    request: new Request("http://localhost:3000/organizations?name=Acme", {
      headers: {
        cookie: "sid=123"
      }
    }),
    entityType: "organization",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            query: {
              name: "Acme"
            },
            status: "completed",
            statusExplained: "Organization lookup completed successfully.",
            results: [
              {
                uuid: "org-1",
                name: "Acme"
              }
            ],
            meta: {
              count: 1,
              limit: 25
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/organization?name=Acme");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(result, {
    query: {
      name: "Acme"
    },
    status: "completed",
    statusExplained: "Organization lookup completed successfully.",
    results: [
      {
        uuid: "org-1",
        name: "Acme"
      }
    ],
    meta: {
      count: 1,
      limit: 25
    },
    error: null
  });
});

test("rest search loader returns an error state when the backend request fails", async () => {
  const result = await loadRestSearchPage({
    request: new Request("http://localhost:3000/people?name=Ada"),
    entityType: "person",
    fetchImpl: async () => ({
      ok: false,
      async json() {
        return {
          message: "Upstream RPC request failed."
        };
      }
    })
  });

  assert.deepEqual(result, {
    query: {
      name: "Ada"
    },
    status: "failed",
    statusExplained: "Search request failed.",
    results: [],
    meta: {
      count: 0
    },
    error: "Upstream RPC request failed."
  });
});
