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

class EsClientApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "EsClientApiError";
    this.code = options.code || "es_client_request_failed";
    this.statusCode = options.statusCode || 500;
  }
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

async function requestEsClientApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load ES client fixtures.");
  }

  let response;
  try {
    response = await fetchImpl(new URL(options.pathname, options.request.url), {
      headers: {
        cookie: options.request.headers.get("cookie") || ""
      }
    });
  } catch (error) {
    throw new EsClientApiError("Unable to reach the ES client fixture service.", {
      code: "es_client_unreachable",
      statusCode: 502,
      cause: error
    });
  }

  const payload = await tryReadJson(response);
  if (!response.ok) {
    throw new EsClientApiError(
      readTrimmedString(payload?.message) ||
        readTrimmedString(payload?.error) ||
        `ES client request failed (HTTP ${response.status}).`,
      {
        code: readTrimmedString(payload?.error) || "es_client_request_failed",
        statusCode: response.status
      }
    );
  }

  return isPlainObject(payload) ? payload : {};
}

function normalizeMilestone(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    key: readTrimmedString(value.key) || "",
    label: readTrimmedString(value.label) || "",
    shortLabel: readTrimmedString(value.shortLabel) || ""
  };
}

function normalizeDocument(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    id: readTrimmedString(value.id) || "",
    title: readTrimmedString(value.title) || "Document",
    kind: readTrimmedString(value.kind) || "supporting",
    label: readTrimmedString(value.label) || "Document",
    mimeType: readTrimmedString(value.mimeType),
    downloadName: readTrimmedString(value.downloadName),
    fileExtension: readTrimmedString(value.fileExtension),
    modifiedAt: readTrimmedString(value.modifiedAt),
    href: readTrimmedString(value.href) || "#",
    previewHref: readTrimmedString(value.previewHref)
  };
}

function normalizeCandidate(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const documents = Array.isArray(value.documents) ? value.documents.map((item) => normalizeDocument(item)).filter(Boolean) : [];
  const rawDocumentsByKind = isPlainObject(value.documentsByKind) ? value.documentsByKind : {};

  return {
    id: readTrimmedString(value.id) || "",
    name: readTrimmedString(value.name) || "Candidate",
    title: readTrimmedString(value.title),
    location: readTrimmedString(value.location),
    status: readTrimmedString(value.status) || "New",
    summary: readTrimmedString(value.summary),
    detailUrl: readTrimmedString(value.detailUrl),
    presentationUrl: readTrimmedString(value.presentationUrl),
    resumeUrl: readTrimmedString(value.resumeUrl),
    documents,
    documentsByKind: Object.fromEntries(
      Object.entries(rawDocumentsByKind).map(([key, items]) => [
        key,
        Array.isArray(items) ? items.map((item) => normalizeDocument(item)).filter(Boolean) : []
      ])
    )
  };
}

function normalizeSearch(value, fallbackMilestones = []) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    ...value,
    id: readTrimmedString(value.id) || "",
    type: readTrimmedString(value.type) || "es",
    title: readTrimmedString(value.title) || "Untitled search",
    subtitle: readTrimmedString(value.subtitle),
    organizationName: readTrimmedString(value.organizationName),
    location: readTrimmedString(value.location),
    status: readTrimmedString(value.status) || "active",
    statusLabel: readTrimmedString(value.statusLabel) || "Active",
    nextStep: readTrimmedString(value.nextStep),
    detailUrl: readTrimmedString(value.detailUrl),
    activePhaseIndex: Number.isInteger(value.activePhaseIndex) ? value.activePhaseIndex : 0,
    milestones: Array.isArray(value.milestones)
      ? value.milestones.map((item) => normalizeMilestone(item)).filter(Boolean)
      : fallbackMilestones,
    recruiterContact: isPlainObject(value.recruiterContact) ? value.recruiterContact : null,
    clientManagerContact: isPlainObject(value.clientManagerContact) ? value.clientManagerContact : null,
    primaryContact: isPlainObject(value.primaryContact) ? value.primaryContact : null,
    company: isPlainObject(value.company) ? value.company : null,
    candidateCount: Number.isFinite(value.candidateCount) ? value.candidateCount : 0,
    candidates: Array.isArray(value.candidates) ? value.candidates.map((item) => normalizeCandidate(item)).filter(Boolean) : [],
    jobDescriptionDocuments: Array.isArray(value.jobDescriptionDocuments)
      ? value.jobDescriptionDocuments.map((item) => normalizeDocument(item)).filter(Boolean)
      : [],
    agreementDocuments: Array.isArray(value.agreementDocuments)
      ? value.agreementDocuments.map((item) => normalizeDocument(item)).filter(Boolean)
      : []
  };
}

