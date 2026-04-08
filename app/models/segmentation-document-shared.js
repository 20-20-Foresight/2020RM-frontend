/**
 * Returns whether a value is a plain object.
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
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

/**
 * Returns one stable ID, generating it when needed.
 * @param {unknown} value
 * @returns {string}
 */
function ensureDocumentId(value) {
  const existingId = readTrimmedString(value);
  if (existingId) {
    return existingId;
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
 * Reads one string array from scalars or arrays.
 * @param {unknown} value
 * @returns {string[]}
 */
function readStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => readTrimmedString(entry)).filter(Boolean);
  }

  const singleValue = readTrimmedString(value);
  return singleValue ? [singleValue] : [];
}

/**
 * Reads one multiline examples field from a stored array or scalar.
 * @param {unknown} value
 * @returns {string}
 */
function readExamplesText(value) {
  return readStringArray(value).join("\n");
}

/**
 * Splits one textarea examples field into a stored array.
 * @param {unknown} value
 * @returns {string[]}
 */
function buildExamplesArray(value) {
  const text = readTrimmedString(value);
  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Resolves the editable array wrapper for one document.
 * @param {unknown} document
 * @returns {{wrapperKey: string|null, value: unknown[]}}
 */
function resolveDocumentArrayWrapper(document) {
  if (Array.isArray(document)) {
    return {
      wrapperKey: null,
      value: document
    };
  }

  if (!isPlainObject(document)) {
    return {
      wrapperKey: null,
      value: []
    };
  }

  const arrayKeys = ["values", "categories", "items", "entries", "dimensions"].filter((key) => Array.isArray(document[key]));
  if (arrayKeys.length === 1) {
    return {
      wrapperKey: arrayKeys[0],
      value: document[arrayKeys[0]]
    };
  }

  return {
    wrapperKey: null,
    value: []
  };
}

/**
 * Applies an array wrapper back onto the source document when possible.
 * @param {unknown} sourceDocument
 * @param {unknown[]} rows
 * @returns {unknown}
 */
function applyDocumentArrayWrapper(sourceDocument, rows) {
  if (Array.isArray(sourceDocument)) {
    return rows;
  }

  if (isPlainObject(sourceDocument)) {
    const { wrapperKey } = resolveDocumentArrayWrapper(sourceDocument);
    if (wrapperKey) {
      return {
        ...sourceDocument,
        [wrapperKey]: rows
      };
    }
  }

  return {
    values: rows
  };
}

module.exports = {
  applyDocumentArrayWrapper,
  buildExamplesArray,
  ensureDocumentId,
  isPlainObject,
  readExamplesText,
  readStringArray,
  readTrimmedString,
  resolveDocumentArrayWrapper
};
