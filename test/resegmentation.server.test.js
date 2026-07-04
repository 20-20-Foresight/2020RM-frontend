const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ResegmentationApiError,
  loadResegmentationLists,
  loadResegmentationListDetail,
  loadResegmentationOrganization,
  runOrganizationResegmentation,
  searchResegmentationOrganizations,
} = require("../app/models/resegmentation.server");

test("loadResegmentationLists calls the normalized backend resegmentation REST route", async () => {
  const calls = [];
  const result = await loadResegmentationLists({
    request: new Request("http://localhost:3000/tools/resegmentation", {
      headers: {
        cookie: "sid=123",
      },
    }),
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options,
      });
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            statusExplained: "Lists loaded successfully.",
            lists: [
              {
                uuid: "list-1",
                name: "Resegmentation Test - Rose Organizations",
              },
            ],
            meta: {
              count: 1,
            },
          };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/resegmentation/lists");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(calls[0].options.headers["content-type"], undefined);
  assert.deepEqual(result, {
    status: "completed",
    statusExplained: "Lists loaded successfully.",
    data: [
      {
        uuid: "list-1",
        name: "Resegmentation Test - Rose Organizations",
      },
    ],
    meta: {
      count: 1,
    },
  });
});

test("searchResegmentationOrganizations calls the normalized backend organization search route", async () => {
  const calls = [];
  await searchResegmentationOrganizations({
    request: new Request("http://localhost:3000/tools/resegmentation"),
    query: " rose ",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        method: options.method,
      });
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            statusExplained: "Organization lookup completed.",
            organizations: [],
            meta: {
              count: 0,
            },
          };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/resegmentation/organizations?name=rose");
  assert.equal(calls[0].method, "GET");
});

test("loadResegmentationOrganization calls the normalized organization detail route", async () => {
  const calls = [];
  const result = await loadResegmentationOrganization({
    request: new Request("http://localhost:3000/tools/resegmentation"),
    uuid: "org-123",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        method: options.method,
      });
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            statusExplained: "Organization export loaded successfully.",
            organization: {
              uuid: "org-123",
              type: "organization",
              name: "Rose Builders Group",
            },
            meta: {
              uuid: "org-123",
            },
          };
        },
      };
    },
  });

  assert.equal(calls[0].url, "http://localhost:3000/api/rest/resegmentation/organizations/org-123");
  assert.equal(calls[0].method, "GET");
  assert.equal(result.data.uuid, "org-123");
});

test("loadResegmentationListDetail calls the normalized list detail route", async () => {
  const calls = [];
  const result = await loadResegmentationListDetail({
    request: new Request("http://localhost:3000/tools/resegmentation"),
    uuid: "list-123",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        method: options.method,
      });
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            statusExplained: "List detail loaded successfully.",
            listDetail: {
              list: {
                uuid: "list-123",
              },
              members: [],
            },
            meta: {
              memberCount: 0,
            },
          };
        },
      };
    },
  });

  assert.equal(calls[0].url, "http://localhost:3000/api/rest/resegmentation/lists/list-123");
  assert.equal(calls[0].method, "GET");
  assert.equal(result.data.list.uuid, "list-123");
});

test("runOrganizationResegmentation calls the normalized segment route", async () => {
  const calls = [];
  const result = await runOrganizationResegmentation({
    request: new Request("http://localhost:3000/tools/resegmentation"),
    uuid: "org-123",
    dryRun: false,
    saveSalesforce: true,
    includeExplanation: true,
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        method: options.method,
        headers: options.headers,
        body: JSON.parse(options.body),
      });
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            statusExplained: "Organization resegmentation completed successfully.",
            resegmentation: {
              organization: {
                uuid: "org-123",
              },
              persisted: true,
            },
            meta: {
              uuid: "org-123",
            },
          };
        },
      };
    },
  });

  assert.equal(calls[0].url, "http://localhost:3000/api/rest/resegmentation/organizations/org-123/segment");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers["content-type"], "application/json");
  assert.deepEqual(calls[0].body, {
    dryRun: false,
    saveSalesforce: true,
    includeExplanation: true,
  });
  assert.equal(result.data.persisted, true);
});

test("frontend resegmentation helpers raise ResegmentationApiError on backend API failures", async () => {
  await assert.rejects(
    async () => {
      await loadResegmentationLists({
        request: new Request("http://localhost:3000/tools/resegmentation"),
        fetchImpl: async () => ({
          ok: false,
          status: 502,
          async json() {
            return {
              message: "Upstream RPC request failed.",
            };
          },
        }),
      });
    },
    (error) => {
      assert.ok(error instanceof ResegmentationApiError);
      assert.equal(error.statusCode, 502);
      assert.equal(error.message, "Upstream RPC request failed.");
      return true;
    }
  );
});

test("frontend resegmentation helpers report plain text upstream failures", async () => {
  await assert.rejects(
    async () => {
      await loadResegmentationLists({
        request: new Request("http://localhost:3000/tools/resegmentation"),
        fetchImpl: async () => ({
          ok: false,
          status: 404,
          async text() {
            return "Not Found";
          },
        }),
      });
    },
    (error) => {
      assert.ok(error instanceof ResegmentationApiError);
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, "Not Found");
      return true;
    }
  );
});
