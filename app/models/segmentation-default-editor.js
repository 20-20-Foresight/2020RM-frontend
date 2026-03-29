const SEGMENTATION_SETTING_KEYS = new Set(["sector", "industry", "focus", "notes"]);

/**
 * Returns whether a value is a plain object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads a trimmed string or an empty string.
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
 * Reads a normalized branch label.
 * @param {unknown} value
 * @returns {string}
 */
function normalizeBranchValue(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null || value === 0) {
    return "";
  }

  return String(value).trim();
}

/**
 * Builds the display label for one category column depth.
 * @param {number} depth
 * @returns {string}
 */
function buildCategoryColumnLabel(depth) {
  if (depth <= 0) {
    return "Category";
  }

  if (depth === 1) {
    return "SubCategory";
  }

  return `${"Sub ".repeat(depth - 1)}Sub Category`;
}

/**
 * Returns whether one object already looks like a SIF settings leaf.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isSegmentationLeaf(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  return Object.keys(value).some((key) => SEGMENTATION_SETTING_KEYS.has(key.trim().toLowerCase()));
}

/**
 * Builds one default branch heading field name for flat crosswalk saves.
 * @param {number} index
 * @returns {string}
 */
function buildDefaultBranchFieldName(index) {
  if (index === 0) {
    return "category heading";
  }

  if (index === 1) {
    return "subcategory heading";
  }

  return `${"sub ".repeat(index - 1)}subcategory heading`;
}

/**
 * Returns whether the current wrapper uses a flat crosswalk map.
 * @param {unknown} crosswalk
 * @returns {boolean}
 */
function isFlatCrosswalk(crosswalk) {
  if (!isPlainObject(crosswalk)) {
    return false;
  }

  const values = Object.values(crosswalk);
  return values.length > 0 && values.every((value) => isSegmentationLeaf(value));
}

/**
 * Resolves whether the current document should use the segmentation.default editor.
 * @param {unknown} editorConfig
 * @param {unknown} document
 * @returns {"segmentation.default"|null}
 */
function resolveSegmentationDefaultEditorType(editorConfig, document) {
  const explicitType =
    readTrimmedString(editorConfig) ||
    readTrimmedString(editorConfig?.type) ||
    readTrimmedString(editorConfig?.editor) ||
    readTrimmedString(editorConfig?.name);

  if (explicitType === "segmentation.default") {
    return "segmentation.default";
  }

  const crosswalk = resolveCrosswalkRoot(document);
  if (isFlatCrosswalk(crosswalk)) {
    return "segmentation.default";
  }

  if (flattenNestedTree(crosswalk).length) {
    return "segmentation.default";
  }

  return null;
}

/**
 * Builds one normalized row from a flat crosswalk entry.
 * @param {string} key
 * @param {Record<string, unknown>} value
 * @returns {{
 *   categories: string[],
 *   sector: string,
 *   industry: string,
 *   focus: string,
 *   notes: string,
 *   __branchFieldNames: string[],
 *   __extraLeafFields: Record<string, unknown>
 * }}
 */
function buildFlatCrosswalkRow(key, value) {
  /** @type {string[]} */
  const branchFieldNames = [];
  /** @type {string[]} */
  const categories = [];
  /** @type {Record<string, unknown>} */
  const extraLeafFields = {};

  for (const [fieldName, fieldValue] of Object.entries(value)) {
    const normalizedFieldName = fieldName.trim().toLowerCase();
    if (SEGMENTATION_SETTING_KEYS.has(normalizedFieldName)) {
      continue;
    }

    branchFieldNames.push(fieldName);
    categories.push(normalizeBranchValue(fieldValue));
  }

  categories.push(readTrimmedString(key));

  for (const [fieldName, fieldValue] of Object.entries(value)) {
    const normalizedFieldName = fieldName.trim().toLowerCase();
    if (!SEGMENTATION_SETTING_KEYS.has(normalizedFieldName) && !branchFieldNames.includes(fieldName)) {
      extraLeafFields[fieldName] = fieldValue;
    }
  }

  return {
    categories,
    sector: readTrimmedString(value.sector),
    industry: readTrimmedString(value.industry),
    focus: readTrimmedString(value.focus),
    notes: readTrimmedString(value.notes),
    __branchFieldNames: branchFieldNames,
    __extraLeafFields: extraLeafFields
  };
}

/**
 * Recursively flattens one nested segmentation tree into row records.
 * @param {unknown} node
 * @param {string[]} path
 * @returns {Array<{
 *   categories: string[],
 *   sector: string,
 *   industry: string,
 *   focus: string,
 *   notes: string,
 *   __branchFieldNames: string[],
 *   __extraLeafFields: Record<string, unknown>
 * }>}
 */
function flattenNestedTree(node, path = []) {
  if (!isPlainObject(node)) {
    return [];
  }

  /** @type {ReturnType<typeof flattenNestedTree>} */
  const rows = [];

  for (const [key, value] of Object.entries(node)) {
    const nextPath = [...path, readTrimmedString(key)];

    if (isSegmentationLeaf(value)) {
      /** @type {Record<string, unknown>} */
      const extraLeafFields = {};

      for (const [fieldName, fieldValue] of Object.entries(value)) {
        const normalizedFieldName = fieldName.trim().toLowerCase();
        if (!SEGMENTATION_SETTING_KEYS.has(normalizedFieldName)) {
          extraLeafFields[fieldName] = fieldValue;
        }
      }

      rows.push({
        categories: nextPath,
        sector: readTrimmedString(value.sector),
        industry: readTrimmedString(value.industry),
        focus: readTrimmedString(value.focus),
        notes: readTrimmedString(value.notes),
        __branchFieldNames: [],
        __extraLeafFields: extraLeafFields
      });
      continue;
    }

    rows.push(...flattenNestedTree(value, nextPath));
  }

  return rows;
}

