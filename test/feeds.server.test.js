const test = require("node:test");
const assert = require("node:assert/strict");

const {
  FeedApiError,
  buildEmptyFeed,
  computeFeedStats,
  createFeed,
  deleteFeed,
  groupFeedsBySource,
  loadFeedDestinationLists,
  loadFeedRunById,
  loadFeedById,
  loadFeedsList,
  loadMockFeedsList,
  previewFeed,
  refreshFeed,
  saveFeedToQueue,
  setFeedEnabled,
  updateFeed
} = require("../app/models/feeds.server");

test("loadFeedsList calls the normalized feed list REST route and preserves cookies", async () => {
  const calls = [];
  const feeds = await loadFeedsList({
    request: new Request("http://localhost:3000/settings/feeds", {
      headers: {
        cookie: "sid=123"
      }
    }),
    source: " preqin ",
    enabled: true,
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            feeds: [
              {
                id: 14,
                name: "Growth Funds",
                source: "preqin",
                enabled: true,
                interval_days: 7,
                settings: {
                  investorType: ["Growth Equity"]
                }
              }
            ]
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds?source=preqin&enabled=true");
  assert.equal(calls[0].options.method, undefined);
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(feeds.length, 1);
  assert.equal(feeds[0].id, 14);
  assert.equal(feeds[0].name, "Growth Funds");
  assert.equal(feeds[0].source, "preqin");
  assert.equal(feeds[0].enabled, true);
  assert.equal(feeds[0].interval_days, 7);
  assert.deepEqual(feeds[0].settings, {
    investorType: ["Growth Equity"]
  });
});

test("loadFeedDestinationLists calls the feed list-source route", async () => {
  const calls = [];
  const lists = await loadFeedDestinationLists({
    request: new Request("http://localhost:3000/settings/feeds/new", {
      headers: {
        cookie: "sid=123"
      }
    }),
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            lists: [
              {
                uuid: "list-14",
                name: "Target Accounts",
                listTypeSlug: "LIST"
              }
            ]
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds/lists");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(lists, [
    {
      uuid: "list-14",
      name: "Target Accounts",
      listTypeSlug: "LIST"
    }
  ]);
});

test("loadFeedById returns null on 404", async () => {
  const feed = await loadFeedById({
    request: new Request("http://localhost:3000/settings/feeds/14"),
    id: 14,
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      async json() {
        return {
          message: "Feed not found."
        };
      }
    })
  });

  assert.equal(feed, null);
});

