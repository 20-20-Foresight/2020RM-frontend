/**
 * Reads a trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes one dimension key for page-level matching.
 * @param {unknown} value
 * @returns {string}
 */
function normalizeDimensionKey(value) {
  return readTrimmedString(value)
    .toLowerCase()
    .replace(/^dimension[-:_\s]*/, "");
}

/**
 * Resolves the locked dimension id for single-dimension category pages.
 * @param {{
 *   documentName?: unknown,
 *   metadataName?: unknown,
 *   dimensionCatalog?: Array<{id?: unknown, label?: unknown}>
 * }} options
 * @returns {string}
 */
export function resolveLockedDimensionId(options) {
  const pageKey = normalizeDimensionKey(readTrimmedString(options?.documentName) || readTrimmedString(options?.metadataName));
  if (!pageKey) {
    return "";
  }

  const dimensionOptions = Array.isArray(options?.dimensionCatalog) ? options.dimensionCatalog : [];
  const matchedOption = dimensionOptions.find((option) => {
    const optionLabel = normalizeDimensionKey(option?.label);
    const optionId = normalizeDimensionKey(option?.id);
    return optionLabel === pageKey || optionId === pageKey;
  });

  return readTrimmedString(matchedOption?.id);
}

/**
 * Forces one draft or saved row onto the locked page dimension.
 * @param {Record<string, unknown>} row
 * @param {string} lockedDimensionId
 * @returns {Record<string, unknown>}
 */
export function applyLockedDimensionId(row, lockedDimensionId) {
  if (!lockedDimensionId || !row || typeof row !== "object" || Array.isArray(row)) {
    return row;
  }

  return {
    ...row,
    dimensionId: lockedDimensionId
  };
}