/**
 * Builds the root crosswalk tree for the current document.
 * @param {unknown} document
 * @returns {Record<string, unknown>|null}
 */
function resolveCrosswalkRoot(document) {
  if (isPlainObject(document?.crosswalk)) {
    return document.crosswalk;
  }

  return isPlainObject(document) ? document : null;
}

/**
 * Builds one view model for the segmentation.default editor.
 * @param {{document: unknown}} options
 * @returns {{
 *   structure: "flat-crosswalk"|"tree-crosswalk",
 *   categoryColumns: string[],
 *   rows: Array<{
 *     categories: string[],
 *     sector: string,
 *     industry: string,
 *     focus: string,
 *     notes: string,
 *     __branchFieldNames: string[],
 *     __extraLeafFields: Record<string, unknown>
 *   }>
 * }}
 */
function buildSegmentationDefaultViewModel(options) {
  const crosswalk = resolveCrosswalkRoot(options?.document);
  const structure = isFlatCrosswalk(crosswalk) ? "flat-crosswalk" : "tree-crosswalk";
  const rows =
    structure === "flat-crosswalk"
      ? Object.entries(crosswalk || {}).map(([key, value]) => buildFlatCrosswalkRow(key, value))
      : flattenNestedTree(crosswalk);
  const maxDepth = rows.reduce((maximum, row) => Math.max(maximum, row.categories.length), 0);

  return {
    structure,
    categoryColumns: Array.from({ length: maxDepth }, (_, index) => buildCategoryColumnLabel(index)),
    rows
  };
}

/**
 * Pads one category row so it can be saved consistently.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeCategoryArray(value) {
  return Array.isArray(value) ? value.map((entry) => normalizeBranchValue(entry)) : [];
}

/**
 * Builds one leaf settings payload from a row.
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
function buildLeafPayload(row) {
  /** @type {Record<string, unknown>} */
  const payload = {
    ...(isPlainObject(row.__extraLeafFields) ? row.__extraLeafFields : {})
  };

  const sector = readTrimmedString(row.sector);
  const industry = readTrimmedString(row.industry);
  const focus = readTrimmedString(row.focus);
  const notes = readTrimmedString(row.notes);

  if (sector) {
    payload.sector = sector;
  }

  if (industry) {
    payload.industry = industry;
  }

  if (focus) {
    payload.focus = focus;
  }

  if (notes) {
    payload.notes = notes;
  }

  return payload;
}

/**
 * Rebuilds one segmentation.default document from edited rows.
 * @param {{
 *   sourceDocument: unknown,
 *   structure: "flat-crosswalk"|"tree-crosswalk",
 *   rows: Record<string, unknown>[]
 * }} options
 * @returns {unknown}
 */
function buildSegmentationDefaultDocument(options) {
  const rows = Array.isArray(options?.rows) ? options.rows.filter((row) => isPlainObject(row)) : [];
  const sourceDocument = isPlainObject(options?.sourceDocument) ? options.sourceDocument : {};
  const structure = options?.structure === "tree-crosswalk" ? "tree-crosswalk" : "flat-crosswalk";

  if (structure === "tree-crosswalk") {
    /** @type {Record<string, unknown>} */
    const nextTree = {};

    for (const row of rows) {
      const categories = normalizeCategoryArray(row.categories).filter(Boolean);
      if (!categories.length) {
        continue;
      }

      let cursor = nextTree;
      for (let index = 0; index < categories.length - 1; index += 1) {
        const category = categories[index];
        if (!isPlainObject(cursor[category])) {
          cursor[category] = {};
        }
        cursor = cursor[category];
      }

      cursor[categories[categories.length - 1]] = buildLeafPayload(row);
    }

    if (isPlainObject(sourceDocument.crosswalk)) {
      return {
        ...sourceDocument,
        crosswalk: nextTree
      };
    }

    return nextTree;
  }

  /** @type {Record<string, unknown>} */
  const nextCrosswalk = {};

  for (const row of rows) {
    const categories = normalizeCategoryArray(row.categories);
    const sourceKey = categories[categories.length - 1];
    if (!sourceKey) {
      continue;
    }

    const branchFieldNames = Array.isArray(row.__branchFieldNames) && row.__branchFieldNames.length
      ? row.__branchFieldNames.map((name) => readTrimmedString(name)).filter(Boolean)
      : Array.from({ length: Math.max(categories.length - 1, 0) }, (_, index) => buildDefaultBranchFieldName(index));
    const leafPayload = buildLeafPayload(row);

    branchFieldNames.forEach((fieldName, index) => {
      leafPayload[fieldName] = categories[index] || 0;
    });

    nextCrosswalk[sourceKey] = leafPayload;
  }

  return {
    ...sourceDocument,
    crosswalk: nextCrosswalk
  };
}

module.exports = {
  buildSegmentationDefaultDocument,
  buildSegmentationDefaultViewModel,
  resolveSegmentationDefaultEditorType
};
