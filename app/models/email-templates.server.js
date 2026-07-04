/**
 * Error raised when one email templates API request fails.
 */
class EmailTemplatesApiError extends Error {
  /**
   * @param {string} message
   * @param {{statusCode?: number}} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = "EmailTemplatesApiError";
    this.statusCode = Number.isFinite(options.statusCode)
      ? Number(options.statusCode)
      : 500;
  }
}

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function tryReadJson(response) {
  if (typeof response.text === "function") {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (_error) {
      return {
        message: text
      };
    }
  }

  if (typeof response.json !== "function") {
    return null;
  }

  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

async function requestEmailTemplatesRest(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load email templates.");
  }

  const method = (readTrimmedString(options.method) || "GET").toUpperCase();
  const headers = {
    cookie: options.request.headers.get("cookie") || ""
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["content-type"] = "application/json";
  }

  const requestInit = {
    method,
    headers: {
      ...headers
    }
  };
  if (method !== "GET" && method !== "HEAD") {
    requestInit.body = JSON.stringify(options.body || {});
  }

  const target = new URL(options.path, options.request.url);
  const response = await fetchImpl(target, requestInit);
  const payload = await tryReadJson(response);
  if (!response.ok) {
    throw new EmailTemplatesApiError(
      readTrimmedString(payload?.message) || "Email templates request failed.",
      {
        statusCode: response.status
      }
    );
  }

  return {
    status: readTrimmedString(payload?.status) || "completed",
    statusExplained:
      readTrimmedString(payload?.statusExplained) ||
      "Email templates request completed successfully.",
    data: typeof options.readData === "function" ? options.readData(payload) : payload,
    meta:
      payload && payload.meta && typeof payload.meta === "object"
        ? payload.meta
        : {}
  };
}

async function loadEmailTemplates(options) {
  const target = new URL("/api/rest/email-templates", options.request.url);
  if (readTrimmedString(options.kind)) {
    target.searchParams.set("kind", readTrimmedString(options.kind));
  }

  return await requestEmailTemplatesRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `${target.pathname}${target.search}`,
    readData(payload) {
      return Array.isArray(payload?.items) ? payload.items : [];
    }
  });
}

async function getEmailTemplate(options) {
  return await requestEmailTemplatesRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `/api/rest/email-templates/${encodeURIComponent(readTrimmedString(options.id))}`,
    readData(payload) {
      return payload?.item ?? null;
    }
  });
}

async function saveEmailTemplate(options) {
  return await requestEmailTemplatesRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `/api/rest/email-templates/${encodeURIComponent(readTrimmedString(options.id))}`,
    method: "PUT",
    body: {
      name: readTrimmedString(options.name),
      description: typeof options.description === "string" ? options.description : "",
      expectedVersion:
        typeof options.expectedVersion === "number" && Number.isFinite(options.expectedVersion)
          ? options.expectedVersion
          : null,
      document: options.document && typeof options.document === "object" ? options.document : null
    },
    readData(payload) {
      return payload?.item ?? null;
    }
  });
}

module.exports = {
  EmailTemplatesApiError,
  getEmailTemplate,
  loadEmailTemplates,
  requestEmailTemplatesRest,
  saveEmailTemplate
};
