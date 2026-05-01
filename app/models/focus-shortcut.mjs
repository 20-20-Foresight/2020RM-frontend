/**
 * Special select value used to trigger inline Focus creation from another editor.
 */
export const NEW_FOCUS_OPTION_VALUE = "__new_focus__";

/**
 * Reads a trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Builds a stable slug from one label.
 * @param {unknown} value
 * @returns {string}
 */
function slugifyLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Chooses the friendlier of two labels that normalize to the same slug.
 * @param {string} currentValue
 * @param {string} nextValue
 * @returns {string}
 */
function choosePreferredLabel(currentValue, nextValue) {
  const current = readTrimmedString(currentValue);
  const next = readTrimmedString(nextValue);
  if (!current) {
    return next;
  }
  if (!next) {
    return current;
  }

  const currentLooksLikeSlug = current.includes("-") && current.toLowerCase() === slugifyLabel(current);
  const nextLooksLikeSlug = next.includes("-") && next.toLowerCase() === slugifyLabel(next);
  if (currentLooksLikeSlug && !nextLooksLikeSlug) {
    return next;
  }

  return current;
}

/**
 * Appends one Focus option while deduplicating by slug.
 * @param {string[]|null|undefined} options
 * @param {unknown} label
 * @returns {string[]}
 */
export function appendFocusOption(options, label) {
  /** @type {Map<string, string>} */
  const labelsBySlug = new Map();

  for (const rawValue of [...(Array.isArray(options) ? options : []), label]) {
    const value = readTrimmedString(rawValue);
    if (!value) {
      continue;
    }

    const slug = slugifyLabel(value) || value.toLowerCase();
    labelsBySlug.set(slug, choosePreferredLabel(labelsBySlug.get(slug) || "", value));
  }

  return Array.from(labelsBySlug.values()).sort((left, right) => left.localeCompare(right));
}

/**
 * Finds one existing Focus row that matches the requested label.
 * @param {Array<{label?: unknown}>|null|undefined} rows
 * @param {unknown} label
 * @returns {{label?: unknown}|null}
 */
export function findExistingFocusRow(rows, label) {
  const normalizedLabel = readTrimmedString(label);
  if (!normalizedLabel) {
    return null;
  }

  const normalizedSlug = slugifyLabel(normalizedLabel);
  return (
    (Array.isArray(rows) ? rows : []).find((row) => slugifyLabel(row?.label) === normalizedSlug) || null
  );
}

/**
 * Builds one Focus category row for persistence.
 * @param {{label?: unknown, description?: unknown, dimensionId?: unknown}} options
 * @returns {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   examplesText: string,
 *   dimensionId: string,
 *   preference: null,
 *   deletedOn: string,
 *   __extraFields: Record<string, unknown>
 * }}
 */
export function buildCreatedFocusRow(options) {
  return {
    id: "",
    label: readTrimmedString(options?.label),
    description: readTrimmedString(options?.description),
    examplesText: "",
    dimensionId: readTrimmedString(options?.dimensionId),
    preference: null,
    deletedOn: "",
    __extraFields: {}
  };
}
