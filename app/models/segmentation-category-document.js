const {
  applyDocumentArrayWrapper,
  buildExamplesArray,
  ensureDocumentId,
  isPlainObject,
  readExamplesText,
  readTrimmedString,
  resolveDocumentArrayWrapper
} = require("./segmentation-document-shared");

/**
 * Builds one editable category row.
 * @param {unknown} value
 * @returns {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   examplesText: string,
 *   dimensionId: string,
 *   preference: number|null,
 *   deletedOn: string,
 *   __extraFields: Record<string, unknown>
 * }}
 */
function buildCategoryRow(value) {
  const normalizedValue = isPlainObject(value) ? value : {};
  const label =
    readTrimmedString(normalizedValue.label) ||
    readTrimmedString(normalizedValue.name) ||
    readTrimmedString(normalizedValue.title);
  const parsedPreference = Number(normalizedValue.preference);

  /** @type {Record<string, unknown>} */
  const extraFields = {};
  for (const [key, entry] of Object.entries(normalizedValue)) {
    if (["id", "label", "name", "title", "description", "examples", "dimensionId", "dimension", "preference", "deletedOn", "deleted"].includes(key)) {
      continue;
    }
    extraFields[key] = entry;
  }

  return {
    id: ensureDocumentId(normalizedValue.id),
    label,
    description: readTrimmedString(normalizedValue.description),
    examplesText: readExamplesText(normalizedValue.examples),
    dimensionId: readTrimmedString(normalizedValue.dimensionId) || readTrimmedString(normalizedValue.dimension),
    preference: Number.isFinite(parsedPreference) ? parsedPreference : null,
    deletedOn: readTrimmedString(normalizedValue.deletedOn) || (normalizedValue.deleted === true ? new Date(0).toISOString() : ""),
    __extraFields: extraFields
  };
}

/**
 * Builds one category-editor view model.
 * @param {{document: unknown, supportsPreference?: boolean}} options
 * @returns {{rows: ReturnType<typeof buildCategoryRow>[]}}
 */
function buildCategoryViewModel(options) {
  const { value } = resolveDocumentArrayWrapper(options?.document);
  return {
    rows: Array.isArray(value) ? value.filter((entry) => isPlainObject(entry)).map((entry) => buildCategoryRow(entry)) : []
  };
}

/**
 * Builds one canonical category document from edited rows.
 * @param {{sourceDocument: unknown, rows: Record<string, unknown>[], supportsPreference?: boolean}} options
 * @returns {unknown}
 */
function buildCategoryDocument(options) {
  const rows = Array.isArray(options?.rows) ? options.rows.filter((row) => isPlainObject(row)) : [];
  let nextPreference = 1;

  const nextValues = rows
    .map((row) => {
      const label = readTrimmedString(row.label);
      if (!label) {
        return null;
      }

      const deletedOn = readTrimmedString(row.deletedOn);
      /** @type {Record<string, unknown>} */
      const nextValue = {
        ...(isPlainObject(row.__extraFields) ? row.__extraFields : {}),
        id: ensureDocumentId(row.id),
        label
      };

      const description = readTrimmedString(row.description);
      const examples = buildExamplesArray(row.examplesText);
      const dimensionId = readTrimmedString(row.dimensionId);

      if (description) {
        nextValue.description = description;
      }

      if (examples.length) {
        nextValue.examples = examples;
      }

      if (dimensionId) {
        nextValue.dimensionId = dimensionId;
      }

      if (options?.supportsPreference) {
        if (deletedOn) {
          const parsedPreference = Number(row.preference);
          if (Number.isFinite(parsedPreference) && parsedPreference > 0) {
            nextValue.preference = parsedPreference;
          }
        } else {
          nextValue.preference = nextPreference;
          nextPreference += 1;
        }
      }

      if (deletedOn) {
        nextValue.deletedOn = deletedOn;
      } else {
        delete nextValue.deletedOn;
        delete nextValue.deleted;
      }

      return nextValue;
    })
    .filter(Boolean);

  return applyDocumentArrayWrapper(options?.sourceDocument, nextValues);
}

module.exports = {
  buildCategoryDocument,
  buildCategoryViewModel
};
