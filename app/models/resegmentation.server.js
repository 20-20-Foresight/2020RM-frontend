/**
 * Error raised when one resegmentation RPC request fails.
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
 * Calls one backend RPC action through the frontend proxy.
 * @param {{
 *   request: Request,
 *   action: string,
 *   settings?: Record<string, unknown>,
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<{status: string, statusExplained: string, data: unknown, meta: Record<string, unknown>}>}
 */
async function requestResegmentationRpc(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load resegmentation data.");
  }

  const target = new URL("/api/rpc", options.request.url);
  const response = await fetchImpl(target, {
    method: "POST",
    headers: {
      cookie: options.request.headers.get("cookie") || "",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mode: "sync-required",
      actions: [
        {
          name: "result",
          action: options.action,
          settings: options.settings || {},
          respond: true,
        },
      ],
    }),
  });

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
      readTrimmedString(payload?.status_explained) ||
      "Resegmentation request completed successfully.",
    data: payload?.response ?? null,
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
  return await requestResegmentationRpc({
    request: options.request,
    fetchImpl: options.fetchImpl,
    action: "entity/findList",
    settings: {
      listTypeSlug: "LIST",
      listSubTypeSlug: "ORGANIZATION",
      subjectType: "organization",
      status: "active",
      membershipMode: "static",
      limit: 100,
    },
  });
}

/**
 * Loads one selected list detail contract.
 * @param {{request: Request, uuid: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{status: string, statusExplained: string, data: object|null, meta: Record<string, unknown>}>}
 */
async function loadResegmentationListDetail(options) {
  return await requestResegmentationRpc({
    request: options.request,
    fetchImpl: options.fetchImpl,
    action: "entity/getListDetail",
    settings: {
      uuid: readTrimmedString(options.uuid),
    },
  });
}

/**
 * Loads one organization export for the single-org flow.
 * @param {{request: Request, uuid: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{status: string, statusExplained: string, data: object|null, meta: Record<string, unknown>}>}
 */
async function loadResegmentationOrganization(options) {
  return await requestResegmentationRpc({
    request: options.request,
    fetchImpl: options.fetchImpl,
    action: "entity/exportOrganization",
    settings: {
      uuid: readTrimmedString(options.uuid),
    },
  });
}

/**
 * Searches organization candidates for the resegmentation picker.
 * @param {{request: Request, query: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{status: string, statusExplained: string, data: object[], meta: Record<string, unknown>}>}
 */
async function searchResegmentationOrganizations(options) {
  return await requestResegmentationRpc({
    request: options.request,
    fetchImpl: options.fetchImpl,
    action: "entity/findOrganization",
    settings: {
      name: readTrimmedString(options.query),
      limit: 20,
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
  return await requestResegmentationRpc({
    request: options.request,
    fetchImpl: options.fetchImpl,
    action: "entity/resegmentOrganization",
    settings: {
      uuid: readTrimmedString(options.uuid),
      dryRun: options.dryRun !== false,
      saveSalesforce: options.saveSalesforce === true,
      includeExplanation: options.includeExplanation !== false,
    },
  });
}

module.exports = {
  ResegmentationApiError,
  loadResegmentationLists,
  loadResegmentationListDetail,
  loadResegmentationOrganization,
  requestResegmentationRpc,
  runOrganizationResegmentation,
  searchResegmentationOrganizations,
};
