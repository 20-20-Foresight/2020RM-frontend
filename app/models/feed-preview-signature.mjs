function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeInteger(value) {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeArray(values) {
  const list = Array.isArray(values) ? values : [];
  const normalized = list
    .map((value) => normalizeForSignature(value))
    .filter((value) => value !== undefined);
  const allStrings = normalized.every(
    (value) => typeof value === "string" || value === null
  );
  if (allStrings) {
    return normalized
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
  }
  return normalized;
}

function normalizeObject(object) {
  const output = {};
  Object.keys(object || {})
    .sort()
    .forEach((key) => {
      const value = normalizeForSignature(object[key], key);
      if (value !== undefined) {
        output[key] = value;
      }
    });
  return output;
}

function normalizeForSignature(value, key = "") {
  if (value === undefined) {
    return undefined;
  }
  if (value == null) {
    return null;
  }
  if (
    key === "priority" ||
    key === "records_limit" ||
    key === "crm_age_days" ||
    key === "interval_days"
  ) {
    return normalizeInteger(value);
  }
  if (Array.isArray(value)) {
    return normalizeArray(value);
  }
  if (isPlainObject(value)) {
    return normalizeObject(value);
  }
  if (typeof value === "string") {
    return normalizeString(value);
  }
  return value;
}

export function buildFeedPreviewComparable(feed = {}) {
  const rawSettings = isPlainObject(feed.settings) ? feed.settings : {};
  const previewSettings = { ...rawSettings };
  delete previewSettings.linkedListName;
  delete previewSettings.linkedListUUID;
  delete previewSettings.linked_list_name;
  delete previewSettings.linked_list_uuid;
  delete previewSettings.outputList;

  return normalizeObject({
    source: feed.source || "",
    records_limit: feed.records_limit ?? null,
    crm_age_days: feed.crm_age_days ?? null,
    settings: previewSettings,
  });
}

export function buildFeedPreviewSignature(feed = {}) {
  return JSON.stringify(buildFeedPreviewComparable(feed));
}
