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

test("loadResegmentationLists calls the backend RPC proxy with the organization-list filters", async () => {
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
        body: JSON.parse(options.body),
      });
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            status_explained: "Lists loaded successfully.",
            response: [
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
  assert.equal(calls[0].url, "http://localhost:3000/api/rpc");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(calls[0].options.headers["content-type"], "application/json");
  assert.deepEqual(calls[0].body, {
    mode: "sync-required",
    actions: [
      {
        name: "result",
        action: "entity/findList",
        settings: {
          listTypeSlug: "LIST",
          listSubTypeSlug: "ORGANIZATION",
          subjectType: "organization",
          status: "active",
          membershipMode: "static",
          limit: 100,
        },
        respond: true,
      },
    ],
  });
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

test("searchResegmentationOrganizations calls the organization lookup RPC", async () => {
  const calls = [];
  await searchResegmentationOrganizations({
    request: new Request("http://localhost:3000/tools/resegmentation"),
    query: " rose ",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        body: JSON.parse(options.body),
      });
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            status_explained: "Organization lookup completed.",
            response: [],
            meta: {
              count: 0,
            },
          };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rpc");
  assert.deepEqual(calls[0].body.actions[0].settings, {
    name: "rose",
    limit: 20,
  });
});

test("loadResegmentationOrganization calls exportOrganization", async () => {
  const calls = [];
  const result = await loadResegmentationOrganization({
    request: new Request("http://localhost:3000/tools/resegmentation"),
    uuid: "org-123",
    fetchImpl: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            status_explained: "Organization export loaded successfully.",
            response: {
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

  assert.equal(calls[0].actions[0].action, "entity/exportOrganization");
  assert.deepEqual(calls[0].actions[0].settings, {
    uuid: "org-123",
  });
  assert.equal(result.data.uuid, "org-123");
});

test("loadResegmentationListDetail calls getListDetail", async () => {
  const calls = [];
  const result = await loadResegmentationListDetail({
    request: new Request("http://localhost:3000/tools/resegmentation"),
    uuid: "list-123",
    fetchImpl: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            status_explained: "List detail loaded successfully.",
            response: {
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

  assert.equal(calls[0].actions[0].action, "entity/getListDetail");
  assert.equal(result.data.list.uuid, "list-123");
});

test("runOrganizationResegmentation calls the resegmentation RPC", async () => {
  const calls = [];
  const result = await runOrganizationResegmentation({
    request: new Request("http://localhost:3000/tools/resegmentation"),
    uuid: "org-123",
    dryRun: false,
    saveSalesforce: true,
    includeExplanation: true,
    fetchImpl: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        ok: true,
        async json() {
          return {
            status: "completed",
            status_explained: "Organization resegmentation completed successfully.",
            response: {
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

  assert.equal(calls[0].actions[0].action, "entity/resegmentOrganization");
  assert.deepEqual(calls[0].actions[0].settings, {
    uuid: "org-123",
    dryRun: false,
    saveSalesforce: true,
    includeExplanation: true,
  });
  assert.equal(result.data.persisted, true);
});

test("frontend resegmentation helpers raise ResegmentationApiError on RPC failures", async () => {
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
