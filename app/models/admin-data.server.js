/**
 * Error raised when an admin data RPC request fails.
 */
class AdminDataApiError extends Error {
  /**
   * @param {string} message
   * @param {{code?: string, statusCode?: number, cause?: unknown}} [options]
   */
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "AdminDataApiError";
    this.code = options.code || "admin_data_request_failed";
    this.statusCode = options.statusCode || 500;
  }
}

const KNOWN_EDITOR_SHAPES = new Set(["crosswalk", "list", "keyvalue", "object"]);

/**
 * Returns whether a value is a plain object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads a trimmed string or null.
 * @param {unknown} value
 * @returns {string|null}
 */
function readTrimmedString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Reads a JSON response body without assuming shape.
 * @param {{ json?: Function }} response
 * @returns {Promise<Record<string, unknown>|null>}
 */
async function tryReadJson(response) {
  if (!response || typeof response.json !== "function") {
    return null;
  }

  try {
    const payload = await response.json();
    return isPlainObject(payload) ? payload : null;
  } catch (_error) {
    return null;
  }
}

/**
 * Builds a stable frontend identifier for one admin data record.
 * @param {unknown} value
 * @returns {string|null}
 */
function readDataId(value) {
  const explicitId = readTrimmedString(value?.id);
  if (explicitId) {
    return explicitId;
  }

  const namespace = readTrimmedString(value?.namespace);
  const key = readTrimmedString(value?.key);
  if (namespace && key) {
    return `${namespace}:${key}`;
  }

  return key || null;
}

/**
 * Normalizes one summary/detail response object into a shared shape.
 * @param {unknown} value
 * @returns {{
 *   id: string|null,
 *   namespace: string|null,
 *   key: string|null,
 *   name: string,
 *   description: string,
 *   shape: string|null,
 *   version: number|null,
 *   lastmodifieddate: string|null,
 *   lastmodifiedby: string|null,
 *   status: string|null
 * }}
 */
function normalizeSummary(value) {
  return {
    id: readDataId(value),
    namespace: readTrimmedString(value?.namespace),
    key: readTrimmedString(value?.key),
    name: readTrimmedString(value?.name) || readTrimmedString(value?.key) || "Untitled data",
    description: readTrimmedString(value?.description) || "",
    shape: readTrimmedString(value?.shape),
    version: Number.isFinite(value?.version) ? Number(value.version) : null,
    lastmodifieddate: readTrimmedString(value?.lastmodifieddate),
    lastmodifiedby: readTrimmedString(value?.lastmodifiedby),
    status: readTrimmedString(value?.status)
  };
}

/**
 * Reads one supported editor shape.
 * @param {unknown} value
 * @returns {"crosswalk"|"list"|"keyvalue"|"object"|null}
 */
function normalizeShape(value) {
  const shape = readTrimmedString(value);
  return shape && KNOWN_EDITOR_SHAPES.has(shape) ? shape : null;
}

/**
 * Returns whether one value can be represented as a simple string cell.
 * @param {unknown} value
 * @returns {boolean}
 */
function isScalarValue(value) {
  return value == null || (typeof value !== "object" && typeof value !== "function");
}

/**
 * Unwraps the most likely editable value from one document wrapper.
 * @param {unknown} document
 * @returns {{wrapperKey: string|null, value: unknown}}
 */
function unwrapDocumentValue(document) {
  if (Array.isArray(document) || !isPlainObject(document)) {
    return {
      wrapperKey: null,
      value: document
    };
  }

  if (isPlainObject(document.crosswalk)) {
    return {
      wrapperKey: "crosswalk",
      value: document.crosswalk
    };
  }

  const keys = Object.keys(document);
  if (keys.length === 1) {
    return {
      wrapperKey: keys[0],
      value: document[keys[0]]
    };
  }

  return {
    wrapperKey: null,
    value: document
  };
}

/**
 * Returns whether one value matches the crosswalk document pattern.
 * @param {unknown} value
 * @returns {boolean}
 */
function isCrosswalkValue(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  const entries = Object.values(value);
  if (!entries.length) {
    return false;
  }

  return entries.every((entry) => Array.isArray(entry) || (isPlainObject(entry) && Array.isArray(entry.values)));
}

/**
 * Infers the editable shape from one returned document.
 * @param {unknown} document
 * @param {unknown} explicitShape
 * @returns {"crosswalk"|"list"|"keyvalue"|"object"|null}
 */
