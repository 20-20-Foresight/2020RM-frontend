/**
 * Read one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalize one segmentation summary for resegmentation visuals.
 * Sector is intentionally excluded from this UI for now.
 * @param {object|null|undefined} summary
 * @returns {{industry: string[], focus: string[]}}
 */
function normalizeSegmentationVisualSummary(summary) {
  return {
    industry: Array.isArray(summary?.industry)
      ? summary.industry.filter((value) => readTrimmedString(value))
      : [],
    focus: Array.isArray(summary?.focus)
      ? summary.focus.filter((value) => readTrimmedString(value))
      : []
  };
}

/**
 * Returns whether one normalized segmentation summary has any visible values.
 * @param {{industry?: string[], focus?: string[]}|null|undefined} summary
 * @returns {boolean}
 */
function hasVisibleSegmentationSummary(summary) {
  return Boolean(summary?.industry?.length || summary?.focus?.length);
}

/**
 * Build one display-friendly label for a segment array.
 * @param {string[]} values
 * @param {string} fallback
 * @returns {string}
 */
function readPrimaryValue(values, fallback = "Not set") {
  return Array.isArray(values) && values.length ? values[0] : fallback;
}

/**
 * Returns the display-ready explanation rows for this UI.
 * Sector rows are intentionally hidden until the backend sector issue is fixed.
 * @param {object[]|null|undefined} explanations
 * @returns {object[]}
 */
function readDisplayedExplanations(explanations) {
  return (Array.isArray(explanations) ? explanations : []).filter(
    (row) => readTrimmedString(row?.dimension).toLowerCase() !== "sector"
  );
}

/**
 * Read one explanation score for display.
 * @param {unknown} value
 * @returns {number}
 */
function readDisplayedExplanationScore(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

/**
 * Build one compact explanation segmentation label.
 * @param {object|null|undefined} row
 * @returns {string}
 */
function buildExplanationSegmentationLabel(row) {
  const dimension = readTrimmedString(row?.dimension) || "Not set";
  const value = readTrimmedString(row?.value) || "Not set";
  const score = readDisplayedExplanationScore(row?.score);
  return `${dimension}: ${value} (${score})`;
}

/**
 * Returns one updated organization record after a successful apply.
 * @param {object|null} record
 * @param {object|null} resegmentation
 * @returns {object}
 */
function applyResegmentationToRecord(record, resegmentation) {
  const nextRecord =
    record && typeof record === "object"
      ? JSON.parse(JSON.stringify(record))
      : {};
  nextRecord.metadata ||= {};
  nextRecord.metadata.segmentation = {
    sector: resegmentation?.proposed?.sector || null,
    industry: Array.isArray(resegmentation?.proposed?.industry)
      ? resegmentation.proposed.industry.slice()
      : [],
    focus: Array.isArray(resegmentation?.proposed?.focus)
      ? resegmentation.proposed.focus.slice()
      : [],
    reasons: []
  };
  nextRecord.entityDimensionProjection = {
    industry: (resegmentation?.proposed?.industry || []).map((name) => ({
      name,
      score: 1,
      reasons: []
    })),
    focus: (resegmentation?.proposed?.focus || []).map((name) => ({
      name,
      score: 1,
      reasons: []
    }))
  };
  return nextRecord;
}

/**
 * Returns one client-side applied result so the current panel reflects the saved state.
 * @param {object|null} resegmentation
 * @returns {object|null}
 */
function buildAppliedResult(resegmentation) {
  if (!resegmentation || typeof resegmentation !== "object") {
    return null;
  }

  return {
    ...resegmentation,
    current: resegmentation.proposed || resegmentation.current || null
  };
}

module.exports = {
  applyResegmentationToRecord,
  buildAppliedResult,
  buildExplanationSegmentationLabel,
  hasVisibleSegmentationSummary,
  normalizeSegmentationVisualSummary,
  readDisplayedExplanations,
  readDisplayedExplanationScore,
  readPrimaryValue,
  readTrimmedString
};
