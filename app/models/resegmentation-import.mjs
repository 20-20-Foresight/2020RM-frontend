import {
  buildMappedRows as buildMappedRowsBase,
  buildInitialColumnMapping as buildInitialColumnMappingBase,
  parseImportWorkbook,
} from "./import-list.mjs";

/**
 * Column definitions for the resegmentation organization-import adapter.
 * @type {Array<{
 *   key: string,
 *   label: string,
 *   required?: boolean,
 *   aliases?: string[],
 *   validation?: string
 * }>}
 */
export const RESEGMENTATION_IMPORT_COLUMNS = [
  {
    key: "organizationUuid",
    label: "Organization UUID",
    aliases: ["organization uuid", "org uuid", "uuid"],
    validation: "uuid",
  },
  {
    key: "organizationName",
    label: "Organization Name",
    required: true,
    aliases: ["organization name", "company", "company name", "name"],
  },
  {
    key: "location",
    label: "Location",
    aliases: ["location", "hq", "headquarters"],
  },
  {
    key: "linkedin",
    label: "LinkedIn URL",
    aliases: ["linkedin", "linkedin url"],
    validation: "linkedinOrganizationUrl",
  },
  {
    key: "website",
    label: "Website / Domain",
    aliases: ["website", "domain", "website/domain", "url"],
    validation: "domainish",
  },
  {
    key: "notes",
    label: "Notes",
    aliases: ["notes", "note", "comments"],
  },
];

/**
 * Normalizes one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Returns non-empty sample values for one source column.
 * @param {Array<{sourceValues?: Record<string, string>}>} sourceRows
 * @param {string} sourceKey
 * @returns {string[]}
 */
