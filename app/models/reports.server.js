/**
 * Server-side model for reporting routes.
 */

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

class ReportApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "ReportApiError";
    this.code = options.code || "report_request_failed";
    this.statusCode = options.statusCode || 500;
  }
}

function normalizeReportCard(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    key: readTrimmedString(value.key) || "",
    label: readTrimmedString(value.label) || "",
    count: typeof value.count === "number" ? value.count : 0,
    href: readTrimmedString(value.href) || "/reports/list",
    kind: readTrimmedString(value.kind) || "system"
  };
}

function normalizeReport(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    id: readInteger(value.id),
    key: readTrimmedString(value.key),
    name: readTrimmedString(value.name) || "Untitled report",
    description: readTrimmedString(value.description),
    summary: readTrimmedString(value.summary),
    category: readTrimmedString(value.category),
    dataset: readTrimmedString(value.dataset),
    defaultViewMode: readTrimmedString(value.defaultViewMode) || "interactive",
    createdBy: readTrimmedString(value.createdBy),
    updatedBy: readTrimmedString(value.updatedBy),
    favorite: value.favorite === true,
    shared: value.shared !== false,
    schedule: isPlainObject(value.schedule)
      ? {
          enabled: value.schedule.enabled === true,
          frequency: readTrimmedString(value.schedule.frequency),
          timezone: readTrimmedString(value.schedule.timezone),
          email: readTrimmedString(value.schedule.email),
          nextRunAt: readTrimmedString(value.schedule.nextRunAt)
        }
      : {
          enabled: false,
          frequency: null,
          timezone: null,
          email: null,
          nextRunAt: null
        },
    lastRun: isPlainObject(value.lastRun)
      ? {
          id: readInteger(value.lastRun.id),
          status: readTrimmedString(value.lastRun.status),
          startedAt: readTrimmedString(value.lastRun.startedAt),
          completedAt: readTrimmedString(value.lastRun.completedAt),
          rowCount: typeof value.lastRun.rowCount === "number" ? value.lastRun.rowCount : null
        }
      : null,
    createdAt: readTrimmedString(value.createdAt),
    updatedAt: readTrimmedString(value.updatedAt)
  };
}

function normalizeReportRun(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    id: readInteger(value.id),
    reportId: readInteger(value.reportId),
    definitionVersionId: readInteger(value.definitionVersionId),
    runType: readTrimmedString(value.runType) || "manual",
    outputMode: readTrimmedString(value.outputMode) || "interactive",
    status: readTrimmedString(value.status) || "pending",
    triggeredBy: readTrimmedString(value.triggeredBy),
    referenceId: readTrimmedString(value.referenceId),
    filterOverrides: isPlainObject(value.filterOverrides) ? value.filterOverrides : {},
    requestSummary: isPlainObject(value.requestSummary) ? value.requestSummary : {},
    responseSummary: isPlainObject(value.responseSummary) ? value.responseSummary : {},
    rowCount: typeof value.rowCount === "number" ? value.rowCount : 0,
    pageCount: typeof value.pageCount === "number" ? value.pageCount : 0,
    durationMs: typeof value.durationMs === "number" ? value.durationMs : null,
    error: readTrimmedString(value.error),
    listUuid: readTrimmedString(value.listUuid),
    listName: readTrimmedString(value.listName),
    startedAt: readTrimmedString(value.startedAt),
    completedAt: readTrimmedString(value.completedAt),
    createdAt: readTrimmedString(value.createdAt),
    updatedAt: readTrimmedString(value.updatedAt),
    pages: Array.isArray(value.pages)
      ? value.pages.map((page) => normalizeReportPage(page)).filter(Boolean)
      : []
  };
}

