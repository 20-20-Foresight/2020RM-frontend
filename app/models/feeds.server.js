/**
 * Server-side model for the Feeds settings page.
 * Currently uses mock fixture data; replace loader/action functions
 * with real API calls once the backend feeds management API is available.
 *
 * See: CRM/2020-Design/docs/feeds-api.md for the expected API contract.
 */

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_FEEDS = [
  // Preqin feeds
  {
    id: 1,
    name: "US Wealth Managers (AUM 100M–100B)",
    source: "preqin",
    description: "Targets US-based wealth managers with significant AUM",
    interval_days: 30,
    records_limit: 100,
    crm_age_days: 180,
    enabled: true,
    settings: {
      investorType: ["Wealth Manager"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: "2026-04-14T14:12:31.000Z",
    last_run_completed_at: "2026-04-14T14:15:02.000Z",
    last_run_status: "complete",
    last_result_count: 312,
    last_queued_count: 100,
    last_error: null,
    next_run_at: "2026-05-14T14:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-14T14:15:02.000Z"
  },
  {
    id: 2,
    name: "US Asset Managers (AUM 100M–100B)",
    source: "preqin",
    description: "Targets US-based asset managers with significant AUM",
    interval_days: 30,
    records_limit: 150,
    crm_age_days: 180,
    enabled: true,
    settings: {
      investorType: ["Asset Manager"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: "2026-04-14T14:12:31.000Z",
    last_run_completed_at: "2026-04-14T14:16:44.000Z",
    last_run_status: "complete",
    last_result_count: 876,
    last_queued_count: 150,
    last_error: null,
    next_run_at: "2026-05-14T14:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-14T14:16:44.000Z"
  },
  {
    id: 3,
    name: "US Fund of Funds (AUM 100M–100B)",
    source: "preqin",
    description: null,
    interval_days: 30,
    records_limit: 100,
    crm_age_days: 180,
    enabled: true,
    settings: {
      investorType: ["Fund of Funds Manager"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: "2026-04-14T14:12:40.000Z",
    last_run_completed_at: "2026-04-14T14:13:55.000Z",
    last_run_status: "complete",
    last_result_count: 203,
    last_queued_count: 100,
    last_error: null,
    next_run_at: "2026-05-14T14:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-14T14:13:55.000Z"
  },
  {
    id: 4,
    name: "US Family Offices Multi (AUM 100M–100B)",
    source: "preqin",
    description: null,
    interval_days: 30,
    records_limit: 100,
    crm_age_days: 180,
    enabled: true,
    settings: {
      investorType: ["Family Office - Multi"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: "2026-04-14T14:12:45.000Z",
    last_run_completed_at: "2026-04-14T14:14:10.000Z",
    last_run_status: "complete",
    last_result_count: 156,
    last_queued_count: 100,
    last_error: null,
    next_run_at: "2026-05-14T14:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-14T14:14:10.000Z"
  },
  {
    id: 5,
    name: "US Investment Banks (AUM 100M–100B)",
    source: "preqin",
    description: null,
    interval_days: 30,
    records_limit: 100,
    crm_age_days: 180,
    enabled: false,
    settings: {
      investorType: ["Investment Bank"],
      location: ["us"],
      aum: { min: 100, max: 100000 }
    },
    last_run_started_at: null,
    last_run_completed_at: null,
    last_run_status: null,
    last_result_count: null,
    last_queued_count: null,
    last_error: null,
    next_run_at: null,
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2025-06-06T00:00:00.000Z"
  },
  // Biscred feeds
  {
    id: 6,
    name: "Data Centers",
    source: "biscred",
    description: "Developers and investors in data center assets",
    interval_days: 1,
    records_limit: 50,
    crm_age_days: 180,
    enabled: true,
    settings: {
      assetClasses: ["Data Center"],
      industries: ["Developer", "Institutional Investor", "Real Estate Investment Firm"]
    },
    last_run_started_at: "2026-04-22T06:00:00.000Z",
    last_run_completed_at: "2026-04-22T06:01:14.000Z",
    last_run_status: "complete",
    last_result_count: 94,
    last_queued_count: 50,
    last_error: null,
    next_run_at: "2026-04-23T06:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-22T06:01:14.000Z"
  },
  {
    id: 7,
    name: "REITs",
    source: "biscred",
    description: "Real estate investment trusts across all asset classes",
    interval_days: 1,
    records_limit: 50,
    crm_age_days: 180,
    enabled: true,
    settings: {
      assetClasses: [],
      industries: ["Real Estate Investment Trust (REIT)"]
    },
    last_run_started_at: "2026-04-22T06:00:01.000Z",
    last_run_completed_at: "2026-04-22T06:01:22.000Z",
    last_run_status: "complete",
    last_result_count: 67,
    last_queued_count: 50,
    last_error: null,
    next_run_at: "2026-04-23T06:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-22T06:01:22.000Z"
  },
  {
    id: 8,
    name: "Affordable Housing Developers",
    source: "biscred",
    description: null,
    interval_days: 1,
    records_limit: 50,
    crm_age_days: 180,
    enabled: true,
    settings: {
      assetClasses: ["Affordable Housing"],
      industries: ["Developer"]
    },
    last_run_started_at: "2026-04-22T06:00:02.000Z",
    last_run_completed_at: null,
    last_run_status: "running",
    last_result_count: null,
    last_queued_count: null,
    last_error: null,
    next_run_at: "2026-04-23T06:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-22T06:00:02.000Z"
  },
  {
    id: 9,
    name: "Industrial Assets",
    source: "biscred",
    description: null,
    interval_days: 1,
    records_limit: 100,
    crm_age_days: 180,
    enabled: true,
    settings: {
      assetClasses: ["Industrial"],
      industries: ["Developer", "Private Equity", "Real Estate Investment Firm"]
    },
    last_run_started_at: "2026-04-21T06:00:00.000Z",
    last_run_completed_at: "2026-04-21T06:02:11.000Z",
    last_run_status: "failed",
    last_result_count: null,
    last_queued_count: null,
    last_error: "Upstream Biscred API returned 429 — rate limit exceeded. Will retry next scheduled run.",
    next_run_at: "2026-04-22T06:00:00.000Z",
    createddate: "2025-06-06T00:00:00.000Z",
    modifieddate: "2026-04-21T06:02:11.000Z"
  },
  // RevenueBase feeds (new, not yet configured)
  {
    id: 10,
    name: "PE-Backed CFOs (Seed)",
    source: "revenuebase",
    description: "CFOs and finance leaders at PE-backed portfolio companies",
    interval_days: 7,
    records_limit: 200,
    crm_age_days: 90,
    enabled: false,
    settings: {
      jobTitles: ["CFO", "Chief Financial Officer", "VP Finance", "Head of Finance"],
      industries: ["Private Equity", "Financial Services"],
      revenueRange: { min: 10000000, max: 500000000 }
    },
    last_run_started_at: null,
    last_run_completed_at: null,
    last_run_status: null,
    last_result_count: null,
    last_queued_count: null,
    last_error: null,
    next_run_at: null,
    createddate: "2026-04-01T00:00:00.000Z",
    modifieddate: "2026-04-01T00:00:00.000Z"
  }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Error raised when one feed API request fails.
 */
class FeedApiError extends Error {
  /**
   * @param {string} message
   * @param {{code?: string, statusCode?: number, cause?: unknown}} [options]
   */
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "FeedApiError";
    this.code = options.code || "feed_request_failed";
    this.statusCode = options.statusCode || 500;
  }
}

/**
 * Returns whether one value is a plain object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads a trimmed string or null.
 * @param {unknown} value
 * @returns {string|null}
 */
function readTrimmedString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Reads one integer-like value.
 * @param {unknown} value
 * @returns {number|null}
 */
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

/**
 * Reads one boolean-like value.
 * @param {unknown} value
 * @returns {boolean|undefined}
 */
function readBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

/**
 * Reads a JSON response body without assuming shape.
 * @param {{ json?: Function }} response
 * @returns {Promise<Record<string, unknown>|null>}
 */
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

/**
 * Normalizes one feed payload into a shared UI shape.
 * @param {unknown} value
 * @returns {object|null}
 */
function normalizeFeed(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    ...value,
    id: readInteger(value.id),
    name: readTrimmedString(value.name) || "",
    source: readTrimmedString(value.source) || "",
    description: value.description == null ? null : readTrimmedString(value.description) || "",
    interval_days: readInteger(value.interval_days) ?? 7,
    records_limit: readInteger(value.records_limit),
    crm_age_days: readInteger(value.crm_age_days),
    enabled: value.enabled !== false,
    settings: isPlainObject(value.settings) ? value.settings : {},
    last_run_started_at: readTrimmedString(value.last_run_started_at),
    last_run_completed_at: readTrimmedString(value.last_run_completed_at),
    last_run_status: readTrimmedString(value.last_run_status),
    last_result_count: readInteger(value.last_result_count),
    last_queued_count: readInteger(value.last_queued_count),
    last_error: readTrimmedString(value.last_error),
    next_run_at: readTrimmedString(value.next_run_at),
    createddate: readTrimmedString(value.createddate),
    modifieddate: readTrimmedString(value.modifieddate)
  };
}

/**
 * Returns one cloned mock feed list for design-only routes.
 * @returns {Promise<object[]>}
 */
async function loadMockFeedsList() {
  return MOCK_FEEDS.map((feed) => normalizeFeed(feed));
}

/**
 * Calls one normalized feed REST route through the frontend BFF.
 * @param {{
 *   request: Request,
 *   pathname: string,
 *   method?: string,
 *   body?: Record<string, unknown>|null,
 *   fetchImpl?: typeof fetch,
 *   allowNotFound?: boolean
 * }} options
 * @returns {Promise<Record<string, unknown>|null>}
 */
async function requestFeedApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load feeds.");
  }

  const target = new URL(options.pathname, options.request.url);
  let response;

  try {
    const headers = {
      cookie: options.request.headers.get("cookie") || ""
    };

    /** @type {RequestInit} */
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
    throw new FeedApiError("Unable to reach the feeds service.", {
      code: "feed_unreachable",
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
    const errorCode = readTrimmedString(payload?.error) || "feed_request_failed";
    const errorMessage =
      readTrimmedString(payload?.message) ||
      `Feed request failed (HTTP ${response.status}).`;

    throw new FeedApiError(errorMessage, {
      code: errorCode,
      statusCode: response.status
    });
  }

  return payload;
}

/**
 * Builds the feed list path with optional filters.
 * @param {{source?: string|null, enabled?: boolean|undefined}} [options]
 * @returns {string}
 */
function buildFeedListPath(options = {}) {
  const pathname = "/api/rest/feeds";
  const source = readTrimmedString(options.source);
  const enabled = typeof options.enabled === "boolean" ? String(options.enabled) : null;
  if (!source && !enabled) {
    return pathname;
  }

  const searchParams = new URLSearchParams();
  if (source) {
    searchParams.append("source", source);
  }
  if (enabled) {
    searchParams.append("enabled", enabled);
  }

  return `${pathname}?${searchParams.toString()}`;
}

/**
 * Returns a stable summary of all feeds from the backend feed API.
 * @param {{request: Request, source?: string|null, enabled?: boolean|undefined, fetchImpl?: typeof fetch}} options
 * @returns {Promise<object[]>}
 */
async function loadFeedsList(options) {
  const payload = await requestFeedApi({
    request: options.request,
    pathname: buildFeedListPath({
      source: options.source,
      enabled: options.enabled
    }),
    fetchImpl: options.fetchImpl
  });

  return Array.isArray(payload?.feeds)
    ? payload.feeds.map((feed) => normalizeFeed(feed)).filter(Boolean)
    : [];
}

/**
 * Returns a single feed by id.
 * @param {{request: Request, id: string|number, fetchImpl?: typeof fetch}} options
 * @returns {Promise<object|null>}
 */
async function loadFeedById(options) {
  const id = readInteger(options.id);
  if (!id) {
    return null;
  }

  const payload = await requestFeedApi({
    request: options.request,
    pathname: `/api/rest/feeds/${encodeURIComponent(String(id))}`,
    fetchImpl: options.fetchImpl,
    allowNotFound: true
  });

  return normalizeFeed(payload?.feed);
}

/**
 * Creates one feed through the backend feed API.
 * @param {{request: Request, feed: Record<string, unknown>, fetchImpl?: typeof fetch}} options
 * @returns {Promise<object|null>}
 */
async function createFeed(options) {
  const payload = await requestFeedApi({
    request: options.request,
    pathname: "/api/rest/feeds",
    method: "POST",
    body: isPlainObject(options.feed) ? options.feed : {},
    fetchImpl: options.fetchImpl
  });

  return normalizeFeed(payload?.feed);
}

/**
 * Updates one feed through the backend feed API.
 * @param {{request: Request, id: string|number, feed: Record<string, unknown>, fetchImpl?: typeof fetch}} options
 * @returns {Promise<object|null>}
 */
async function updateFeed(options) {
  const id = readInteger(options.id);
  const payload = await requestFeedApi({
    request: options.request,
    pathname: `/api/rest/feeds/${encodeURIComponent(String(id))}`,
    method: "PUT",
    body: isPlainObject(options.feed) ? options.feed : {},
    fetchImpl: options.fetchImpl
  });

  return normalizeFeed(payload?.feed);
}

/**
 * Updates one feed enabled flag through the convenience patch route.
 * @param {{request: Request, id: string|number, enabled: boolean, fetchImpl?: typeof fetch}} options
 * @returns {Promise<object|null>}
 */
async function setFeedEnabled(options) {
  const id = readInteger(options.id);
  const payload = await requestFeedApi({
    request: options.request,
    pathname: `/api/rest/feeds/${encodeURIComponent(String(id))}/enabled`,
    method: "PATCH",
    body: {
      enabled: options.enabled
    },
    fetchImpl: options.fetchImpl
  });

  return normalizeFeed(payload?.feed);
}

/**
 * Deletes one feed through the backend feed API.
 * @param {{request: Request, id: string|number, fetchImpl?: typeof fetch}} options
 * @returns {Promise<void>}
 */
async function deleteFeed(options) {
  const id = readInteger(options.id);
  await requestFeedApi({
    request: options.request,
    pathname: `/api/rest/feeds/${encodeURIComponent(String(id))}`,
    method: "DELETE",
    fetchImpl: options.fetchImpl
  });
}

/**
 * Reads one mutable feed payload from a Remix form submission.
 * @param {FormData} formData
 * @param {{includeSource?: boolean}} [options]
 * @returns {Record<string, unknown>}
 * @throws {FeedApiError}
 */
function readFeedFormPayload(formData, options = {}) {
  let settings = {};
  const settingsJson = readTrimmedString(formData.get("settingsJson"));
  if (settingsJson) {
    try {
      const parsed = JSON.parse(settingsJson);
      settings = isPlainObject(parsed) ? parsed : {};
    } catch (error) {
      throw new FeedApiError("Feed settings are invalid.", {
        code: "invalid_settings",
        statusCode: 400,
        cause: error
      });
    }
  }

  const payload = {
    name: readTrimmedString(formData.get("name")) || "",
    description: readTrimmedString(formData.get("description")),
    interval_days: readInteger(formData.get("interval_days")),
    records_limit: readInteger(formData.get("records_limit")),
    crm_age_days: readInteger(formData.get("crm_age_days")),
    next_run_at: readTrimmedString(formData.get("next_run_at")),
    enabled: formData.get("enabled") === "true",
    settings
  };

  if (options.includeSource) {
    payload.source = readTrimmedString(formData.get("source")) || "";
  }

  return payload;
}

/**
 * Returns a blank feed template for new feed creation.
 * @param {string} [source]
 * @returns {object}
 */
function buildEmptyFeed(source) {
  return {
    id: null,
    name: "",
    source: source || "",
    description: "",
    interval_days: 7,
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
  };
}

/**
 * Groups a flat feed list by source.
 * @param {object[]} feeds
 * @returns {Record<string, object[]>}
 */
function groupFeedsBySource(feeds) {
  const groups = {};
  for (const feed of feeds) {
    const key = feed.source || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(feed);
  }
  return groups;
}

/**
 * Returns summary stats across all feeds.
 * @param {object[]} feeds
 * @returns {{total: number, enabled: number, running: number, failed: number}}
 */
function computeFeedStats(feeds) {
  return {
    total: feeds.length,
    enabled: feeds.filter((f) => f.enabled).length,
    running: feeds.filter((f) => f.last_run_status === "running").length,
    failed: feeds.filter((f) => f.last_run_status === "failed").length
  };
}

module.exports = {
  FeedApiError,
  buildEmptyFeed,
  computeFeedStats,
  createFeed,
  deleteFeed,
  groupFeedsBySource,
  loadFeedById,
  loadFeedsList,
  loadMockFeedsList,
  readFeedFormPayload,
  setFeedEnabled,
  updateFeed
};