function normalizeAgreement(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    id: readTrimmedString(value.id) || "",
    title: readTrimmedString(value.title) || "Untitled agreement",
    organizationName: readTrimmedString(value.organizationName) || "Unknown organization",
    searchId: readTrimmedString(value.searchId),
    searchTitle: readTrimmedString(value.searchTitle),
    status: readTrimmedString(value.status) || "draft",
    effectiveDate: readTrimmedString(value.effectiveDate),
    expiresDate: readTrimmedString(value.expiresDate),
    description: readTrimmedString(value.description),
    document: isPlainObject(value.document) ? normalizeDocument(value.document) : null
  };
}

async function loadEsClientSearchCollection(options) {
  const payload = await requestEsClientApi({
    request: options.request,
    pathname: options.pathname,
    fetchImpl: options.fetchImpl
  });
  const milestones = Array.isArray(payload.milestones) ? payload.milestones.map((item) => normalizeMilestone(item)).filter(Boolean) : [];

  return {
    status: readTrimmedString(payload.status) || "completed",
    statusExplained: readTrimmedString(payload.statusExplained) || "Searches loaded successfully.",
    milestones,
    items: Array.isArray(payload.items) ? payload.items.map((item) => normalizeSearch(item, milestones)).filter(Boolean) : [],
    meta: isPlainObject(payload.meta) ? payload.meta : { count: 0 }
  };
}

async function loadEsClientActiveSearches(options) {
  return await loadEsClientSearchCollection({
    request: options.request,
    pathname: "/api/rest/es-client/searches/active",
    fetchImpl: options.fetchImpl
  });
}

async function loadEsClientCompletedSearches(options) {
  return await loadEsClientSearchCollection({
    request: options.request,
    pathname: "/api/rest/es-client/searches/completed",
    fetchImpl: options.fetchImpl
  });
}

async function loadEsClientAgreements(options) {
  const payload = await requestEsClientApi({
    request: options.request,
    pathname: "/api/rest/es-client/agreements",
    fetchImpl: options.fetchImpl
  });

  return {
    status: readTrimmedString(payload.status) || "completed",
    statusExplained: readTrimmedString(payload.statusExplained) || "Agreements loaded successfully.",
    items: Array.isArray(payload.items) ? payload.items.map((item) => normalizeAgreement(item)).filter(Boolean) : [],
    meta: isPlainObject(payload.meta) ? payload.meta : { count: 0 }
  };
}

async function loadEsClientSearchDetail(options) {
  const searchId = readTrimmedString(options.searchId) || "";
  const payload = await requestEsClientApi({
    request: options.request,
    pathname: `/api/rest/es-client/searches/${encodeURIComponent(searchId)}`,
    fetchImpl: options.fetchImpl
  });
  const search = normalizeSearch(payload.item || null);
  const selectedJobDescriptionId = readTrimmedString(options.selectedJobDescriptionId)
    || search?.jobDescriptionDocuments?.[0]?.id
    || null;
  const selectedJobDescriptionDocument = Array.isArray(search?.jobDescriptionDocuments)
    ? search.jobDescriptionDocuments.find((document) => document.id === selectedJobDescriptionId) || search.jobDescriptionDocuments[0] || null
    : null;
  let jobDescriptionPreview = null;

  if (selectedJobDescriptionDocument?.previewHref) {
    const previewPayload = await requestEsClientApi({
      request: options.request,
      pathname: selectedJobDescriptionDocument.previewHref,
      fetchImpl: options.fetchImpl
    });
    if (isPlainObject(previewPayload.item)) {
      jobDescriptionPreview = {
        id: readTrimmedString(previewPayload.item.id) || selectedJobDescriptionDocument.id,
        title: readTrimmedString(previewPayload.item.title) || selectedJobDescriptionDocument.title,
        html: typeof previewPayload.item.html === "string" ? previewPayload.item.html : ""
      };
    }
  }

  return {
    search,
    selectedJobDescriptionId,
    selectedJobDescriptionDocument,
    jobDescriptionPreview,
    agreements: Array.isArray(search?.agreementDocuments)
      ? search.agreementDocuments.map((document) => ({
          id: document.id,
          title: document.title,
          status: search.status === "placed" ? "executed" : "active",
          description: `${search.title} agreement document`,
          document
        }))
      : [],
    milestones: Array.isArray(search?.milestones) ? search.milestones : [],
    notFound: !search
  };
}

async function loadEsClientCandidateDetail(options) {
  const searchId = readTrimmedString(options.searchId) || "";
  const candidateId = readTrimmedString(options.candidateId) || "";
  const payload = await requestEsClientApi({
    request: options.request,
    pathname: `/api/rest/es-client/searches/${encodeURIComponent(searchId)}/candidates/${encodeURIComponent(candidateId)}`,
    fetchImpl: options.fetchImpl
  });

  return {
    search: isPlainObject(payload.search) ? payload.search : null,
    candidate: normalizeCandidate(payload.candidate || null)
  };
}

module.exports = {
  EsClientApiError,
  loadEsClientActiveSearches,
  loadEsClientCompletedSearches,
  loadEsClientAgreements,
  loadEsClientSearchDetail,
  loadEsClientCandidateDetail
};