function inferShape(document, explicitShape) {
  const normalizedExplicitShape = normalizeShape(explicitShape);
  if (normalizedExplicitShape) {
    return normalizedExplicitShape;
  }

  const { wrapperKey, value } = unwrapDocumentValue(document);
  if (wrapperKey === "crosswalk" || isCrosswalkValue(value)) {
    return "crosswalk";
  }

  if (Array.isArray(value)) {
    return "list";
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const entries = Object.values(value).filter((entry) => entry != null);
  if (!entries.length) {
    return wrapperKey === "entries" ? "keyvalue" : null;
  }

  if (entries.every((entry) => isScalarValue(entry))) {
    return "keyvalue";
  }

  if (entries.every((entry) => isPlainObject(entry))) {
    return "object";
  }

  return null;
}

/**
 * Collects a stable column list from object-like rows.
 * @param {unknown[]} values
 * @returns {string[]}
 */
function collectColumns(values) {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const columns = [];

  for (const value of values) {
    if (!isPlainObject(value)) {
      continue;
    }

    for (const key of Object.keys(value)) {
      const column = key.trim();
      if (column && !seen.has(column)) {
        seen.add(column);
        columns.push(column);
      }
    }
  }

  return columns;
}

/**
 * Builds editor rows from a wrapped document when no explicit editor metadata exists.
 * @param {unknown} document
 * @param {"crosswalk"|"list"|"keyvalue"|"object"|null} shape
 * @returns {{columns: string[], rows: Record<string, string>[]}}
 */
function inferEditorFromDocument(document, shape) {
  const { value } = unwrapDocumentValue(document);

  if (shape === "crosswalk") {
    if (!isPlainObject(value)) {
      return {
        columns: ["source", "target"],
        rows: []
      };
    }

    /** @type {Record<string, string>[]} */
    const rows = [];

    for (const [source, targetValue] of Object.entries(value)) {
      const targets = Array.isArray(targetValue)
        ? targetValue
        : Array.isArray(targetValue?.values)
          ? targetValue.values
          : [];

      if (!targets.length) {
        rows.push({
          source,
          target: ""
        });
        continue;
      }

      for (const target of targets) {
        rows.push({
          source,
          target: target == null ? "" : String(target)
        });
      }
    }

    return {
      columns: ["source", "target"],
      rows
    };
  }

  if (shape === "list") {
    if (!Array.isArray(value)) {
      return {
        columns: ["value"],
        rows: []
      };
    }

    const objectColumns = value.some((entry) => isPlainObject(entry)) ? collectColumns(value) : [];
    if (objectColumns.length) {
      return {
        columns: objectColumns,
        rows: value
          .filter((entry) => isPlainObject(entry))
          .map((entry) =>
            Object.fromEntries(
              objectColumns.map((column) => [column, entry[column] == null ? "" : String(entry[column])])
            )
          )
      };
    }

    return {
      columns: ["value"],
      rows: value.map((entry) => ({
        value: entry == null ? "" : String(entry)
      }))
    };
  }

  if (shape === "keyvalue") {
    if (!isPlainObject(value)) {
      return {
        columns: ["key", "value"],
        rows: []
      };
    }

    return {
      columns: ["key", "value"],
      rows: Object.entries(value).map(([key, entryValue]) => ({
        key,
        value: entryValue == null ? "" : String(entryValue)
      }))
    };
  }

  if (shape === "object") {
    if (!isPlainObject(value)) {
      return {
        columns: ["key", "value"],
        rows: []
      };
    }

    const nestedColumns = collectColumns(Object.values(value));
    const columns = nestedColumns.length ? ["key", ...nestedColumns] : ["key", "value"];

    return {
      columns,
      rows: Object.entries(value).map(([key, entryValue]) =>
        Object.fromEntries(
          columns.map((column, columnIndex) => {
            if (columnIndex === 0) {
              return [column, key];
            }

            return [column, entryValue?.[column] == null ? "" : String(entryValue[column])];
          })
        )
      )
    };
  }

  return {
    columns: [],
    rows: []
  };
}

/**
 * Returns column names for an editor payload.
 * @param {unknown} editor
 * @returns {string[]}
 */
function normalizeColumns(editor) {
  const explicitColumns = Array.isArray(editor?.columns)
    ? editor.columns
        .map((column) => readTrimmedString(column))
        .filter(Boolean)
    : [];

  if (explicitColumns.length) {
    return explicitColumns;
  }

  if (!Array.isArray(editor?.rows) || !editor.rows.length || !isPlainObject(editor.rows[0])) {
    return [];
  }

  return Object.keys(editor.rows[0]).map((column) => column.trim()).filter(Boolean);
}

/**
 * Normalizes editor rows so each declared column is present.
 * @param {unknown} editor
 * @param {{shape?: unknown, document?: unknown}} [options]
 * @returns {{columns: string[], rows: Record<string, string>[]}}
 */
function normalizeEditor(editor, options = {}) {
  const columns = normalizeColumns(editor);
  const rows = Array.isArray(editor?.rows)
    ? editor.rows
        .filter((row) => isPlainObject(row))
        .map((row) =>
          Object.fromEntries(
            columns.map((column) => {
              const value = row[column];
              return [column, value == null ? "" : String(value)];
            })
          )
        )
    : [];

  if (columns.length) {
    return {
      columns,
      rows
    };
  }

  const inferredShape = inferShape(options.document, options.shape);

  return {
    ...inferEditorFromDocument(options.document, inferredShape)
  };
}

/**
 * Reads a non-empty cell value.
 * @param {unknown} value
 * @returns {string|null}
 */
function readEditorCell(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (value == null) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue ? stringValue : null;
}

/**
 * Replaces the editable value inside the existing document wrapper when possible.
 * @param {unknown} document
 * @param {unknown} nextValue
 * @param {{preferredKey?: string|null}} [options]
 * @returns {unknown}
 */
function applyDocumentWrapper(document, nextValue, options = {}) {
  if (Array.isArray(document)) {
    return Array.isArray(nextValue) ? nextValue : document;
  }

  if (!isPlainObject(document)) {
    if (options.preferredKey && isPlainObject(nextValue)) {
      return {
        [options.preferredKey]: nextValue
      };
    }

    return nextValue;
  }

  if (options.preferredKey && options.preferredKey in document) {
    return {
      ...document,
      [options.preferredKey]: nextValue
    };
  }

  const keys = Object.keys(document);
  if (keys.length === 1) {
    return {
      ...document,
      [keys[0]]: nextValue
    };
  }

  if (keys.length === 0 && options.preferredKey && isPlainObject(nextValue)) {
    return {
      [options.preferredKey]: nextValue
    };
  }

  return nextValue;
}

/**
 * Builds a canonical document from the editable table rows.
 * @param {{
 *   shape?: string|null,
 *   columns?: string[],
 *   rows?: Record<string, unknown>[],
 *   document?: unknown
 * }} options
 * @returns {unknown}
 */
function buildDocumentFromEditor(options) {
  const shape = readTrimmedString(options?.shape);
  const columns = Array.isArray(options?.columns)
    ? options.columns.map((column) => readTrimmedString(column)).filter(Boolean)
    : [];
  const rows = Array.isArray(options?.rows) ? options.rows.filter((row) => isPlainObject(row)) : [];
  const [firstColumn = "key", secondColumn = "value"] = columns;

  if (shape === "crosswalk") {
    /** @type {Record<string, {values: string[]}>} */
    const crosswalk = {};

    for (const row of rows) {
      const source = readEditorCell(row[firstColumn]);
      const target = readEditorCell(row[secondColumn]);
      if (!source || !target) {
        continue;
      }

      if (!crosswalk[source]) {
        crosswalk[source] = {
          values: []
        };
      }

      if (!crosswalk[source].values.includes(target)) {
        crosswalk[source].values.push(target);
      }
    }

    return applyDocumentWrapper(options?.document, crosswalk, {
      preferredKey: "crosswalk"
    });
  }

  if (shape === "list") {
    const listValue =
      columns.length <= 1
        ? rows
            .map((row) => readEditorCell(row[firstColumn]))
            .filter(Boolean)
        : rows
            .map((row) =>
              Object.fromEntries(
                columns
                  .map((column) => [column, readEditorCell(row[column])])
                  .filter(([, value]) => value != null)
              )
            )
            .filter((row) => Object.keys(row).length > 0);

    return applyDocumentWrapper(options?.document, listValue);
  }

  if (shape === "keyvalue" || shape === "object") {
    /** @type {Record<string, unknown>} */
    const nextObject = {};

    for (const row of rows) {
      const key = readEditorCell(row[firstColumn]);
      if (!key) {
        continue;
      }

      if (shape === "object" && columns.length > 2) {
        const nestedValue = Object.fromEntries(
          columns
            .slice(1)
            .map((column) => [column, readEditorCell(row[column])])
            .filter(([, value]) => value != null)
        );
        nextObject[key] = nestedValue;
        continue;
      }

      nextObject[key] = readEditorCell(row[secondColumn]) || "";
    }

    return applyDocumentWrapper(options?.document, nextObject);
  }

  return options?.document ?? null;
}

/**
 * Calls one normalized admin data REST route through the frontend BFF.
 * @param {{
 *   request: Request,
 *   pathname: string,
 *   method?: string,
 *   body?: Record<string, unknown>|null,
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<Record<string, unknown>|null>}
 */
async function requestAdminDataApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load admin data.");
  }

  const target = new URL(options.pathname, options.request.url);
  let response;

  try {
    const headers = {
      cookie: options.request.headers.get("cookie") || ""
    };

    /** @type {RequestInit} */
    const requestInit = {
      method: options.method,
      headers
    };

    if (options.body && isPlainObject(options.body)) {
      headers["content-type"] = "application/json";
      requestInit.body = JSON.stringify(options.body);
    }

    response = await fetchImpl(target, requestInit);
  } catch (error) {
    throw new AdminDataApiError("Unable to reach the admin data service.", {
      code: "admin_data_unreachable",
      statusCode: 502,
      cause: error
    });
  }

  const payload = await tryReadJson(response);
  if (!response.ok) {
    const errorCode = readTrimmedString(payload?.error?.code) || "admin_data_request_failed";
    const errorMessage =
      readTrimmedString(payload?.error?.message) ||
      readTrimmedString(payload?.message) ||
      `Admin data request failed (HTTP ${response.status}).`;

    throw new AdminDataApiError(errorMessage, {
      code: errorCode,
      statusCode: response.status
    });
  }

  return payload;
}