test("createFeed posts the feed payload to the REST route", async () => {
  const calls = [];
  const feed = await createFeed({
    request: new Request("http://localhost:3000/settings/feeds/new", {
      headers: {
        cookie: "sid=123"
      }
    }),
    feed: {
      name: "Growth Funds",
      source: "preqin",
      interval_days: 7,
      enabled: true,
      settings: {
        investorType: ["Growth Equity"]
      }
    },
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            feed: {
              id: 14,
              name: "Growth Funds",
              source: "preqin",
              enabled: true
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(calls[0].options.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    name: "Growth Funds",
    source: "preqin",
    interval_days: 7,
    enabled: true,
    settings: {
      investorType: ["Growth Equity"]
    }
  });
  assert.equal(feed.id, 14);
  assert.equal(feed.name, "Growth Funds");
  assert.equal(feed.source, "preqin");
  assert.equal(feed.enabled, true);
});

test("updateFeed uses the feed detail REST route", async () => {
  const calls = [];
  const feed = await updateFeed({
    request: new Request("http://localhost:3000/settings/feeds/14", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: 14,
    feed: {
      name: "Updated Growth Funds",
      interval_days: 14,
      enabled: false
    },
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            feed: {
              id: 14,
              name: "Updated Growth Funds",
              source: "preqin",
              enabled: false
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds/14");
  assert.equal(calls[0].options.method, "PUT");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    name: "Updated Growth Funds",
    interval_days: 14,
    enabled: false
  });
  assert.equal(feed.enabled, false);
});

test("setFeedEnabled uses the enabled patch route", async () => {
  const calls = [];
  const feed = await setFeedEnabled({
    request: new Request("http://localhost:3000/settings/feeds", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: 14,
    enabled: false,
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            feed: {
              id: 14,
              name: "Growth Funds",
              source: "preqin",
              enabled: false
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds/14/enabled");
  assert.equal(calls[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    enabled: false
  });
  assert.equal(feed.enabled, false);
});

test("previewFeed posts the preview payload to the preview route", async () => {
  const calls = [];
  const preview = await previewFeed({
    request: new Request("http://localhost:3000/settings/feeds/new", {
      headers: {
        cookie: "sid=123"
      }
    }),
    feed: {
      source: "preqin",
      name: "Growth Funds"
    },
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            preview: {
              source: "preqin",
              resultCount: 12,
              eligibleCount: 4,
              results: []
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds/preview");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    source: "preqin",
    name: "Growth Funds"
  });
  assert.equal(preview.resultCount, 12);
});

test("saveFeedToQueue posts linked list metadata to the save-to-queue route", async () => {
  const calls = [];
  const run = await saveFeedToQueue({
    request: new Request("http://localhost:3000/settings/feeds/14", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: 14,
    linkedListName: "Growth Funds",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            run: {
              id: 88,
              feed_id: 14,
              run_type: "save",
              status: "pending"
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds/14/save-to-queue");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    linkedListName: "Growth Funds"
  });
  assert.equal(run.id, 88);
  assert.equal(run.status, "pending");
});

test("refreshFeed posts to the refresh route and normalizes the run", async () => {
  const calls = [];
  const run = await refreshFeed({
    request: new Request("http://localhost:3000/settings/feeds/14", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: 14,
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        async json() {
          return {
            run: {
              id: 89,
              feed_id: 14,
              run_type: "refresh",
              status: "pending"
            }
          };
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds/14/refresh");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {});
  assert.equal(run.run_type, "refresh");
});

test("loadFeedRunById returns null on 404 and normalizes runs on success", async () => {
  const notFound = await loadFeedRunById({
    request: new Request("http://localhost:3000/settings/feeds/14"),
    id: 91,
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      async json() {
        return {
          message: "Feed run not found."
        };
      }
    })
  });

  const loaded = await loadFeedRunById({
    request: new Request("http://localhost:3000/settings/feeds/14"),
    id: 88,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          run: {
            id: 88,
            feed_id: 14,
            run_type: "save",
            status: "completed",
            queued_count: 5
          }
        };
      }
    })
  });

  assert.equal(notFound, null);
  assert.equal(loaded.id, 88);
  assert.equal(loaded.queued_count, 5);
});

test("deleteFeed uses the feed detail delete route", async () => {
  const calls = [];
  await deleteFeed({
    request: new Request("http://localhost:3000/settings/feeds/14", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: 14,
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });

      return {
        ok: true,
        status: 204,
        async json() {
          throw new Error("json should not be called");
        }
      };
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://localhost:3000/api/rest/feeds/14");
  assert.equal(calls[0].options.method, "DELETE");
});

test("feed api helpers raise FeedApiError when the backend request fails", async () => {
  await assert.rejects(
    () =>
      loadFeedsList({
        request: new Request("http://localhost:3000/settings/feeds"),
        fetchImpl: async () => ({
          ok: false,
          status: 502,
          async json() {
            return {
              message: "Upstream RPC request failed."
            };
          }
        })
      }),
    (error) => {
      assert.ok(error instanceof FeedApiError);
      assert.equal(error.message, "Upstream RPC request failed.");
      assert.equal(error.statusCode, 502);
      return true;
    }
  );
});

test("feed helpers continue to provide stable mock/design utilities", async () => {
  const mockFeeds = await loadMockFeedsList();

  assert.equal(mockFeeds.length > 0, true);
  assert.deepEqual(buildEmptyFeed("preqin"), {
    id: null,
    name: "",
    source: "preqin",
    description: "",
    reason: "",
    interval_days: 7,
    priority: 10,
    records_limit: 100,
    crm_age_days: 90,
    enabled: true,
    settings: {},
    last_run_started_at: null,
    last_run_completed_at: null,
    last_run_status: null,
    last_result_count: null,
    last_queued_count: null,
    last_error: null,
    next_run_at: null
  });
  assert.deepEqual(computeFeedStats([
    { enabled: true, last_run_status: "running" },
    { enabled: false, last_run_status: "failed" }
  ]), {
    total: 2,
    enabled: 1,
    running: 1,
    failed: 1
  });
  assert.deepEqual(groupFeedsBySource([
    { id: 1, source: "preqin" },
    { id: 2, source: "preqin" },
    { id: 3, source: "biscred" }
  ]), {
    preqin: [
      { id: 1, source: "preqin" },
      { id: 2, source: "preqin" }
    ],
    biscred: [
      { id: 3, source: "biscred" }
    ]
  });
});
