import {
  applyDocumentArrayWrapper,
  buildExamplesArray,
  ensureDocumentId,
  isPlainObject,
  readExamplesText,
  readTrimmedString,
  resolveDocumentArrayWrapper
} from "./segmentation-document-shared.mjs";

/**
 * Builds one editable dimension-definition row.
 * @param {unknown} value
 * @returns {{
 *   id: string,
 *   key: string,
 *   label: string,
 *   description: string,
 *   examplesText: string,
 *   __extraFields: Record<string, unknown>
 * }}
 */
function buildDimensionDefinitionRow(value) {
  const normalizedValue = isPlainObject(value) ? value : {};
  /** @type {Record<string, unknown>} */
  const extraFields = {};

  for (const [key, entry] of Object.entries(normalizedValue)) {
    if (["id", "key", "name", "label", "title", "description", "examples"].includes(key)) {
      continue;
    }
    extraFields[key] = entry;
  }

  return {
    id: ensureDocumentId(normalizedValue.id),
    key: readTrimmedString(normalizedValue.key) || readTrimmedString(normalizedValue.name),
    label:
      readTrimmedString(normalizedValue.label) ||
      readTrimmedString(normalizedValue.title) ||
      readTrimmedString(normalizedValue.name),
    description: readTrimmedString(normalizedValue.description),
    examplesText: readExamplesText(normalizedValue.examples),
    __extraFields: extraFields
  };
}

/**
 * Builds one dimension-definition editor view model.
 * @param {{document: unknown}} options
 * @returns {{rows: ReturnType<typeof buildDimensionDefinitionRow>[]}}
 */
function buildDimensionDefinitionViewModel(options) {
  const { value } = resolveDocumentArrayWrapper(options?.document);
  return {
    rows: Array.isArray(value) ? value.filter((entry) => isPlainObject(entry)).map((entry) => buildDimensionDefinitionRow(entry)) : []
  };
}

/**
 * Builds one dimension-definition document from edited rows.
 * @param {{sourceDocument: unknown, rows: Record<string, unknown>[]}} options
 * @returns {unknown}
 */
function buildDimensionDefinitionDocument(options) {
  const rows = Array.isArray(options?.rows) ? options.rows.filter((row) => isPlainObject(row)) : [];
  const nextValues = rows
    .map((row) => {
      const key = readTrimmedString(row.key);
      const label = readTrimmedString(row.label);
      if (!key && !label) {
        return null;
      }

      /** @type {Record<string, unknown>} */
      const nextValue = {
        ...(isPlainObject(row.__extraFields) ? row.__extraFields : {}),
        id: ensureDocumentId(row.id)
      };

      if (key) {
        nextValue.key = key;
      }

      if (label) {
        nextValue.label = label;
      }

      const description = readTrimmedString(row.description);
      const examples = buildExamplesArray(row.examplesText);

      if (description) {
        nextValue.description = description;
      }

      if (examples.length) {
        nextValue.examples = examples;
      }

      return nextValue;
    })
    .filter(Boolean);

  return applyDocumentArrayWrapper(options?.sourceDocument, nextValues);
}

export {
  buildDimensionDefinitionDocument,
  buildDimensionDefinitionViewModel
};
