class CompanyResearchMutationApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "CompanyResearchMutationApiError";
    this.code = options.code || "company_research_mutation_failed";
    this.statusCode = options.statusCode || 500;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

async function tryReadJson(response) {
  if (!response || typeof response.json !== "function") {
    return null;
  }
  try {
    const payload = await response.json();
    return isPlainObject(payload) ? payload : null;
  } catch (_error) {
    return null;
  }
}

async function requestCompanyResearchMutationApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to mutate Company Research.");
  }

  const target = new URL(options.pathname, options.request.url);
  let response;
  try {
    response = await fetchImpl(target, {
      method: options.method || "POST",
      headers: {
        cookie: options.request.headers.get("cookie") || "",
        "content-type": "application/json",
      },
      body: JSON.stringify(options.body || {}),
    });
  } catch (error) {
    throw new CompanyResearchMutationApiError(
      "Unable to reach the Company Research service.",
      {
        code: "company_research_unreachable",
        statusCode: 502,
        cause: error,
      }
    );
  }

  const payload = await tryReadJson(response);
  if (!response.ok) {
    throw new CompanyResearchMutationApiError(
      readTrimmedString(payload?.message) ||
        `Company Research request failed (HTTP ${response.status}).`,
      {
        code: readTrimmedString(payload?.error) || "company_research_mutation_failed",
        statusCode: response.status,
      }
    );
  }

  return payload;
}

const REQUEST_SOURCE_FIELDS = Object.freeze([
  "website",
  "linkedin",
  "salesnav",
  "biscred",
  "preqin",
  "revenuebase",
]);

function readRequestSourceFlags(formData) {
  return REQUEST_SOURCE_FIELDS.reduce((result, source) => {
    result[`requestSource_${source}`] = formData.get(`requestSource_${source}`) === "true";
    return result;
  }, {});
}

async function createCompanyResearchManualRequest(options) {
  const formData = options.formData;
  const payload = {
    companyName: readTrimmedString(formData.get("companyName")) || "",
    requestReason: readTrimmedString(formData.get("requestReason")) || "From Email Request",
    notes: readTrimmedString(formData.get("notes")) || "",
    website: readTrimmedString(formData.get("website")) || null,
    linkedInUrl: readTrimmedString(formData.get("linkedInUrl")) || null,
    runNow: formData.get("runNow") === "true",
    originLabel: readTrimmedString(formData.get("originLabel")) || null,
    ...readRequestSourceFlags(formData),
  };

  if (!payload.website && !payload.linkedInUrl) {
    throw new CompanyResearchMutationApiError(
      "Website or LinkedIn URL is required.",
      {
        code: "invalid_manual_request",
        statusCode: 400,
      }
    );
  }

  const response = await requestCompanyResearchMutationApi({
    request: options.request,
    pathname: "/api/rest/company-research/requests",
    body: payload,
    fetchImpl: options.fetchImpl,
  });

  return isPlainObject(response?.request) ? response.request : null;
}

module.exports = {
  CompanyResearchMutationApiError,
  createCompanyResearchManualRequest,
};
