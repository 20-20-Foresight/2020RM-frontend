/**
 * Error raised when one resegmentation API request fails.
 */
class ResegmentationApiError extends Error {
  /**
   * @param {string} message
   * @param {{statusCode?: number}} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = "ResegmentationApiError";
    this.statusCode = Number.isFinite(options.statusCode)
      ? Number(options.statusCode)
      : 500;
  }
}

/**
 * Read one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Best-effort JSON reader that preserves plain-text upstream errors.
 * @param {Response|{json?: Function, text?: Function}} response
 * @returns {Promise<Record<string, unknown>|null>}
 */
async function tryReadJson(response) {
  if (typeof response.text === "function") {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return {
        message: text,
      };
    }
  }

  if (typeof response.json !== "function") {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Calls one normalized resegmentation REST endpoint through the frontend proxy.
 * @param {{
 *   request: Request,
 *   path: string,
 *   method?: string,
 *   body?: Record<string, unknown>,
 *   readData?: (payload: Record<string, unknown>|null) => unknown,
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<{status: string, statusExplained: string, data: unknown, meta: Record<string, unknown>}>}
 */
async function requestResegmentationRest(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load resegmentation data.");
  }

  const method = (readTrimmedString(options.method) || "GET").toUpperCase();
  const headers = {
    cookie: options.request.headers.get("cookie") || "",
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["content-type"] = "application/json";
  }

  const requestInit = {
    method,
    headers: {
      ...headers,
    },
  };
  if (method !== "GET" && method !== "HEAD") {
    requestInit.body = JSON.stringify(options.body || {});
  }

  const target = new URL(options.path, options.request.url);
  const response = await fetchImpl(target, requestInit);

  const payload = await tryReadJson(response);
  if (!response.ok) {
    throw new ResegmentationApiError(
      readTrimmedString(payload?.message) || "Resegmentation request failed.",
      {
        statusCode: response.status,
      }
    );
  }

  return {
    status: readTrimmedString(payload?.status) || "completed",
    statusExplained:
      readTrimmedString(payload?.statusExplained) ||
      "Resegmentation request completed successfully.",
    data: typeof options.readData === "function" ? options.readData(payload) : payload,
    meta:
      payload && payload.meta && typeof payload.meta === "object"
        ? payload.meta
        : {},
  };
}

/**
 * Loads the active organization lists used by the resegmentation tool.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{status: string, statusExplained: string, data: object[], meta: Record<string, unknown>}>}
 */
async function loadResegmentationLists(options) {
  return await requestResegmentationRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: "/api/rest/resegmentation/lists",
    readData(payload) {
      return Array.isArray(payload?.lists) ? payload.lists : [];
    },
  });
}

/**
 * Loads one selected list detail contract.
 * @param {{request: Request, uuid: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{status: string, statusExplained: string, data: object|null, meta: Record<string, unknown>}>}
 */
async function loadResegmentationListDetail(options) {
  return await requestResegmentationRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `/api/rest/resegmentation/lists/${encodeURIComponent(readTrimmedString(options.uuid))}`,
    readData(payload) {
      return payload?.listDetail ?? null;
    },
  });
}

/**
 * Loads one organization export for the single-org flow.
 * @param {{request: Request, uuid: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{status: string, statusExplained: string, data: object|null, meta: Record<string, unknown>}>}
 */
async function loadResegmentationOrganization(options) {
  return await requestResegmentationRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `/api/rest/resegmentation/organizations/${encodeURIComponent(readTrimmedString(options.uuid))}`,
    readData(payload) {
      return payload?.organization ?? null;
    },
  });
}

/**
 * Searches organization candidates for the resegmentation picker.
 * @param {{request: Request, query: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{status: string, statusExplained: string, data: object[], meta: Record<string, unknown>}>}
 */
async function searchResegmentationOrganizations(options) {
  const target = new URL("/api/rest/resegmentation/organizations", options.request.url);
  target.searchParams.set("name", readTrimmedString(options.query));

  return await requestResegmentationRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `${target.pathname}${target.search}`,
    readData(payload) {
      return Array.isArray(payload?.organizations) ? payload.organizations : [];
    },
  });
}

/**
 * Runs one dry-run or apply resegmentation call.
 * @param {{
 *   request: Request,
 *   uuid: string,
 *   dryRun?: boolean,
 *   saveSalesforce?: boolean,
 *   includeExplanation?: boolean,
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<{status: string, statusExplained: string, data: object|null, meta: Record<string, unknown>}>}
 */
async function runOrganizationResegmentation(options) {
  return await requestResegmentationRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `/api/rest/resegmentation/organizations/${encodeURIComponent(readTrimmedString(options.uuid))}/segment`,
    method: "POST",
    body: {
      dryRun: options.dryRun !== false,
      saveSalesforce: options.saveSalesforce === true,
      includeExplanation: options.includeExplanation !== false,
    },
    readData(payload) {
      return payload?.resegmentation ?? null;
    },
  });
}

module.exports = {
  ResegmentationApiError,
  loadResegmentationLists,
  loadResegmentationListDetail,
  loadResegmentationOrganization,
  requestResegmentationRest,
  runOrganizationResegmentation,
  searchResegmentationOrganizations,
};
