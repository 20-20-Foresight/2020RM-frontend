import * as XLSX from "xlsx";

/**
 * Normalizes one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Builds one stable source-column key from the zero-based index.
 * @param {number} index
 * @returns {string}
 */
function buildSourceKey(index) {
  return `col_${index}`;
}

/**
 * Reads one workbook-like buffer into a normalized preview payload.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @param {{maxRows?: number}} [options]
 * @returns {{
 *   sourceColumns: Array<{sourceKey: string, sourceLabel: string}>,
 *   sourceRows: Array<{rowNumber: number, sourceValues: Record<string, string>}>,
 *   totalRowCount: number,
 *   omittedRowCount: number
 * }}
 */
export function parseImportWorkbook(buffer, options = {}) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    throw new Error("The uploaded workbook did not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const sourceColumns = headerRow.map((value, index) => ({
    sourceKey: buildSourceKey(index),
    sourceLabel: readTrimmedString(value) || `Column ${index + 1}`,
  }));

  const dataRows = rows.slice(1);
  const maxRows = Number.isFinite(options.maxRows) ? Number(options.maxRows) : Infinity;
  const cappedRows = dataRows.slice(0, maxRows);

  return {
    sourceColumns,
    sourceRows: cappedRows.map((row, rowIndex) => {
      const sourceValues = {};
      sourceColumns.forEach((column, columnIndex) => {
        sourceValues[column.sourceKey] = readTrimmedString(row?.[columnIndex] ?? "");
      });
      return {
        rowNumber: rowIndex + 2,
        sourceValues,
      };
    }),
    totalRowCount: dataRows.length,
    omittedRowCount: Math.max(0, dataRows.length - cappedRows.length),
  };
}

/**
 * Builds one initial source-to-destination mapping from column labels.
 * @param {Array<{sourceKey: string, sourceLabel: string}>} sourceColumns
 * @param {Array<{key: string, label: string, aliases?: string[]}>} definitions
 * @returns {Record<string, string>}
 */
export function buildInitialColumnMapping(sourceColumns, definitions = []) {
  const usedDestinationKeys = new Set();
  const aliasToKey = new Map();

  (Array.isArray(definitions) ? definitions : []).forEach((definition) => {
    const aliases = [definition.label, ...(definition.aliases || [])];
    aliases.forEach((alias) => {
      aliasToKey.set(readTrimmedString(alias).toLowerCase(), definition.key);
    });
  });

  return (Array.isArray(sourceColumns) ? sourceColumns : []).reduce(
    (mapping, column) => {
      const matchedKey = aliasToKey.get(readTrimmedString(column?.sourceLabel).toLowerCase());
      if (matchedKey && !usedDestinationKeys.has(matchedKey)) {
        usedDestinationKeys.add(matchedKey);
        mapping[column.sourceKey] = matchedKey;
      } else {
        mapping[column?.sourceKey || ""] = "skip";
      }
      return mapping;
    },
    {}
  );
}

/**
 * Applies one source-column mapping to parsed rows and returns row-ready values.
 * @param {{
 *   sourceRows: Array<{rowNumber: number, sourceValues: Record<string, string>}>,
 *   sourceColumns?: Array<{sourceKey: string, sourceLabel: string}>,
 *   sourceToDestination: Record<string, string>,
 *   validateValues?: (values: Record<string, string>) => {status: string, messages: string[]},
 *   transformValues?: (values: Record<string, string>) => Record<string, string>
 * }} options
 * @returns {Array<{
 *   rowNumber: number,
 *   values: Record<string, string>,
 *   extraValues: Record<string, string>,
 *   validation: {status: string, messages: string[]},
 *   lookup: {status: string, messages: string[], match: object|null},
 *   import: {status: string, messages: string[]}
 * }>}
 */
export function buildMappedRows(options) {
  const sourceRows = Array.isArray(options?.sourceRows) ? options.sourceRows : [];
  const sourceColumns = Array.isArray(options?.sourceColumns) ? options.sourceColumns : [];
  const sourceToDestination = options?.sourceToDestination || {};
  const validateValues =
    typeof options?.validateValues === "function"
      ? options.validateValues
      : () => ({ status: "valid", messages: [] });
  const transformValues =
    typeof options?.transformValues === "function"
      ? options.transformValues
      : (values) => values;

  const sourceLabelByKey = new Map(
    sourceColumns.map((column) => [column.sourceKey, column.sourceLabel])
  );

  return sourceRows.map((sourceRow) => {
    const values = {};
    const extraValues = {};

    Object.entries(sourceRow.sourceValues || {}).forEach(([sourceKey, sourceValue]) => {
      const destinationKey = sourceToDestination[sourceKey] || "skip";
      const normalizedValue = readTrimmedString(sourceValue);

      if (!normalizedValue) {
        return;
      }

      if (destinationKey === "skip") {
        extraValues[sourceLabelByKey.get(sourceKey) || sourceKey] = normalizedValue;
        return;
      }

      values[destinationKey] = normalizedValue;
    });

    const transformedValues = transformValues(values);
    const validation = validateValues(transformedValues);

    return {
      rowNumber: sourceRow.rowNumber,
      values: transformedValues,
      extraValues,
      validation,
      lookup: {
        status: validation.status === "valid" ? "ready_for_lookup" : "blocked",
        messages: [],
        match: null,
      },
      import: {
        status: "idle",
        messages: [],
      },
    };
  });
}
