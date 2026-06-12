const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CompanyResearchMutationApiError,
  createCompanyResearchManualRequest,
} = require("../app/models/company-research-mutations.server");

test("createCompanyResearchManualRequest posts the expected payload", async () => {
  const calls = [];
  const formData = new FormData();
  formData.set("companyName", "Acme Capital");
  formData.set("reason", "Important prospect");
  formData.set("website", "https://acme.example.com");
  formData.set("linkedInUrl", "https://linkedin.com/company/acme");
  formData.append("requestedSources", "Website");
  formData.append("requestedSources", "Sales Navigator");
  formData.set("runNow", "true");

  const requestRecord = await createCompanyResearchManualRequest({
    request: new Request("http://localhost:3000/settings/company-research", {
      headers: {
        cookie: "sid=123",
      },
    }),
    formData,
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        options,
      });
      return {
        ok: true,
        async json() {
          return {
            request: {
              id: "a01-manual",
              queueRequestId: 901,
            },
          };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "http://localhost:3000/api/rest/company-research/requests"
  );
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.cookie, "sid=123");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    companyName: "Acme Capital",
    reason: "Important prospect",
    website: "https://acme.example.com",
    linkedInUrl: "https://linkedin.com/company/acme",
    requestedSources: ["Website", "Sales Navigator"],
    runNow: true,
  });
  assert.equal(requestRecord.id, "a01-manual");
  assert.equal(requestRecord.queueRequestId, 901);
});

test("createCompanyResearchManualRequest throws normalized errors", async () => {
  const formData = new FormData();
  formData.set("companyName", "Acme Capital");
  formData.set("reason", "Important prospect");

  await assert.rejects(
    () =>
      createCompanyResearchManualRequest({
        request: new Request("http://localhost:3000/settings/company-research"),
        formData,
      }),
    (error) => {
      assert.ok(error instanceof CompanyResearchMutationApiError);
      assert.equal(error.code, "invalid_manual_request");
      assert.equal(error.message, "Website or LinkedIn URL is required.");
      assert.equal(error.statusCode, 400);
      return true;
    }
  );
});