/**
 * Loads the admin data summaries for `/admin/data`.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof normalizeSummary>[]>}
 */
async function loadAdminDataList(options) {
  const payload = await requestAdminDataApi({
    request: options.request,
    pathname: "/api/rest/admin/data",
    fetchImpl: options.fetchImpl
  });

  return Array.isArray(payload?.items) ? payload.items.map((value) => normalizeSummary(value)) : [];
}

/**
 * Loads the full admin data document for `/admin/data/:id`.
 * @param {{request: Request, id: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof normalizeSummary> & {document: unknown, editor: {columns: string[], rows: Record<string, string>[]}}>}
 */
async function loadAdminDataDocument(options) {
  const payload = await requestAdminDataApi({
    request: options.request,
    pathname: `/api/rest/admin/data/${encodeURIComponent(options.id)}`,
    fetchImpl: options.fetchImpl
  });
  const result = payload?.data;
  const shape = inferShape(result?.document, result?.shape ?? result?.editor?.shape);

  return {
    ...normalizeSummary(result),
    shape,
    document: result?.document ?? null,
    editor: normalizeEditor(result?.editor, {
      shape,
      document: result?.document
    })
  };
}

/**
 * Loads the raw admin data document for custom editors that own the document shape.
 * @param {{request: Request, id: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof normalizeSummary> & {document: unknown, editor: unknown}>}
 */
