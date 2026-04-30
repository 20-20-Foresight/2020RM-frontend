/**
 * Returns whether one value is a plain object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads a trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Returns one stable row ID, generating it when needed.
 * @param {unknown} value
 * @returns {string}
 */
function ensureRowId(value) {
  const existingRowId = readTrimmedString(value);
  if (existingRowId) {
    return existingRowId;
  }

  if (globalThis?.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const nextValue = character === "x" ? randomValue : (randomValue & 0x3) | 0x8;
    return nextValue.toString(16);
  });
}

/**
 * Reads one normalized scored target list.
 * @param {unknown} value
 * @returns {Array<{name: string, score: number}>}
 */
function readIndustryTargets(value) {
  const entries = Array.isArray(value?.industries)
    ? value.industries
    : Array.isArray(value?.industryTargets)
      ? value.industryTargets
      : [];
  const normalizedEntries = entries
    .map((entry) => {
      if (typeof entry === "string") {
        const name = readTrimmedString(entry);
        return name ? { name, score: 3 } : null;
      }

      if (!isPlainObject(entry)) {
        return null;
      }

      const name =
        readTrimmedString(entry.name) ||
        readTrimmedString(entry.label) ||
        readTrimmedString(entry.value);
      if (!name) {
        return null;
      }

      const parsedScore = Number(entry.score);
      return {
        name,
        score: Number.isFinite(parsedScore) && parsedScore > 0 ? parsedScore : 3
      };
    })
    .filter(Boolean);

  if (normalizedEntries.length) {
    return normalizedEntries;
  }

  const legacyIndustry = readTrimmedString(value?.industry);
  return legacyIndustry ? [{ name: legacyIndustry, score: 3 }] : [];
}

/**
 * Reads one ordered focus ID array.
 * @param {unknown} value
 * @returns {string[]}
 */
function readFocusIds(value) {
  const focusIds = Array.isArray(value?.focusIds) ? value.focusIds : [];
  /** @type {Set<string>} */
  const seen = new Set();

  return focusIds
    .map((entry) => readTrimmedString(entry))
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
}

/**
 * Resolves the editable row list from one document.
 * @param {unknown} document
 * @returns {unknown[]}
 */
function resolveDocumentRows(document) {
  if (Array.isArray(document)) {
    return document;
  }

  if (Array.isArray(document?.rows)) {
    return document.rows;
  }

  return [];
}

/**
 * Builds one normalized row from the stored document.
 * @param {unknown} value
 * @returns {{
 *   rowId: string,
 *   focusIds: string[],
 *   industryTargets: Array<{name: string, score: number}>,
 *   notes: string,
 *   __extraFields: Record<string, unknown>
 * }}
 */
function buildFocusToIndustryRow(value) {
  const normalizedValue = isPlainObject(value) ? value : {};
  /** @type {Record<string, unknown>} */
  const extraFields = {};

  for (const [key, entry] of Object.entries(normalizedValue)) {
    if (["rowId", "focusIds", "industry", "industries", "notes"].includes(key)) {
      continue;
    }
    extraFields[key] = entry;
  }

  return {
    rowId: ensureRowId(normalizedValue.rowId),
    focusIds: readFocusIds(normalizedValue),
    industryTargets: readIndustryTargets(normalizedValue),
    notes: readTrimmedString(normalizedValue.notes),
    __extraFields: extraFields
  };
}

/**
 * Builds one focus-to-industry editor view model.
 * @param {{document: unknown}} options
 * @returns {{rows: ReturnType<typeof buildFocusToIndustryRow>[]}}
 */
function buildFocusToIndustryViewModel(options) {
  return {
    rows: resolveDocumentRows(options?.document)
      .filter((entry) => isPlainObject(entry))
      .map((entry) => buildFocusToIndustryRow(entry))
  };
}

/**
 * Builds one canonical focus-to-industry row for persistence.
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>|null}
 */
function buildPersistedRow(row) {
  const focusIds = readFocusIds(row);
  const industryTargets = readIndustryTargets(row);
  const notes = readTrimmedString(row?.notes);
  if (!focusIds.length || !industryTargets.length) {
    return null;
  }

  /** @type {Record<string, unknown>} */
  const nextRow = {
    ...(isPlainObject(row?.__extraFields) ? row.__extraFields : {}),
    rowId: ensureRowId(row?.rowId),
    focusIds,
    industry: industryTargets[0].name,
    industries: industryTargets
  };

  if (notes) {
    nextRow.notes = notes;
  }

  return nextRow;
}

/**
 * Builds one canonical focus-to-industry document from edited rows.
 * @param {{sourceDocument: unknown, rows: Record<string, unknown>[]}} options
 * @returns {unknown}
 */
function buildFocusToIndustryDocument(options) {
  const sourceDocument = isPlainObject(options?.sourceDocument) ? options.sourceDocument : {};
  const rows = Array.isArray(options?.rows) ? options.rows : [];
  const nextRows = rows.map((row) => buildPersistedRow(row)).filter(Boolean);

  if (Array.isArray(options?.sourceDocument)) {
    return nextRows;
  }

  return {
    ...sourceDocument,
    rows: nextRows
  };
}

module.exports = {
  buildFocusToIndustryDocument,
  buildFocusToIndustryViewModel
};