function normalizeReportPage(page) {
  if (!isPlainObject(page)) {
    return null;
  }

  return {
    pageKey: readTrimmedString(page.pageKey) || "page",
    pageTitle: readTrimmedString(page.pageTitle) || "Sheet",
    columns: Array.isArray(page.columns)
      ? page.columns
          .map((column) =>
            isPlainObject(column)
              ? {
                  field: readTrimmedString(column.field) || "",
                  label: readTrimmedString(column.label) || readTrimmedString(column.field) || ""
                }
              : null
          )
          .filter(Boolean)
      : [],
    rows: Array.isArray(page.rows) ? page.rows : [],
    rowCount: typeof page.rowCount === "number" ? page.rowCount : 0,
    totalCount: typeof page.totalCount === "number" ? page.totalCount : typeof page.rowCount === "number" ? page.rowCount : 0,
    hasMore: page.hasMore === true,
    offset: typeof page.offset === "number" ? page.offset : 0,
    limit: typeof page.limit === "number" ? page.limit : 0
  };
}

function normalizeReportPreview(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    definitionVersionId: readInteger(value.definitionVersionId),
    pageKey: readTrimmedString(value.pageKey),
    pages: Array.isArray(value.pages) ? value.pages.map((page) => normalizeReportPage(page)).filter(Boolean) : []
  };
}

function normalizeReportDetail(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    report: normalizeReport(value.report),
    currentDefinition: isPlainObject(value.currentDefinition)
      ? {
          id: readInteger(value.currentDefinition.id),
          reportId: readInteger(value.currentDefinition.reportId),
          version: typeof value.currentDefinition.version === "number" ? value.currentDefinition.version : 0,
          title: readTrimmedString(value.currentDefinition.title),
          checksum: readTrimmedString(value.currentDefinition.checksum),
          definition: isPlainObject(value.currentDefinition.definition)
            ? value.currentDefinition.definition
            : {},
          createdBy: readTrimmedString(value.currentDefinition.createdBy),
          createdAt: readTrimmedString(value.currentDefinition.createdAt)
        }
      : null,
    latestRun: normalizeReportRun(value.latestRun),
    recentRuns: Array.isArray(value.recentRuns)
      ? value.recentRuns.map((run) => normalizeReportRun(run)).filter(Boolean)
      : []
  };
}

async function tryReadJson(response) {
  if (!response) {
    return null;
  }

  if (typeof response.text === "function") {
    const text = await response.text();
    if (!text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (_error) {
      return null;
    }
  }

  if (typeof response.json === "function") {
    try {
      return await response.json();
    } catch (_error) {
      return null;
    }
  }

  return null;
}

async function requestReportApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load reports.");
  }

  const target = new URL(options.pathname, options.request.url);
  let response;

  try {
    const headers = {
      cookie: options.request.headers.get("cookie") || ""
    };
    const requestInit = {
      method: options.method,
      headers
    };

    if (options.body && isPlainObject(options.body)) {
      headers["content-type"] = "application/json";
      requestInit.body = JSON.stringify(options.body);
    }

    response = await fetchImpl(target, requestInit);
  } catch (error) {
    throw new ReportApiError("Unable to reach the reports service.", {
      code: "report_unreachable",
      statusCode: 502,
      cause: error
    });
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await tryReadJson(response);
  if (response.status === 404 && options.allowNotFound) {
    return null;
  }

  if (!response.ok) {
    throw new ReportApiError(
      readTrimmedString(payload?.message) || `Report request failed (HTTP ${response.status}).`,
      {
        code: readTrimmedString(payload?.error) || "report_request_failed",
        statusCode: response.status
      }
    );
  }

  return payload;
}

function buildReportsListPath(options = {}) {
  const searchParams = new URLSearchParams();
  const category = readTrimmedString(options.category);
  const view = readTrimmedString(options.view);
  const q = readTrimmedString(options.q || options.search);

  if (category) {
    searchParams.set("category", category);
  }
  if (view) {
    searchParams.set("view", view);
  }
  if (q) {
    searchParams.set("q", q);
  }

  return searchParams.toString()
    ? `/api/rest/reports?${searchParams.toString()}`
    : "/api/rest/reports";
}

async function loadReportsList(options) {
  const payload = await requestReportApi({
    request: options.request,
    pathname: buildReportsListPath(options),
    fetchImpl: options.fetchImpl
  });

  return {
    reports: Array.isArray(payload?.reports)
      ? payload.reports.map((report) => normalizeReport(report)).filter(Boolean)
      : [],
    cards: Array.isArray(payload?.cards)
      ? payload.cards.map((card) => normalizeReportCard(card)).filter(Boolean)
      : []
  };
}