async function loadRawAdminDataDocument(options) {
  const payload = await requestAdminDataApi({
    request: options.request,
    pathname: `/api/rest/admin/data/${encodeURIComponent(options.id)}`,
    fetchImpl: options.fetchImpl
  });
  const result = payload?.data;

  return {
    ...normalizeSummary(result),
    document: result?.document ?? null,
    editor: result?.editor ?? null
  };
}

/**
 * Saves one admin data document through the RPC endpoint.
 * @param {{
 *   request: Request,
 *   id: string,
 *   description?: string,
 *   expectedVersion?: number|null,
 *   shape?: string|null,
 *   columns?: string[],
 *   rows?: Record<string, unknown>[],
 *   document?: unknown,
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<ReturnType<typeof normalizeSummary>>}
 */
async function saveAdminDataDocument(options) {
  const columns = Array.isArray(options.columns) ? options.columns : [];
  const rows = Array.isArray(options.rows) ? options.rows : [];
  const nextDocument = buildDocumentFromEditor({
    shape: options.shape,
    columns,
    rows,
    document: options.document
  });

  const payload = await requestAdminDataApi({
    request: options.request,
    pathname: `/api/rest/admin/data/${encodeURIComponent(options.id)}`,
    method: "PUT",
    body: {
      description: typeof options.description === "string" ? options.description : "",
      expectedVersion: Number.isFinite(options.expectedVersion) ? Number(options.expectedVersion) : null,
      document: nextDocument,
      editor: {
        shape: readTrimmedString(options.shape),
        columns,
        rows
      }
    },
    fetchImpl: options.fetchImpl
  });
  const result = payload?.data;

  return normalizeSummary(result);
}

/**
 * Saves one raw admin data document without rebuilding it through the table editor adapter.
 * @param {{
 *   request: Request,
 *   id: string,
 *   description?: string,
 *   expectedVersion?: number|null,
 *   document?: unknown,
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<ReturnType<typeof normalizeSummary>>}
 */
async function saveRawAdminDataDocument(options) {
  const payload = await requestAdminDataApi({
    request: options.request,
    pathname: `/api/rest/admin/data/${encodeURIComponent(options.id)}`,
    method: "PUT",
    body: {
      description: typeof options.description === "string" ? options.description : "",
      expectedVersion: Number.isFinite(options.expectedVersion) ? Number(options.expectedVersion) : null,
      document: options.document ?? null
    },
    fetchImpl: options.fetchImpl
  });
  const result = payload?.data;

  return normalizeSummary(result);
}

module.exports = {
  AdminDataApiError,
  buildDocumentFromEditor,
  loadAdminDataDocument,
  loadRawAdminDataDocument,
  loadAdminDataList,
  saveAdminDataDocument,
  saveRawAdminDataDocument
};
