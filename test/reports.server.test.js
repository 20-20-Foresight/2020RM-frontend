const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ReportApiError,
  createReportList,
  loadReportById,
  loadReportPreview,
  loadReportRunById,
  loadReportsList,
  runReport,
  setReportFavorite
} = require("../app/models/reports.server");

test("loadReportsList calls the normalized reports REST route and preserves cookies", async () => {
  const calls = [];
  const payload = await loadReportsList({
    request: new Request("http://localhost:3000/reports/list", {
      headers: {
        cookie: "sid=123"
      }
    }),
    category: " Status and Review ",
    view: " favorites ",
    q: " recent ",
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options
      });
      return {
        ok: true,
        async json() {
          return {
            reports: [
              {
                id: 22,
                key: "recent-organizations-segmentation",
                name: "Recently Added Organizations and Segmentation",
                favorite: true,
                defaultViewMode: "interactive"
              }
            ],
            cards: [
              {
                key: "all",
                label: "All Reports",
                count: 1,
                href: "/reports/list"
              }
            ]
          };
        }
      };
    }
  });

  assert.equal(
    calls[0].url,
    "http://localhost:3000/api/rest/reports?category=Status+and+Review&view=favorites&q=recent"
  );
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(payload.reports[0].id, 22);
  assert.equal(payload.cards[0].label, "All Reports");
});

test("loadReportById returns null on 404", async () => {
  const report = await loadReportById({
    request: new Request("http://localhost:3000/reports/22"),
    id: 22,
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      async json() {
        return {
          error: "report_not_found",
          message: "Report not found."
        };
      }
    })
  });

  assert.equal(report, null);
});

test("loadReportRunById returns the normalized run payload", async () => {
  const run = await loadReportRunById({
    request: new Request("http://localhost:3000/reports/22?runId=81"),
    id: 81,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          run: {
            id: 81,
            status: "completed",
            pages: [
              {
                pageKey: "recent-organizations",
                pageTitle: "Recent Organizations",
                columns: [
                  {
                    field: "organization.name",
                    label: "Organization"
                  }
                ],
                rows: [
                  {
                    visible: {
                      "organization.name": "Acme"
                    }
                  }
                ]
              }
            ]
          }
        };
      }
    })
  });

  assert.equal(run.id, 81);
  assert.equal(run.pages[0].pageTitle, "Recent Organizations");
  assert.equal(run.pages[0].rows[0].visible["organization.name"], "Acme");
});

test("loadReportPreview calls the preview route with paging and date filters", async () => {
  const calls = [];
  const preview = await loadReportPreview({
    request: new Request("http://localhost:3000/reports/22?runId=81", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: 22,
    pageKey: "recently-changed-salesforce-organizations",
    offset: 100,
    limit: 100,
    runtimeFilters: {
      changed_range: {
        from: "2026-05-01T00:00:00.000Z",
        to: "2026-05-14T23:59:59.999Z"
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
            preview: {
              definitionVersionId: 5,
              pages: [
                {
                  pageKey: "recently-changed-salesforce-organizations",
                  pageTitle: "Recently Changed Salesforce Organizations",
                  columns: [
                    {
                      field: "organization.name",
                      label: "Organization Name"
                    }
                  ],
                  rows: [
                    {
                      visible: {
                        "organization.name": "Acme"
                      }
                    }
                  ],
                  rowCount: 100,
                  totalCount: 250,
                  offset: 100,
                  limit: 100
                }
              ]
            }
          };
        }
      };
    }
  });

  assert.equal(
    calls[0].url,
    "http://localhost:3000/api/rest/reports/22/preview?pageKey=recently-changed-salesforce-organizations&offset=100&limit=100&changed_range_from=2026-05-01&changed_range_to=2026-05-14"
  );
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(preview.definitionVersionId, 5);
  assert.equal(preview.pages[0].totalCount, 250);
  assert.equal(preview.pages[0].offset, 100);
  assert.equal(preview.pages[0].limit, 100);
});

test("runReport posts runtime filters to the run route", async () => {
  const calls = [];
  const run = await runReport({
    request: new Request("http://localhost:3000/reports/22", {
      headers: {
        cookie: "sid=123"
      }
    }),
    id: 22,
    runtimeFilters: {
      industry: "healthcare"
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
            run: {
              id: 82,
              status: "completed"
            }
          };
        }
      };
    }
  });

  assert.equal(calls[0].url, "http://localhost:3000/api/rest/reports/22/run");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    runType: "manual",
    runtimeFilters: {
      industry: "healthcare"
    }
  });
  assert.equal(run.id, 82);
});

test("setReportFavorite and createReportList use the report mutation routes", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({
      url: String(url),
      options
    });
    if (String(url).endsWith("/favorite")) {
      return {
        ok: true,
        async json() {
          return {
            report: {
              id: 22,
              favorite: true,
              name: "Recently Added Organizations and Segmentation"
            }
          };
        }
      };
    }

    return {
      ok: true,
      async json() {
        return {
          list: {
            uuid: "list-1",
            name: "Saved report list"
          }
        };
      }
    };
  };

  const request = new Request("http://localhost:3000/reports/22", {
    headers: {
      cookie: "sid=123"
    }
  });
  const favorite = await setReportFavorite({
    request,
    id: 22,
    favorite: true,
    fetchImpl
  });
  const list = await createReportList({
    request,
    id: 22,
    runId: 81,
    fetchImpl
  });

  assert.equal(calls[0].url, "http://localhost:3000/api/rest/reports/22/favorite");
  assert.equal(calls[1].url, "http://localhost:3000/api/rest/reports/22/create-list");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    favorite: true
  });
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    runId: 81
  });
  assert.equal(favorite.favorite, true);
  assert.equal(list.uuid, "list-1");
});

test("report model raises ReportApiError when the service returns an error", async () => {
  await assert.rejects(
    () =>
      loadReportsList({
        request: new Request("http://localhost:3000/reports"),
        fetchImpl: async () => ({
          ok: false,
          status: 500,
          async json() {
            return {
              error: "server_error",
              message: "Report backend exploded."
            };
          }
        })
      }),
    (error) => {
      assert.equal(error instanceof ReportApiError, true);
      assert.equal(error.message, "Report backend exploded.");
      return true;
    }
  );
});
