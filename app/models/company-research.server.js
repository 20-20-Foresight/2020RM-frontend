class CompanyResearchApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "CompanyResearchApiError";
    this.code = options.code || "company_research_request_failed";
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
  return trimmed ? trimmed : null;
}

function readInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : null;
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

function normalizeQueueItem(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const sourceLabels = Array.isArray(value.sourceLabels)
    ? value.sourceLabels
        .map((entry) => readTrimmedString(entry))
        .filter(Boolean)
    : [];
  const requestedSources = Array.isArray(value.requestedSources)
    ? value.requestedSources
        .map((entry) => readTrimmedString(entry))
        .filter(Boolean)
    : [];
  const statusHistory = Array.isArray(value.statusHistory)
    ? value.statusHistory
        .map((entry) => {
          if (!isPlainObject(entry)) return null;
          return {
            id: readInteger(entry.id),
            status: readTrimmedString(entry.status),
            message: readTrimmedString(entry.message),
            source: readTrimmedString(entry.source),
            createdAt: readTrimmedString(entry.createdAt),
            details: isPlainObject(entry.details) ? entry.details : {},
          };
        })
        .filter(Boolean)
    : [];

  return {
    ...value,
    id: readInteger(value.id),
    referenceId: readTrimmedString(value.referenceId),
    salesforceRequestId: readTrimmedString(value.salesforceRequestId),
    queuedSalesforceRequestId: readTrimmedString(value.queuedSalesforceRequestId),
    requestKind: readTrimmedString(value.requestKind) || "manual",
    queueStatus: readTrimmedString(value.queueStatus) || "pending",
    companyResearchStatus: readTrimmedString(value.companyResearchStatus),
    processingStage: readTrimmedString(value.processingStage) || "waiting",
    companyName: readTrimmedString(value.companyName) || "",
    website: readTrimmedString(value.website),
    linkedInUrl: readTrimmedString(value.linkedInUrl),
    reason: readTrimmedString(value.reason),
    notes: readTrimmedString(value.notes),
    requestedSources,
    sourceLabels,
    activeSourceCount: readInteger(value.activeSourceCount) ?? sourceLabels.length,
    priority: readInteger(value.priority),
    createdAt: readTrimmedString(value.createdAt),
    updatedAt: readTrimmedString(value.updatedAt),
    completedAt: readTrimmedString(value.completedAt),
    statusText: readTrimmedString(value.statusText),
    statusHistory,
  };
}

function normalizeProcessingGroup(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const items = Array.isArray(value.items)
    ? value.items.map((item) => normalizeQueueItem(item)).filter(Boolean)
    : [];

  return {
    status: readTrimmedString(value.status) || "waiting",
    count: readInteger(value.count) ?? items.length,
    items,
  };
}

function normalizeProcessingItems(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeQueueItem(item)).filter(Boolean)
    : [];
}

async function requestCompanyResearchApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load Company Research.");
  }

  const target = new URL(options.pathname, options.request.url);
  let response;
  try {
    response = await fetchImpl(target, {
      headers: {
        cookie: options.request.headers.get("cookie") || "",
      },
    });
  } catch (error) {
    throw new CompanyResearchApiError(
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
    throw new CompanyResearchApiError(
      readTrimmedString(payload?.message) ||
        `Company Research request failed (HTTP ${response.status}).`,
      {
        code:
          readTrimmedString(payload?.error) || "company_research_request_failed",
        statusCode: response.status,
      }
    );
  }

  return payload;
}

async function loadCompanyResearchDashboard(options) {
  const payload = await requestCompanyResearchApi({
    request: options.request,
    pathname: "/api/rest/company-research/dashboard",
    fetchImpl: options.fetchImpl,
  });
  const dashboard = isPlainObject(payload?.dashboard) ? payload.dashboard : {};

  return {
    nextUp: {
      count: readInteger(dashboard?.nextUp?.count) ?? 0,
      items: Array.isArray(dashboard?.nextUp?.items)
        ? dashboard.nextUp.items
            .map((item) => normalizeQueueItem(item))
            .filter(Boolean)
        : [],
    },
    processing: {
      total: readInteger(dashboard?.processing?.total) ?? 0,
      items: normalizeProcessingItems(dashboard?.processing?.items),
      groups: Array.isArray(dashboard?.processing?.groups)
        ? dashboard.processing.groups
            .map((group) => normalizeProcessingGroup(group))
            .filter(Boolean)
        : [],
    },
    completed: {
      count: readInteger(dashboard?.completed?.count) ?? 0,
      items: Array.isArray(dashboard?.completed?.items)
        ? dashboard.completed.items
            .map((item) => normalizeQueueItem(item))
            .filter(Boolean)
        : [],
    },
  };
}

module.exports = {
  CompanyResearchApiError,
  loadCompanyResearchDashboard,
};