async function loadReportById(options) {
  const id = readInteger(options.id);
  if (!id) {
    return null;
  }

  const payload = await requestReportApi({
    request: options.request,
    pathname: `/api/rest/reports/${encodeURIComponent(String(id))}`,
    fetchImpl: options.fetchImpl,
    allowNotFound: true
  });

  return normalizeReportDetail(payload);
}

async function loadReportRunById(options) {
  const id = readInteger(options.id);
  if (!id) {
    return null;
  }

  const payload = await requestReportApi({
    request: options.request,
    pathname: `/api/rest/reports/runs/${encodeURIComponent(String(id))}`,
    fetchImpl: options.fetchImpl,
    allowNotFound: true
  });

  return normalizeReportRun(payload?.run);
}

async function loadReportPreview(options) {
  const id = readInteger(options.id);
  if (!id) {
    return null;
  }

  const searchParams = new URLSearchParams();
  if (readTrimmedString(options.pageKey)) {
    searchParams.set("pageKey", readTrimmedString(options.pageKey));
  }
  if (typeof options.offset === "number" && Number.isInteger(options.offset)) {
    searchParams.set("offset", String(options.offset));
  }
  if (typeof options.limit === "number" && Number.isInteger(options.limit)) {
    searchParams.set("limit", String(options.limit));
  }
  if (isPlainObject(options.runtimeFilters)) {
    Object.entries(options.runtimeFilters).forEach(([key, value]) => {
      const normalizedKey = readTrimmedString(key);
      if (!normalizedKey) {
        return;
      }
      if (isPlainObject(value)) {
        const from = readTrimmedString(value.from);
        const to = readTrimmedString(value.to);
        if (from) {
          searchParams.set(`${normalizedKey}_from`, from.slice(0, 10));
        }
        if (to) {
          searchParams.set(`${normalizedKey}_to`, to.slice(0, 10));
        }
        return;
      }
      const normalizedValue = readTrimmedString(value);
      if (normalizedValue) {
        searchParams.set(normalizedKey, normalizedValue);
      }
    });
  }

  const pathname = searchParams.toString()
    ? `/api/rest/reports/${encodeURIComponent(String(id))}/preview?${searchParams.toString()}`
    : `/api/rest/reports/${encodeURIComponent(String(id))}/preview`;

  const payload = await requestReportApi({
    request: options.request,
    pathname,
    fetchImpl: options.fetchImpl,
    allowNotFound: true
  });

  return normalizeReportPreview(payload?.preview);
}

async function runReport(options) {
  const id = readInteger(options.id);
  const payload = await requestReportApi({
    request: options.request,
    pathname: `/api/rest/reports/${encodeURIComponent(String(id))}/run`,
    method: "POST",
    body: {
      runType: readTrimmedString(options.runType) || "manual",
      runtimeFilters: isPlainObject(options.runtimeFilters) ? options.runtimeFilters : {}
    },
    fetchImpl: options.fetchImpl
  });

  return normalizeReportRun(payload?.run);
}

async function setReportFavorite(options) {
  const id = readInteger(options.id);
  const payload = await requestReportApi({
    request: options.request,
    pathname: `/api/rest/reports/${encodeURIComponent(String(id))}/favorite`,
    method: "PATCH",
    body: {
      favorite: options.favorite === true
    },
    fetchImpl: options.fetchImpl
  });

  return normalizeReport(payload?.report);
}

async function createReportList(options) {
  const id = readInteger(options.id);
  const payload = await requestReportApi({
    request: options.request,
    pathname: `/api/rest/reports/${encodeURIComponent(String(id))}/create-list`,
    method: "POST",
    body: {
      runId: readInteger(options.runId)
    },
    fetchImpl: options.fetchImpl
  });

  return isPlainObject(payload?.list) ? payload.list : null;
}

module.exports = {
  ReportApiError,
  createReportList,
  loadReportById,
  loadReportPreview,
  loadReportRunById,
  loadReportsList,
  runReport,
  setReportFavorite
};
