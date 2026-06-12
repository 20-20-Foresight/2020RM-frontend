class CompanyResearchSettingsApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "CompanyResearchSettingsApiError";
    this.code = options.code || "company_research_settings_request_failed";
    this.statusCode = options.statusCode || 500;
  }
}

const DEFAULT_SETTINGS = {
  maxResearchDaily: 5,
  workHours: {
    sun: { from: "", to: "" },
    mon: { from: "09:00", to: "17:00" },
    tue: { from: "07:00", to: "17:00" },
    wed: { from: "09:00", to: "17:00" },
    thu: { from: "07:00", to: "17:00" },
    fri: { from: "09:00", to: "17:00" },
    sat: { from: "", to: "" },
  },
};

const DEFAULT_ACTIVITY = {
  activeNowCount: 0,
  pendingCount: 0,
  governedActiveCount: 0,
  manualOverrideCount: 0,
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPositiveInteger(value, fallback) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function readNonNegativeInteger(value, fallback) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeTime(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : "";
}

function normalizeDaySchedule(value, fallback = {}) {
  const from = normalizeTime(value?.from);
  const to = normalizeTime(value?.to);
  return {
    from: from || normalizeTime(fallback.from),
    to: to || normalizeTime(fallback.to),
  };
}

function normalizeCompanyResearchSettingsDocument(document) {
  const source = isPlainObject(document) ? document : {};
  const workHours = isPlainObject(source.workHours) ? source.workHours : {};

  return {
    maxResearchDaily: readPositiveInteger(
      source.maxResearchDaily,
      DEFAULT_SETTINGS.maxResearchDaily
    ),
    workHours: {
      sun: normalizeDaySchedule(workHours.sun, DEFAULT_SETTINGS.workHours.sun),
      mon: normalizeDaySchedule(workHours.mon, DEFAULT_SETTINGS.workHours.mon),
      tue: normalizeDaySchedule(workHours.tue, DEFAULT_SETTINGS.workHours.tue),
      wed: normalizeDaySchedule(workHours.wed, DEFAULT_SETTINGS.workHours.wed),
      thu: normalizeDaySchedule(workHours.thu, DEFAULT_SETTINGS.workHours.thu),
      fri: normalizeDaySchedule(workHours.fri, DEFAULT_SETTINGS.workHours.fri),
      sat: normalizeDaySchedule(workHours.sat, DEFAULT_SETTINGS.workHours.sat),
    },
  };
}

function normalizeActivitySummary(value) {
  const source = isPlainObject(value) ? value : {};
  return {
    activeNowCount: readNonNegativeInteger(source.activeNowCount, 0),
    pendingCount: readNonNegativeInteger(source.pendingCount, 0),
    governedActiveCount: readNonNegativeInteger(source.governedActiveCount, 0),
    manualOverrideCount: readNonNegativeInteger(source.manualOverrideCount, 0),
  };
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

async function requestCompanyResearchSettingsApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load Company Research settings.");
  }

  const target = new URL("/api/rest/company-research/settings", options.request.url);
  let response;

  try {
    const headers = {
      cookie: options.request.headers.get("cookie") || "",
    };
    const requestInit = {
      method: options.method || "GET",
      headers,
    };

    if (options.body && isPlainObject(options.body)) {
      headers["content-type"] = "application/json";
      requestInit.body = JSON.stringify(options.body);
    }

    response = await fetchImpl(target, requestInit);
  } catch (error) {
    throw new CompanyResearchSettingsApiError(
      "Unable to reach the Company Research settings service.",
      {
        code: "company_research_settings_unreachable",
        statusCode: 502,
        cause: error,
      }
    );
  }

  const payload = await tryReadJson(response);
  if (!response.ok) {
    throw new CompanyResearchSettingsApiError(
      payload?.message || `Company Research settings request failed (HTTP ${response.status}).`,
      {
        code: payload?.error || "company_research_settings_request_failed",
        statusCode: response.status,
      }
    );
  }

  return payload;
}

async function loadCompanyResearchSettingsDocument(options) {
  try {
    const payload = await requestCompanyResearchSettingsApi({
      request: options.request,
      fetchImpl: options.fetchImpl,
    });
    const settings = isPlainObject(payload?.settings) ? payload.settings : {};

    return {
      id:
        typeof settings.id === "string"
          ? settings.id
          : "crm.data:company_research_settings",
      version: Number.isInteger(settings.version) ? settings.version : null,
      document: normalizeCompanyResearchSettingsDocument(settings.document),
      activity: normalizeActivitySummary(settings.activity),
    };
  } catch (error) {
    if (
      error instanceof CompanyResearchSettingsApiError &&
      error.statusCode === 404
    ) {
      return {
        id: "crm.data:company_research_settings",
        version: null,
        document: normalizeCompanyResearchSettingsDocument(DEFAULT_SETTINGS),
        activity: normalizeActivitySummary(DEFAULT_ACTIVITY),
      };
    }
    throw error;
  }
}

async function saveCompanyResearchSettingsDocument(options) {
  const payload = await requestCompanyResearchSettingsApi({
    request: options.request,
    method: "PUT",
    body: {
      document: normalizeCompanyResearchSettingsDocument(options.document),
    },
    fetchImpl: options.fetchImpl,
  });
  const settings = isPlainObject(payload?.settings) ? payload.settings : {};

  return {
    id: typeof settings.id === "string" ? settings.id : "crm.data:company_research_settings",
    version: Number.isInteger(settings.version) ? settings.version : null,
    document: normalizeCompanyResearchSettingsDocument(settings.document),
  };
}

module.exports = {
  CompanyResearchSettingsApiError,
  DEFAULT_ACTIVITY,
  DEFAULT_SETTINGS,
  loadCompanyResearchSettingsDocument,
  normalizeActivitySummary,
  normalizeCompanyResearchSettingsDocument,
  saveCompanyResearchSettingsDocument,
};
