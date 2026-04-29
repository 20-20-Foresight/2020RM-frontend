/**
 * Normalize one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Returns whether one row can be sent to the backend lookup endpoint.
 * @param {object|null|undefined} row
 * @returns {boolean}
 */
function hasLookupIdentifiers(row) {
  return Boolean(
    readTrimmedString(row?.values?.organizationUuid) ||
      readTrimmedString(row?.values?.organizationName) ||
      readTrimmedString(row?.values?.linkedin) ||
      readTrimmedString(row?.values?.website)
  );
}

/**
 * Build the live lookup request payload from mapped import rows.
 * @param {object[]} rows
 * @returns {{rows: object[]}}
 */
export function buildResegmentationImportLookupRequest(rows) {
  return {
    rows: (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.validation?.status === "valid" && hasLookupIdentifiers(row))
      .map((row) => ({
        rowNumber: row.rowNumber,
        values: {
          ...(row.values || {}),
        },
      })),
  };
}

/**
 * Build lookup request payloads in batches from mapped import rows.
 * @param {object[]} rows
 * @param {number} batchSize
 * @returns {Array<{rows: object[]}>}
 */
export function buildResegmentationImportLookupRequests(rows, batchSize = 5) {
  const request = buildResegmentationImportLookupRequest(rows);
  const normalizedBatchSize = Math.max(1, Number(batchSize) || 1);

  if (!request.rows.length) {
    return [];
  }

  const requests = [];
  for (let index = 0; index < request.rows.length; index += normalizedBatchSize) {
    requests.push({
      rows: request.rows.slice(index, index + normalizedBatchSize),
    });
  }

  return requests;
}

/**
 * Merge backend lookup results into the current mapped-row state.
 * @param {object[]} rows
 * @param {object[]} lookupResults
 * @returns {object[]}
 */
export function applyResegmentationImportLookupResults(rows, lookupResults) {
  const resultsByRowNumber = new Map(
    (Array.isArray(lookupResults) ? lookupResults : [])
      .filter((row) => Number.isFinite(Number(row?.rowNumber)))
      .map((row) => [Number(row.rowNumber), row.lookup || null])
  );

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const lookup = resultsByRowNumber.get(Number(row?.rowNumber));
    if (!lookup) {
      return row;
    }

    return {
      ...row,
      lookup: {
        status: readTrimmedString(lookup.status) || "unmatched",
        messages: Array.isArray(lookup.messages) ? lookup.messages : [],
        match: lookup.match || null,
      },
      import: {
        status: "idle",
        messages: [],
      },
    };
  });
}

/**
 * Count unique imported memberships from one import result payload.
 * Duplicate matched rows can resolve to the same saved membership.
 * @param {object[]} rows
 * @returns {number}
 */
export function countImportedMemberships(rows) {
  const membershipUUIDs = new Set(
    (Array.isArray(rows) ? rows : [])
      .map((row) => readTrimmedString(row?.import?.membershipUuid))
      .filter(Boolean)
  );

  if (membershipUUIDs.size) {
    return membershipUUIDs.size;
  }

  return (Array.isArray(rows) ? rows : []).filter(
    (row) => readTrimmedString(row?.import?.status) === "imported"
  ).length;
}

/**
 * Build the live import request payload from matched rows.
 * @param {{
 *   destinationName: string,
 *   rows: object[],
 *   unmatchedColumnBehavior?: string
 * }} options
 * @returns {{
 *   listName: string,
 *   unmatchedColumnBehavior: string,
 *   listTypeSlug: string,
 *   listSubTypeSlug: string,
 *   subjectType: string,
 *   membershipMode: string,
 *   rows: object[]
 * }}
 */
export function buildResegmentationImportCommitRequest(options) {
  return {
    listName: readTrimmedString(options?.destinationName),
    unmatchedColumnBehavior:
      readTrimmedString(options?.unmatchedColumnBehavior) || "save_as_membership_metadata",
    listTypeSlug: "LIST",
    listSubTypeSlug: "ORGANIZATION",
    subjectType: "organization",
    membershipMode: "static",
    rows: (Array.isArray(options?.rows) ? options.rows : [])
      .filter((row) => row?.lookup?.status === "matched" && readTrimmedString(row?.lookup?.match?.uuid))
      .map((row) => ({
        rowNumber: row.rowNumber,
        match: {
          uuid: readTrimmedString(row.lookup.match.uuid),
        },
        values: {
          ...(row.values || {}),
        },
        extraValues: {
          ...(row.extraValues || {}),
        },
      })),
  };
}
