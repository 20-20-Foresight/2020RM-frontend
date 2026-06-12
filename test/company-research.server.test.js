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
                    sourceLabels: ["Manual Request"],
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
                        companyResearchStatus: "Loading Salesforce Data",
                        sourceLabels: ["salesforce", "Recent Accounts"],
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
                    sourceLabels: ["Manual List"],
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
  assert.equal(dashboard.processing.total, 1);
  assert.equal(dashboard.processing.groups[0].status, "Loading Salesforce Data");
  assert.deepEqual(dashboard.processing.groups[0].items[0].sourceLabels, [
    "salesforce",
    "Recent Accounts",
  ]);
  assert.equal(dashboard.completed.items[0].companyResearchStatus, "Success");
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
