/**
 * Read one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalize one segmentation summary for list-row rendering.
 * @param {object|null|undefined} summary
 * @returns {{industry: string[], focus: string[]}}
 */
function normalizeSegmentationSummary(summary) {
  return {
    industry: Array.isArray(summary?.industry)
      ? summary.industry.filter((value) => readTrimmedString(value))
      : [],
    focus: Array.isArray(summary?.focus)
      ? summary.focus.filter((value) => readTrimmedString(value))
      : [],
  };
}

/**
 * Returns the most likely member entity from one list-detail row.
 * @param {object|null|undefined} row
 * @returns {object|null}
 */
function readMemberEntity(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  return row.member || row.organization || row.entity2 || row.entity || row.record || null;
}

/**
 * Build one normalized list row for the resegmentation table.
 * @param {object|null|undefined} row
 * @returns {{
 *   membershipUUID: string,
 *   uuid: string,
 *   name: string,
 *   currentSegmentation: {industry: string[], focus: string[]}
 * }|null}
 */
function normalizeListRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const member = readMemberEntity(row);
  const memberUuid =
    readTrimmedString(member?.uuid) ||
    readTrimmedString(row.memberUUID) ||
    readTrimmedString(row.memberUuid) ||
    readTrimmedString(row.entity2uuid);

  if (!memberUuid) {
    return null;
  }

  return {
    membershipUUID:
      readTrimmedString(row.uuid) || readTrimmedString(row.membershipUUID) || memberUuid,
    uuid: memberUuid,
    name: readTrimmedString(member?.name) || "Unnamed organization",
    currentSegmentation: normalizeSegmentationSummary(
      member?.currentSegmentation || row.currentSegmentation || null
    ),
  };
}

/**
 * Build renderable list rows from one list-detail response.
 * @param {object|null|undefined} listDetail
 * @returns {Array<{
 *   membershipUUID: string,
 *   uuid: string,
 *   name: string,
 *   currentSegmentation: {industry: string[], focus: string[]}
 * }>}
 */
export function buildSelectedListRows(listDetail) {
  return (Array.isArray(listDetail?.members) ? listDetail.members : [])
    .map((row) => normalizeListRow(row))
    .filter(Boolean);
}

/**
 * Count how many list members are actually renderable by the UI.
 * @param {object|null|undefined} listDetail
 * @returns {number}
 */
export function countRenderableListMembers(listDetail) {
  return buildSelectedListRows(listDetail).length;
}
