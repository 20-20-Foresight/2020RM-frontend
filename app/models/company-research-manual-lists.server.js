class CompanyResearchManualListsApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "CompanyResearchManualListsApiError";
    this.code = options.code || "company_research_manual_lists_request_failed";
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

async function requestManualListsApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load Manual Lists.");
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
    throw new CompanyResearchManualListsApiError(
      "Unable to reach the Manual Lists service.",
      {
        code: "manual_lists_unreachable",
        statusCode: 502,
        cause: error,
      }
    );
  }

  const payload = await tryReadJson(response);
  if (response.status === 404 && options.allowNotFound) {
    return null;
  }
  if (!response.ok) {
    throw new CompanyResearchManualListsApiError(
      readTrimmedString(payload?.message) ||
        `Manual Lists request failed (HTTP ${response.status}).`,
      {
        code: readTrimmedString(payload?.error) || "manual_lists_request_failed",
        statusCode: response.status,
      }
    );
  }

  return payload;
}

function normalizeListSummary(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    ...value,
    uuid: readTrimmedString(value.uuid),
    name: readTrimmedString(value.name) || "Untitled list",
    listTypeSlug: readTrimmedString(value.listTypeSlug) || "LIST",
    listSubTypeSlug: readTrimmedString(value.listSubTypeSlug) || "ORGANIZATION",
    status: readTrimmedString(value.status) || "active",
    membershipMode: readTrimmedString(value.membershipMode) || "static",
    subjectType: readTrimmedString(value.subjectType) || "organization",
    memberCount: readInteger(value.memberCount) ?? 0,
    createdDate: readTrimmedString(value.createdDate),
    modifiedDate: readTrimmedString(value.modifiedDate),
    description: readTrimmedString(value.description),
  };
}

function normalizeListDetail(value) {
  if (!isPlainObject(value)) {
    return null;
  }
  return {
    ...value,
    list: normalizeListSummary(value.list),
    members: Array.isArray(value.members) ? value.members : [],
    targets: Array.isArray(value.targets) ? value.targets : [],
    permissions: isPlainObject(value.permissions) ? value.permissions : {},
  };
}

async function loadManualLists(options) {
  const payload = await requestManualListsApi({
    request: options.request,
    pathname: "/api/rest/resegmentation/lists",
    fetchImpl: options.fetchImpl,
  });

  return Array.isArray(payload?.lists)
    ? payload.lists.map((list) => normalizeListSummary(list)).filter(Boolean)
    : [];
}

async function loadManualListDetail(options) {
  const uuid = readTrimmedString(options.uuid);
  if (!uuid) {
    return null;
  }

  const payload = await requestManualListsApi({
    request: options.request,
    pathname: `/api/rest/resegmentation/lists/${encodeURIComponent(uuid)}`,
    fetchImpl: options.fetchImpl,
    allowNotFound: true,
  });

  return normalizeListDetail(payload?.listDetail);
}

module.exports = {
  CompanyResearchManualListsApiError,
  loadManualLists,
  loadManualListDetail,
};
