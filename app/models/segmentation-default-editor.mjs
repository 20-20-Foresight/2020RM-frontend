const SEGMENTATION_SETTING_KEYS = new Set(["sector", "industry", "focus", "notes"]);
const SEGMENTATION_EDITOR_TYPES = new Set(["segmentation.default", "segmentation.code", "segmentation.list"]);
const SEGMENTATION_FIELD_ALIASES = new Map([["focus(es)", "focus"]]);
const SEGMENTATION_TARGET_KEYS = new Set(["industries", "focuses"]);
const SEGMENTATION_META_KEYS = new Set(["rowid"]);

/**
 * Normalizes one scored category target entry.
 * @param {unknown} value
 * @returns {{name: string, score: number}|null}
 */
function normalizeTargetEntry(value) {
  if (typeof value === "string") {
    const name = readTrimmedString(value);
    return name ? { name, score: 3 } : null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const name =
    readTrimmedString(value.name) ||
    readTrimmedString(value.label) ||
    readTrimmedString(value.value);
  if (!name) {
    return null;
  }

  const parsedScore = Number(value.score);
  return {
    name,
    score: Number.isFinite(parsedScore) && parsedScore > 0 ? parsedScore : 3
  };
}

/**
 * Reads one normalized scored target list.
 * @param {unknown} value
 * @returns {Array<{name: string, score: number}>}
 */
function readTargetList(value) {
  const entries = Array.isArray(value) ? value : [];
  return entries.map((entry) => normalizeTargetEntry(entry)).filter(Boolean);
}

/**
 * Reads one row target list while preserving legacy leaf compatibility.
 * @param {unknown} value
 * @param {"industry"|"focus"} key
 * @returns {Array<{name: string, score: number}>}
 */
function readRowTargets(value, key) {
  const listKey = key === "industry" ? "industries" : "focuses";
  const explicitTargets = readTargetList(value?.[listKey]);
  if (explicitTargets.length) {
    return explicitTargets;
  }

  const legacyValue = readSegmentationLeafField(value, key);
  if (!legacyValue) {
    return [];
  }

  return [{ name: legacyValue, score: 3 }];
}

/**
 * Returns the first target name from a normalized target list.
 * @param {Array<{name: string, score: number}>} targets
 * @returns {string}
 */
function readPrimaryTargetName(targets) {
  return Array.isArray(targets) && targets.length ? readTrimmedString(targets[0]?.name) : "";
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
 * Normalizes one leaf field name to its canonical segmentation key.
 * @param {unknown} fieldName
 * @returns {string}
 */
function normalizeSegmentationFieldName(fieldName) {
  const normalizedFieldName = readTrimmedString(fieldName).toLowerCase();
  return SEGMENTATION_FIELD_ALIASES.get(normalizedFieldName) || normalizedFieldName;
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

  return Object.keys(value).some((key) => {
    const normalizedKey = normalizeSegmentationFieldName(key);
    return (
      SEGMENTATION_SETTING_KEYS.has(normalizedKey) ||
      SEGMENTATION_TARGET_KEYS.has(normalizedKey) ||
      SEGMENTATION_META_KEYS.has(normalizedKey)
    );
  });
}

/**
 * Reads one canonical segmentation leaf field from an object.
 * @param {unknown} value
 * @param {string} key
 * @returns {string}
 */
function readSegmentationLeafField(value, key) {
  if (!isPlainObject(value)) {
    return "";
  }

  for (const [fieldName, fieldValue] of Object.entries(value)) {
    if (normalizeSegmentationFieldName(fieldName) === key) {
      return readTrimmedString(fieldValue);
    }
  }

  return "";
}

/**
 * Collects non-canonical leaf fields so they can round-trip through edits.
 * @param {unknown} value
 * @param {Set<string>} excludedFields
 * @returns {Record<string, unknown>}
 */
function collectExtraLeafFields(value, excludedFields = new Set()) {
  /** @type {Record<string, unknown>} */
  const extraLeafFields = {};

  if (!isPlainObject(value)) {
    return extraLeafFields;
  }

  for (const [fieldName, fieldValue] of Object.entries(value)) {
    const normalizedFieldName = normalizeSegmentationFieldName(fieldName);
    if (
      SEGMENTATION_SETTING_KEYS.has(normalizedFieldName) ||
      SEGMENTATION_TARGET_KEYS.has(normalizedFieldName) ||
      SEGMENTATION_META_KEYS.has(normalizedFieldName) ||
      excludedFields.has(normalizedFieldName)
    ) {
      continue;
    }

    extraLeafFields[fieldName] = fieldValue;
  }

  return extraLeafFields;
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
 * Resolves the editable list wrapper for one segmentation.list document.
 * @param {unknown} document
 * @returns {{wrapperKey: string|null, value: unknown[]}}
 */
function resolveSegmentationListRoot(document) {
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

  const arrayKeys = Object.keys(document).filter((key) => Array.isArray(document[key]));
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
 * Returns whether the current wrapper uses the segmentation.code crosswalk shape.
 * @param {unknown} crosswalk
 * @returns {boolean}
 */
function isCodeCrosswalk(crosswalk) {
  if (!isPlainObject(crosswalk)) {
    return false;
  }

  const values = Object.values(crosswalk);
  if (!values.length) {
    return false;
  }

  return values.every((value) => {
    if (!isPlainObject(value)) {
      return false;
    }

    return Object.keys(value).every((key) => {
      const normalizedFieldName = normalizeSegmentationFieldName(key);
      return (
        SEGMENTATION_SETTING_KEYS.has(normalizedFieldName) ||
        SEGMENTATION_TARGET_KEYS.has(normalizedFieldName) ||
        SEGMENTATION_META_KEYS.has(normalizedFieldName) ||
        normalizedFieldName === "description"
      );
    });
  });
}

/**
 * Resolves whether the current document should use the segmentation.default editor.
 * @param {unknown} editorConfig
 * @param {unknown} document
 * @param {unknown} [documentType]
 * @returns {"segmentation.default"|"segmentation.code"|"segmentation.list"|null}
 */
function resolveSegmentationDefaultEditorType(editorConfig, document, documentType = null) {
  const explicitType =
    readTrimmedString(editorConfig) ||
    readTrimmedString(editorConfig?.type) ||
    readTrimmedString(editorConfig?.editor) ||
    readTrimmedString(editorConfig?.name);

  if (SEGMENTATION_EDITOR_TYPES.has(explicitType)) {
    return explicitType;
  }

  const normalizedDocumentType = readTrimmedString(documentType);
  if (normalizedDocumentType === "segmentation") {
    const { value } = resolveSegmentationListRoot(document);
    if (Array.isArray(value) && value.some((row) => isPlainObject(row))) {
      return "segmentation.list";
    }
  }

  const crosswalk = resolveCrosswalkRoot(document);
  if (normalizedDocumentType === "segmentation" && isCodeCrosswalk(crosswalk)) {
    return "segmentation.code";
  }

  if (isFlatCrosswalk(crosswalk)) {
    return "segmentation.default";
  }

  if (flattenNestedTree(crosswalk).length) {
    return "segmentation.default";
  }

  return null;
}

/**
 * Collects the non-SIF column names from one segmentation.list payload.
 * @param {unknown[]} rows
 * @returns {string[]}
 */
function collectSegmentationListColumns(rows) {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const columns = [];

  for (const row of rows) {
    if (!isPlainObject(row)) {
      continue;
    }

    for (const key of Object.keys(row)) {
      const fieldName = readTrimmedString(key);
      if (!fieldName) {
        continue;
      }

      const normalizedFieldName = normalizeSegmentationFieldName(fieldName);
      if (
        SEGMENTATION_SETTING_KEYS.has(normalizedFieldName) ||
        SEGMENTATION_TARGET_KEYS.has(normalizedFieldName) ||
        SEGMENTATION_META_KEYS.has(normalizedFieldName)
      ) {
        continue;
      }

      const normalizedColumnKey = fieldName.toLowerCase();
      if (seen.has(normalizedColumnKey)) {
        continue;
      }

      seen.add(normalizedColumnKey);
      columns.push(fieldName);
    }
  }

  return columns;
}

/**
 * Reads one non-SIF field value from a list row using loose field-name matching.
 * @param {unknown} row
 * @param {string} fieldName
 * @returns {string}
 */
function readSegmentationListField(row, fieldName) {
  if (!isPlainObject(row)) {
    return "";
  }

  const normalizedFieldName = readTrimmedString(fieldName).toLowerCase();
  for (const [key, value] of Object.entries(row)) {
    if (readTrimmedString(key).toLowerCase() === normalizedFieldName) {
      return normalizeBranchValue(value);
    }
  }

  return "";
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
 *   industryTargets: Array<{name: string, score: number}>,
 *   focusTargets: Array<{name: string, score: number}>,
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

  for (const [fieldName, fieldValue] of Object.entries(value)) {
    const normalizedFieldName = normalizeSegmentationFieldName(fieldName);
    if (
      SEGMENTATION_SETTING_KEYS.has(normalizedFieldName) ||
      SEGMENTATION_TARGET_KEYS.has(normalizedFieldName) ||
      SEGMENTATION_META_KEYS.has(normalizedFieldName) ||
      normalizedFieldName === "description"
    ) {
      continue;
    }

    branchFieldNames.push(fieldName);
    categories.push(normalizeBranchValue(fieldValue));
  }

  categories.push(readTrimmedString(key));

  const industryTargets = readRowTargets(value, "industry");
  const focusTargets = readRowTargets(value, "focus");

  return {
    rowId: ensureRowId(value.rowId),
    categories,
    description: "",
    sector: readSegmentationLeafField(value, "sector"),
    industry: readPrimaryTargetName(industryTargets),
    focus: readPrimaryTargetName(focusTargets),
    industryTargets,
    focusTargets,
    notes: readSegmentationLeafField(value, "notes"),
    __branchFieldNames: branchFieldNames,
    __extraLeafFields: collectExtraLeafFields(value)
  };
}

/**
 * Builds one normalized row from a segmentation.code flat crosswalk entry.
 * @param {string} key
 * @param {Record<string, unknown>} value
 * @returns {{
 *   categories: string[],
 *   description: string,
 *   sector: string,
 *   industry: string,
 *   focus: string,
 *   industryTargets: Array<{name: string, score: number}>,
 *   focusTargets: Array<{name: string, score: number}>,
 *   notes: string,
 *   __branchFieldNames: string[],
 *   __extraLeafFields: Record<string, unknown>
 * }}
 */
function buildCodeCrosswalkRow(key, value) {
  const industryTargets = readRowTargets(value, "industry");
  const focusTargets = readRowTargets(value, "focus");

  return {
    rowId: ensureRowId(value.rowId),
    categories: [readTrimmedString(key)],
    description: readSegmentationLeafField(value, "description"),
    sector: readSegmentationLeafField(value, "sector"),
    industry: readPrimaryTargetName(industryTargets),
    focus: readPrimaryTargetName(focusTargets),
    industryTargets,
    focusTargets,
    notes: readSegmentationLeafField(value, "notes"),
    __branchFieldNames: [],
    __extraLeafFields: collectExtraLeafFields(value, new Set(["description"]))
  };
}

/**
 * Builds one normalized row from a segmentation.list entry.
 * @param {unknown} value
 * @param {string[]} columns
 * @returns {{
 *   categories: string[],
 *   description: string,
 *   sector: string,
 *   industry: string,
 *   focus: string,
 *   industryTargets: Array<{name: string, score: number}>,
 *   focusTargets: Array<{name: string, score: number}>,
 *   notes: string,
 *   __branchFieldNames: string[],
 *   __extraLeafFields: Record<string, unknown>
 * }}
 */
function buildListRow(value, columns) {
  const normalizedColumns = Array.isArray(columns) ? columns.map((column) => readTrimmedString(column)).filter(Boolean) : [];
  const industryTargets = readRowTargets(value, "industry");
  const focusTargets = readRowTargets(value, "focus");

  return {
    rowId: ensureRowId(value.rowId),
    categories: normalizedColumns.map((column) => readSegmentationListField(value, column)),
    description: "",
    sector: readSegmentationLeafField(value, "sector"),
    industry: readPrimaryTargetName(industryTargets),
    focus: readPrimaryTargetName(focusTargets),
    industryTargets,
    focusTargets,
    notes: readSegmentationLeafField(value, "notes"),
    __branchFieldNames: normalizedColumns,
    __extraLeafFields: collectExtraLeafFields(value, new Set(normalizedColumns.map((column) => column.toLowerCase())))
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
 *   industryTargets: Array<{name: string, score: number}>,
 *   focusTargets: Array<{name: string, score: number}>,
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
      const industryTargets = readRowTargets(value, "industry");
      const focusTargets = readRowTargets(value, "focus");
      rows.push({
        rowId: ensureRowId(value.rowId),
        categories: nextPath,
        description: "",
        sector: readSegmentationLeafField(value, "sector"),
        industry: readPrimaryTargetName(industryTargets),
        focus: readPrimaryTargetName(focusTargets),
        industryTargets,
        focusTargets,
        notes: readSegmentationLeafField(value, "notes"),
        __branchFieldNames: [],
        __extraLeafFields: collectExtraLeafFields(value)
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
 * @param {string|null|undefined} [options.editorType]
 * @returns {{
 *   structure: "flat-crosswalk"|"tree-crosswalk"|"code-crosswalk"|"list-rows",
 *   categoryColumns: string[],
 *   categoryFieldNames: string[],
 *   valueColumns: Array<{key: string, label: string}>,
 *   rows: Array<{
 *     categories: string[],
 *     description: string,
 *     sector: string,
 *     industry: string,
 *     focus: string,
 *     industryTargets: Array<{name: string, score: number}>,
 *     focusTargets: Array<{name: string, score: number}>,
 *     notes: string,
 *     __branchFieldNames: string[],
 *     __extraLeafFields: Record<string, unknown>
 *   }>
 * }}
 */
function buildSegmentationDefaultViewModel(options) {
  const editorType = resolveSegmentationDefaultEditorType(options?.editorType, options?.document);
  const crosswalk = resolveCrosswalkRoot(options?.document);

  if (editorType === "segmentation.list") {
    const { value } = resolveSegmentationListRoot(options?.document);
    const categoryColumns = collectSegmentationListColumns(Array.isArray(value) ? value : []);

    return {
      structure: "list-rows",
      categoryColumns,
      categoryFieldNames: categoryColumns,
      valueColumns: [],
      rows: Array.isArray(value) ? value.filter((row) => isPlainObject(row)).map((row) => buildListRow(row, categoryColumns)) : []
    };
  }

  if (editorType === "segmentation.code") {
    return {
      structure: "code-crosswalk",
      categoryColumns: ["code"],
      categoryFieldNames: ["code"],
      valueColumns: [
        {
          key: "description",
          label: "description"
        }
      ],
      rows: Object.entries(crosswalk || {}).map(([key, value]) => buildCodeCrosswalkRow(key, value))
    };
  }

  const structure = isFlatCrosswalk(crosswalk) ? "flat-crosswalk" : "tree-crosswalk";
  const rows =
    structure === "flat-crosswalk"
      ? Object.entries(crosswalk || {}).map(([key, value]) => buildFlatCrosswalkRow(key, value))
      : flattenNestedTree(crosswalk);
  const maxDepth = rows.reduce((maximum, row) => Math.max(maximum, row.categories.length), 0);

  return {
    structure,
    categoryColumns: Array.from({ length: maxDepth }, (_, index) => buildCategoryColumnLabel(index)),
    categoryFieldNames: [],
    valueColumns: [],
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
function buildLeafPayload(row, options = {}) {
  /** @type {Record<string, unknown>} */
  const payload = {
    ...(isPlainObject(row.__extraLeafFields) ? row.__extraLeafFields : {})
  };

  const description = readTrimmedString(row.description);
  const sector = readTrimmedString(row.sector);
  const industry = readTrimmedString(row.industry);
  const focus = readTrimmedString(row.focus);
  const notes = readTrimmedString(row.notes);
  const industryTargets = readTargetList(row.industryTargets);
  const focusTargets = readTargetList(row.focusTargets);
  const primaryIndustry = readPrimaryTargetName(industryTargets) || industry;
  const primaryFocus = readPrimaryTargetName(focusTargets) || focus;
  payload.rowId = ensureRowId(row.rowId);

  if (options.includeDescription && description) {
    payload.description = description;
  }

  if (sector) {
    payload.sector = sector;
  }

  if (primaryIndustry) {
    payload.industry = primaryIndustry;
  }

  if (industryTargets.length) {
    payload.industries = industryTargets;
  }

  if (primaryFocus) {
    payload.focus = primaryFocus;
  }

  if (focusTargets.length) {
    payload.focuses = focusTargets;
  }

  if (notes) {
    payload.notes = notes;
  }

  return payload;
}

/**
 * Applies an updated list payload back into the original document wrapper.
 * @param {unknown} sourceDocument
 * @param {Record<string, unknown>[]} nextList
 * @returns {unknown}
 */
function applySegmentationListWrapper(sourceDocument, nextList) {
  if (Array.isArray(sourceDocument)) {
    return nextList;
  }

  if (isPlainObject(sourceDocument)) {
    const arrayKeys = Object.keys(sourceDocument).filter((key) => Array.isArray(sourceDocument[key]));
    if (arrayKeys.length === 1) {
      return {
        ...sourceDocument,
        [arrayKeys[0]]: nextList
      };
    }
  }

  return nextList;
}

/**
 * Rebuilds one segmentation.default document from edited rows.
 * @param {{
 *   sourceDocument: unknown,
 *   structure: "flat-crosswalk"|"tree-crosswalk"|"code-crosswalk"|"list-rows",
 *   rows: Record<string, unknown>[]
 * }} options
 * @returns {unknown}
 */
function buildSegmentationDefaultDocument(options) {
  const rows = Array.isArray(options?.rows) ? options.rows.filter((row) => isPlainObject(row)) : [];
  const sourceDocument = options?.sourceDocument;
  const sourceDocumentObject = isPlainObject(sourceDocument) ? sourceDocument : {};
  const structure = options?.structure === "tree-crosswalk" ? "tree-crosswalk" : "flat-crosswalk";

  if (options?.structure === "list-rows") {
    /** @type {Record<string, unknown>[]} */
    const nextList = [];

    for (const row of rows) {
      const columnNames = Array.isArray(row.__branchFieldNames)
        ? row.__branchFieldNames.map((name) => readTrimmedString(name)).filter(Boolean)
        : [];
      /** @type {Record<string, unknown>} */
      const nextRow = {
        ...(isPlainObject(row.__extraLeafFields) ? row.__extraLeafFields : {})
      };

      columnNames.forEach((fieldName, index) => {
        const value = normalizeBranchValue(row.categories?.[index]);
        if (value) {
          nextRow[fieldName] = value;
        }
      });

      Object.assign(
        nextRow,
        buildLeafPayload(
          {
            ...row,
            __extraLeafFields: {}
          },
          {}
        )
      );

      if (Object.keys(nextRow).length) {
        nextList.push(nextRow);
      }
    }

    return applySegmentationListWrapper(sourceDocument, nextList);
  }

  if (options?.structure === "code-crosswalk") {
    /** @type {Record<string, unknown>} */
    const nextCrosswalk = {};

    for (const row of rows) {
      const code = normalizeBranchValue(row.categories?.[0]);
      if (!code) {
        continue;
      }

      nextCrosswalk[code] = buildLeafPayload(row, {
        includeDescription: true
      });
    }

    return {
      ...sourceDocumentObject,
      crosswalk: nextCrosswalk
    };
  }

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

    if (isPlainObject(sourceDocumentObject.crosswalk)) {
      return {
        ...sourceDocumentObject,
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
    ...sourceDocumentObject,
    crosswalk: nextCrosswalk
  };
}

export {
  buildSegmentationDefaultDocument,
  buildSegmentationDefaultViewModel,
  resolveSegmentationDefaultEditorType
};