function readColumnSamples(sourceRows, sourceKey) {
  return (Array.isArray(sourceRows) ? sourceRows : [])
    .map((row) => readTrimmedString(row?.sourceValues?.[sourceKey]))
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Returns whether one value looks like a domain or website URL.
 * @param {unknown} value
 * @returns {boolean}
 */
function isDomainishValue(value) {
  const normalized = normalizeWebsiteToDomain(value);
  return Boolean(normalized && normalized.includes(".") && !/\s/.test(normalized));
}

/**
 * Returns whether one label likely refers to a location-like field.
 * @param {string} label
 * @returns {boolean}
 */
function isLocationLabel(label) {
  return /(location|hq|headquarters|metro|area|city|state|country)/i.test(label);
}

/**
 * Returns whether one value looks like a free-text location hint.
 * @param {unknown} value
 * @returns {boolean}
 */
function isLocationishValue(value) {
  const normalized = readTrimmedString(value);
  return Boolean(
    normalized &&
      !isUuidLike(normalized) &&
      !isLinkedInOrganizationUrl(normalized) &&
      !isDomainishValue(normalized) &&
      (/,/.test(normalized) || / area$/i.test(normalized) || /\b(remote|headquarters|hq)\b/i.test(normalized))
  );
}

/**
 * Returns whether one label likely refers to a notes/comments field.
 * @param {string} label
 * @returns {boolean}
 */
function isNotesLabel(label) {
  return /(note|comment|remark|description)/i.test(label);
}

/**
 * Returns whether one label likely refers to the organization-name field.
 * @param {string} label
 * @returns {boolean}
 */
function isOrganizationNameLabel(label) {
  return /(company|organization|org|name)/i.test(label);
}

/**
 * Count values matching one predicate.
 * @param {string[]} values
 * @param {(value: string) => boolean} predicate
 * @returns {number}
 */
function countMatchingValues(values, predicate) {
  return values.reduce((count, value) => (predicate(value) ? count + 1 : count), 0);
}

/**
 * Infer one destination key for a resegmentation import column.
 * @param {{
 *   sourceColumn: {sourceKey: string, sourceLabel: string},
 *   sourceRows?: Array<{sourceValues?: Record<string, string>}>,
 *   availableDestinationKeys?: Set<string>
 * }} options
 * @returns {string}
 */
function inferResegmentationDestinationKey(options) {
  const sourceColumn = options?.sourceColumn || {};
  const availableDestinationKeys =
    options?.availableDestinationKeys instanceof Set
      ? options.availableDestinationKeys
      : new Set();
  const label = readTrimmedString(sourceColumn.sourceLabel).toLowerCase();
  const samples = readColumnSamples(options?.sourceRows, sourceColumn.sourceKey);

  if (!samples.length) {
    return "skip";
  }

  if (
    availableDestinationKeys.has("organizationUuid") &&
    countMatchingValues(samples, isUuidLike) >= Math.max(1, Math.ceil(samples.length * 0.75))
  ) {
    return "organizationUuid";
  }

  if (
    availableDestinationKeys.has("linkedin") &&
    countMatchingValues(samples, isLinkedInOrganizationUrl) >= Math.max(1, Math.ceil(samples.length * 0.75))
  ) {
    return "linkedin";
  }

  if (
    availableDestinationKeys.has("website") &&
    countMatchingValues(samples, isDomainishValue) >= Math.max(1, Math.ceil(samples.length * 0.75))
  ) {
    return "website";
  }

  if (availableDestinationKeys.has("location") && isLocationLabel(label)) {
    return "location";
  }

  if (
    availableDestinationKeys.has("location") &&
    countMatchingValues(samples, isLocationishValue) >= Math.max(1, Math.ceil(samples.length * 0.5))
  ) {
    return "location";
  }

  if (availableDestinationKeys.has("notes") && isNotesLabel(label)) {
    return "notes";
  }

  if (
    availableDestinationKeys.has("organizationName") &&
    isOrganizationNameLabel(label) &&
    !isNotesLabel(label) &&
    !isLocationLabel(label) &&
    !/linkedin|website|domain|url|uuid/i.test(label)
  ) {
    return "organizationName";
  }

  return "skip";
}

/**
 * Normalizes one website-like value to a lower-case hostname without protocol,
 * path, or leading www.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeWebsiteToDomain(value) {
  const normalized = readTrimmedString(value).toLowerCase();
  if (!normalized) {
    return "";
  }

  const withProtocol = /^[a-z]+:\/\//i.test(normalized)
    ? normalized
    : `https://${normalized}`;

  try {
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "");
  } catch (error) {
    return normalized
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  }
}

/**
 * Returns whether one value looks like a UUID.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    readTrimmedString(value)
  );
}

/**
 * Returns whether one value looks like a LinkedIn organization URL.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isLinkedInOrganizationUrl(value) {
  const normalized = readTrimmedString(value);
  if (!normalized) {
    return false;
  }

  try {
    const url = new URL(normalized);
    return (
      /(^|\.)linkedin\.com$/i.test(url.hostname) &&
      /^\/(company|school)\//i.test(url.pathname)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Validates one mapped row for the resegmentation organization import.
 * @param {Record<string, string>} values
 * @returns {{status: string, messages: string[]}}
 */
export function validateMappedValues(values) {
  const messages = [];
  const organizationUuid = readTrimmedString(values.organizationUuid);
  const organizationName = readTrimmedString(values.organizationName);
  const linkedin = readTrimmedString(values.linkedin);
  const website = readTrimmedString(values.website);

  if (!organizationUuid && !organizationName) {
    messages.push("Organization Name is required when Organization UUID is not supplied.");
  }

  if (organizationUuid && !isUuidLike(organizationUuid)) {
    messages.push("Organization UUID must be a valid UUID.");
  }

  if (linkedin && !isLinkedInOrganizationUrl(linkedin)) {
    messages.push("LinkedIn must be a full LinkedIn organization URL.");
  }

  if (website && !normalizeWebsiteToDomain(website)) {
    messages.push("Website / Domain must be parseable into a domain.");
  }

  return {
    status: messages.length ? "invalid" : "valid",
    messages,
  };
}

/**
 * Applies one resegmentation-specific mapping to parsed rows.
 * @param {Parameters<typeof buildMappedRowsBase>[0]} options
 * @returns {ReturnType<typeof buildMappedRowsBase>}
 */
export function buildMappedRows(options) {
  return buildMappedRowsBase({
    ...options,
    transformValues(values) {
      const nextValues = { ...(values || {}) };
      if (nextValues.website) {
        nextValues.website = normalizeWebsiteToDomain(nextValues.website);
      }
      return nextValues;
    },
    validateValues: validateMappedValues,
  });
}

/**
 * Builds one initial source-to-destination mapping for the resegmentation
 * organization import adapter.
 * @param {Array<{sourceKey: string, sourceLabel: string}>} sourceColumns
 * @param {Array<{sourceValues?: Record<string, string>}>} [sourceRows]
 * @returns {Record<string, string>}
 */
export function buildInitialColumnMapping(sourceColumns, sourceRows = []) {
  const mapping = buildInitialColumnMappingBase(sourceColumns, RESEGMENTATION_IMPORT_COLUMNS);
  const usedDestinationKeys = new Set(
    Object.values(mapping).filter((value) => value && value !== "skip")
  );

  return (Array.isArray(sourceColumns) ? sourceColumns : []).reduce((nextMapping, sourceColumn) => {
    if ((nextMapping[sourceColumn.sourceKey] || "skip") !== "skip") {
      return nextMapping;
    }

    const availableDestinationKeys = new Set(
      RESEGMENTATION_IMPORT_COLUMNS.map((definition) => definition.key).filter(
        (key) => !usedDestinationKeys.has(key)
      )
    );
    const inferredDestinationKey = inferResegmentationDestinationKey({
      sourceColumn,
      sourceRows,
      availableDestinationKeys,
    });

    if (inferredDestinationKey !== "skip") {
      usedDestinationKeys.add(inferredDestinationKey);
    }

    nextMapping[sourceColumn.sourceKey] = inferredDestinationKey;
    return nextMapping;
  }, { ...mapping });
}

export { parseImportWorkbook };
