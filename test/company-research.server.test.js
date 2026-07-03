const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CompanyResearchApiError,
  loadCompanyResearchDashboard,
} = require("../app/models/company-research.server");

test("loadCompanyResearchDashboard calls the dashboard route and normalizes the response", async () => {
  const calls = [];
  const dashboard = await loadCompanyResearchDashboard({
    request: new Request("http://localhost:3000/settings/company-research", {
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
            dashboard: {
              nextUp: {
                count: 1,
                items: [
                  {
                    id: 11,
                    companyName: "Manual Co",
                    requestKind: "manual",
                    queueStatus: "pending",
                    requestPhase: "Starting",
                    originLabel: "Manual Request",
                  },
                ],
              },
              processing: {
                total: 1,
                groups: [
                  {
                    status: "Loading Salesforce Data",
                    count: 1,
                    items: [
                      {
                        id: 12,
                        companyName: "Active Co",
                        requestKind: "automation",
                        requestStatus: "Processing",
                        requestPhase: "Gathering Data",
                        companyResearchStatus: "Loading Salesforce Data",
                        originLabel: "Query Feed",
                        originContextLabel: "Recent Accounts",
                        meta: {
                          organizationUUID: "org-12",
                          reportUploadError: {
                            code: "invalid_client_credential",
                            message: "Upload failed",
                          },
                          rocketReachSummary: {
                            queueRequestCount: 99,
                            successCount: 75,
                            failedCount: 1,
                            pendingCount: 22,
                            startedCount: 1,
                            activeCount: 23,
                            settled: false,
                          },
                        },
                      },
                    ],
                  },
                ],
              },
              completed: {
                count: 1,
                items: [
                  {
                    id: 13,
                    companyName: "Done Co",
                    companyResearchStatus: "Success",
                    originLabel: "Manual List",
                  },
                ],
              },
            },
          };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "http://localhost:3000/api/rest/company-research/dashboard"
  );
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.equal(dashboard.nextUp.count, 1);
  assert.equal(dashboard.nextUp.items[0].companyName, "Manual Co");
  assert.equal(dashboard.nextUp.items[0].requestPhase, "Starting");
  assert.equal(dashboard.processing.total, 1);
  assert.equal(dashboard.processing.groups[0].status, "Loading Salesforce Data");
  assert.equal(dashboard.processing.groups[0].items[0].originLabel, "Query Feed");
  assert.equal(dashboard.processing.groups[0].items[0].requestPhase, "Gathering Data");
  assert.equal(
    dashboard.processing.groups[0].items[0].originContextLabel,
    "Recent Accounts"
  );
  assert.equal(
    dashboard.processing.groups[0].items[0].meta.organizationUUID,
    "org-12"
  );
  assert.equal(
    dashboard.processing.groups[0].items[0].meta.reportUploadError.code,
    "invalid_client_credential"
  );
  assert.equal(
    dashboard.processing.groups[0].items[0].meta.rocketReachSummary.successCount,
    75
  );
  assert.equal(dashboard.completed.items[0].companyResearchStatus, "Success");
});

test("loadCompanyResearchDashboard normalizes legacy and transitional phase labels", async () => {
  const dashboard = await loadCompanyResearchDashboard({
    request: new Request("http://localhost:3000/settings/company-research"),
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          dashboard: {
            nextUp: {
              count: 0,
              items: [],
            },
            processing: {
              total: 2,
              groups: [
                {
                  status: "normalized",
                  count: 1,
                  items: [
                    {
                      id: 21,
                      companyName: "Rocket Co",
                      requestStatus: "Processing",
                      requestPhase: "normalized",
                    },
                  ],
                },
                {
                  status: "Processing Scraped Data",
                  count: 1,
                  items: [
                    {
                      id: 22,
                      companyName: "Normalize Co",
                      requestStatus: "Processing",
                      requestPhase: "Processing Scraped Data",
                    },
                  ],
                },
              ],
            },
            completed: {
              count: 0,
              items: [],
            },
          },
        };
      },
    }),
  });

  assert.equal(dashboard.processing.groups[0].status, "RocketReach");
  assert.equal(dashboard.processing.groups[0].items[0].requestPhase, "RocketReach");
  assert.equal(dashboard.processing.groups[1].status, "Normalizing");
  assert.equal(dashboard.processing.groups[1].items[0].requestPhase, "Normalizing");
});

test("loadCompanyResearchDashboard throws a normalized API error on failure", async () => {
  await assert.rejects(
    () =>
      loadCompanyResearchDashboard({
        request: new Request("http://localhost:3000/settings/company-research"),
        fetchImpl: async () => ({
          ok: false,
          status: 500,
          async json() {
            return {
              error: "upstream_failure",
              message: "Dashboard unavailable",
            };
          },
        }),
      }),
    (error) => {
      assert.ok(error instanceof CompanyResearchApiError);
      assert.equal(error.code, "upstream_failure");
      assert.equal(error.message, "Dashboard unavailable");
      assert.equal(error.statusCode, 500);
      return true;
    }
  );
});
