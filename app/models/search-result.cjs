/**
 * Returns whether a value is traversable like an object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObjectLike(value) {
  return Boolean(value) && typeof value === "object";
}

/**
 * Read a dotted path from an object-like value.
 * @param {unknown} value
 * @param {string} path
 * @returns {unknown}
 */
function readObjectPath(value, path) {
  if (!isObjectLike(value) || typeof path !== "string" || !path.trim()) {
    return null;
  }

  const resolved = path.split(".").reduce((currentValue, key) => {
    if (!isObjectLike(currentValue)) {
      return undefined;
    }

    return currentValue[key];
  }, value);

  if (typeof resolved === "string") {
    const trimmed = resolved.trim();
    return trimmed ? trimmed : null;
  }

  return resolved == null ? null : resolved;
}

/**
 * Read a string-like field value from a search result.
 * @param {unknown} result
 * @param {string} path
 * @returns {string|null}
 */
function getSearchResultFieldValue(result, path) {
  const value = readObjectPath(result, path);
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

/**
 * Read declared field paths from one schema payload.
 * @param {unknown} schema
 * @returns {string[]}
 */
function getSchemaFieldPaths(schema) {
  const fieldPaths = Array.isArray(schema?.document?.fieldPaths)
    ? schema.document.fieldPaths
    : Array.isArray(schema?.fieldPaths)
      ? schema.fieldPaths
      : [];

  return fieldPaths
    .map((field) => (typeof field?.path === "string" ? field.path.trim() : ""))
    .filter(Boolean);
}

/**
 * Resolve the first preferred path present in the active schema.
 * @param {unknown} schema
 * @param {string[]} preferredPaths
 * @returns {string|null}
 */
function resolveSchemaFieldPath(schema, preferredPaths) {
  const availablePaths = new Set(getSchemaFieldPaths(schema));
  const candidates = Array.isArray(preferredPaths) ? preferredPaths : [];

  for (const path of candidates) {
    if (typeof path === "string" && availablePaths.has(path)) {
      return path;
    }
  }

  return null;
}

module.exports = {
  getSearchResultFieldValue,
  getSchemaFieldPaths,
  resolveSchemaFieldPath,
  readObjectPath
};
