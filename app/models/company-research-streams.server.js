class CompanyResearchStreamsApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "CompanyResearchStreamsApiError";
    this.code = options.code || "company_research_streams_request_failed";
    this.statusCode = options.statusCode || 500;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
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

async function requestStreamsApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load Company Research streams.");
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
    throw new CompanyResearchStreamsApiError(
      "Unable to reach the Company Research streams service.",
      {
        code: "company_research_streams_unreachable",
        statusCode: 502,
        cause: error,
      }
    );
  }

  const payload = await tryReadJson(response);
  if (!response.ok) {
    throw new CompanyResearchStreamsApiError(
      readTrimmedString(payload?.message) ||
        `Company Research streams request failed (HTTP ${response.status}).`,
      {
        code:
          readTrimmedString(payload?.error) ||
          "company_research_streams_request_failed",
        statusCode: response.status,
      }
    );
  }

  return payload;
}

function normalizeStream(value) {
  if (!isPlainObject(value)) return null;
  return {
    ...value,
    id: readInteger(value.id),
    streamKey: readTrimmedString(value.streamKey),
    streamType: readTrimmedString(value.streamType),
    name: readTrimmedString(value.name) || "Untitled",
    description: readTrimmedString(value.description),
    percentage: readInteger(value.percentage) ?? 0,
    status: readTrimmedString(value.status) || "active",
    enabled: value.enabled !== false,
    feedId: readInteger(value.feedId),
    listUuid: readTrimmedString(value.listUuid),
    specialStreamKey: readTrimmedString(value.specialStreamKey),
    source: readTrimmedString(value.source),
    metadata: isPlainObject(value.metadata) ? value.metadata : {},
    updatedAt: readTrimmedString(value.updatedAt),
    createdAt: readTrimmedString(value.createdAt),
  };
}

async function loadCompanyResearchStreams(options = {}) {
  const payload = await requestStreamsApi({
    request: options.request,
    pathname: "/api/rest/company-research/streams",
    fetchImpl: options.fetchImpl,
  });

  const streams = Array.isArray(payload?.streams)
    ? payload.streams.map((stream) => normalizeStream(stream)).filter(Boolean)
    : [];

  return {
    streams,
    stats: {
      total: streams.length,
      feeds: streams.filter((stream) => stream.streamType === "feed").length,
      manualLists: streams.filter((stream) => stream.streamType === "manual_list").length,
      specialStreams: streams.filter((stream) => stream.streamType === "special_stream").length,
    },
  };
}

module.exports = {
  CompanyResearchStreamsApiError,
  loadCompanyResearchStreams,
  normalizeStream,
};
