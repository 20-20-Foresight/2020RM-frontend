const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CompanyResearchManualListsApiError,
  loadManualListDetail,
  loadManualLists,
} = require("../app/models/company-research-manual-lists.server");

test("loadManualLists reads the organization list endpoint", async () => {
  const calls = [];
  const lists = await loadManualLists({
    request: new Request("http://localhost:3000/settings/company-research/manual-lists", {
      headers: {
        cookie: "sid=123",
      },
    }),
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return {
        ok: true,
        async json() {
          return {
            lists: [
              {
                uuid: "list-1",
                name: "June Targets",
                memberCount: 12,
                status: "active",
              },
            ],
          };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/resegmentation/lists");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(lists.length, 1);
  assert.equal(lists[0].uuid, "list-1");
  assert.equal(lists[0].name, "June Targets");
  assert.equal(lists[0].memberCount, 12);
});

test("loadManualListDetail reads one list detail payload", async () => {
  const detail = await loadManualListDetail({
    request: new Request("http://localhost:3000/settings/company-research/manual-lists"),
    uuid: "list-1",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          listDetail: {
            list: {
              uuid: "list-1",
              name: "June Targets",
              memberCount: 12,
            },
            members: [{ uuid: "membership-1" }],
            targets: [],
          },
        };
      },
    }),
  });

  assert.equal(detail.list.uuid, "list-1");
  assert.equal(detail.list.name, "June Targets");
  assert.equal(detail.members.length, 1);
});

test("loadManualLists throws normalized API errors", async () => {
  await assert.rejects(
    () =>
      loadManualLists({
        request: new Request("http://localhost:3000/settings/company-research/manual-lists"),
        fetchImpl: async () => ({
          ok: false,
          status: 500,
          async json() {
            return {
              error: "manual_lists_failed",
              message: "Manual lists unavailable",
            };
          },
        }),
      }),
    (error) => {
      assert.ok(error instanceof CompanyResearchManualListsApiError);
      assert.equal(error.code, "manual_lists_failed");
      assert.equal(error.message, "Manual lists unavailable");
      assert.equal(error.statusCode, 500);
      return true;
    }
  );
});
