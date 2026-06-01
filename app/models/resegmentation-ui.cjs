const {
  buildOrganizationSegmentationViewModel
} = require("./organization-segmentation.cjs");

/**
 * Read one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumericConfidence(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readObjectField(value, ...keys) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (key == null) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return value[key];
    }
  }

  return undefined;
}

function normalizeAssessmentItem(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const itemValue = readTrimmedString(value.value);
  if (!itemValue) {
    return null;
  }

  return {
    value: itemValue,
    confidence: readNumericConfidence(value.confidence, 1),
    reason: readTrimmedString(value.reason),
    evidence: Array.isArray(value.evidence)
      ? value.evidence.map((entry) => readTrimmedString(entry)).filter(Boolean)
      : []
  };
}

function normalizeAssessmentList(values) {
  return (Array.isArray(values) ? values : [])
    .map((entry) => normalizeAssessmentItem(entry))
    .filter(Boolean);
}

function isV312Resegmentation(resegmentation) {
  return readTrimmedString(resegmentation?.strategy).toLowerCase() === "v312";
}

function normalizeSegmentation312Summary(payload) {
  const normalizedPayload =
    payload && typeof payload === "object"
      ? payload
      : {};

  return {
    sector: normalizeAssessmentItem(normalizedPayload.sector),
    verticals: normalizeAssessmentList(normalizedPayload.verticals),
    emailIndustry: normalizeAssessmentItem(
      readObjectField(normalizedPayload, "emailIndustry", "emailindustry")
    ),
    visibleKeywords: normalizeAssessmentList(
      readObjectField(normalizedPayload, "visibleKeywords", "visiblekeywords")
    ),
    allKeywords: normalizeAssessmentList(
      readObjectField(normalizedPayload, "allKeywords", "allkeywords")
    ),
    overallAssessment:
      normalizeAssessmentItem(
        readObjectField(normalizedPayload, "overallAssessment", "overallassessment")
      ) || {
        value: "",
        confidence: 1,
        reason: "",
        evidence: []
      }
  };
}

function readSavedSegmentation312Payload(record) {
  const metadataSegmentation =
    record?.metadata?.segmentation && typeof record.metadata.segmentation === "object"
      ? record.metadata.segmentation
      : null;
  if (
    metadataSegmentation &&
    (readTrimmedString(metadataSegmentation.strategy).toLowerCase() === "v312" ||
      Array.isArray(metadataSegmentation.verticals) ||
      (readObjectField(
        metadataSegmentation,
        "compatibilityProjection",
        "compatibilityprojection"
      ) &&
        typeof readObjectField(
          metadataSegmentation,
          "compatibilityProjection",
          "compatibilityprojection"
        ) === "object"))
  ) {
    return metadataSegmentation;
  }

  return record?.metadata?.segmentationV312 &&
    typeof record.metadata.segmentationV312 === "object"
    ? record.metadata.segmentationV312
    : null;
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
 * Build one display-friendly EM Industry value.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function readEMIndustryValue(value, fallback = "Not set") {
  return readTrimmedString(value) || fallback;
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
  const dimensionParts = dimension
    .split("/")
    .map((part) => readTrimmedString(part))
    .filter(Boolean);
  const valueParts = value
    .split("\n")
    .map((part) => readTrimmedString(part))
    .filter(Boolean);

  if (dimensionParts.length > 1 && dimensionParts.length === valueParts.length) {
    return dimensionParts
      .map((part, index) => {
        const currentValue = valueParts[index] || "Not set";
        const prefix = `${part}:`;
        if (currentValue.toLowerCase().startsWith(prefix.toLowerCase())) {
          return currentValue;
        }
        return `${part}: ${currentValue}`;
      })
      .join("\n");
  }

  const parsedScore = Number(row?.score);
  if (Number.isFinite(parsedScore) && parsedScore > 0) {
    return `${dimension}: ${value} (${parsedScore})`;
  }
  return `${dimension}: ${value}`;
}

/**
 * Reads the current segmentation explanation rows from one organization record.
 * @param {object|null|undefined} record
 * @returns {object[]}
 */
function readRecordSegmentationExplanations(record) {
  const viewModel = buildOrganizationSegmentationViewModel(record);
  return Array.isArray(viewModel?.explanations) ? viewModel.explanations : [];
}

/**
 * Returns the explanation rows that should be displayed for one resegmentation review.
 * Before preview, show the current persisted reasoning. After preview, replace it with
 * the new resegmentation reasoning even when the new set is empty.
 * @param {object|null|undefined} record
 * @param {object|null|undefined} resegmentation
 * @returns {object[]}
 */
function readDisplayedSegmentationExplanations(record, resegmentation) {
  if (resegmentation && typeof resegmentation === "object") {
    return Array.isArray(resegmentation.explanations) ? resegmentation.explanations : [];
  }

  return readRecordSegmentationExplanations(record);
}

/**
 * Returns the current saved explanation rows for one resegmentation review.
 * @param {object|null|undefined} record
 * @param {object|null|undefined} resegmentation
 * @returns {object[]}
 */
function readCurrentSegmentationExplanations(record, resegmentation) {
  if (
    resegmentation &&
    typeof resegmentation === "object" &&
    Array.isArray(resegmentation.currentExplanations)
  ) {
    return resegmentation.currentExplanations;
  }

  return readRecordSegmentationExplanations(record);
}

/**
 * Returns the proposed explanation rows for one resegmentation review.
 * @param {object|null|undefined} resegmentation
 * @returns {object[]}
 */
function readProposedSegmentationExplanations(resegmentation) {
  if (resegmentation && typeof resegmentation === "object") {
    return Array.isArray(resegmentation.explanations) ? resegmentation.explanations : [];
  }

  return [];
}

/**
 * Returns the correct explanation section heading for one resegmentation review.
 * @param {object|null|undefined} record
 * @param {object|null|undefined} resegmentation
 * @returns {string}
 */
function readDisplayedSegmentationExplanationHeading(record, resegmentation) {
  if (resegmentation && typeof resegmentation === "object") {
    return "Proposed Segmentation Reasoning";
  }

  return readRecordSegmentationExplanations(record).length
    ? "Current Segmentation Reasoning"
    : "Segmentation Reasoning";
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
  if (isV312Resegmentation(resegmentation)) {
    const proposedPayload =
      resegmentation?.proposedV312 && typeof resegmentation.proposedV312 === "object"
        ? resegmentation.proposedV312
        : null;
    nextRecord.currentEMIndustry =
      readTrimmedString(proposedPayload?.emailIndustry?.value) || "";
    nextRecord.metadata.segmentation = proposedPayload;
    delete nextRecord.metadata.segmentationV312;
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
  nextRecord.currentEMIndustry = readTrimmedString(resegmentation?.proposedEMIndustry) || "";
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

  if (isV312Resegmentation(resegmentation)) {
    return {
      ...resegmentation,
      current: resegmentation.proposed || resegmentation.current || null,
      currentV312: resegmentation.proposedV312 || resegmentation.currentV312 || null,
      currentEMIndustry:
        readTrimmedString(resegmentation?.proposedV312?.emailIndustry?.value) ||
        readTrimmedString(resegmentation?.currentV312?.emailIndustry?.value) ||
        "",
      currentExplanations: Array.isArray(resegmentation.explanations)
        ? resegmentation.explanations
        : Array.isArray(resegmentation.currentExplanations)
          ? resegmentation.currentExplanations
          : []
    };
  }

  return {
    ...resegmentation,
    current: resegmentation.proposed || resegmentation.current || null,
    currentEMIndustry:
      readTrimmedString(resegmentation?.proposedEMIndustry) ||
      readTrimmedString(resegmentation?.currentEMIndustry) ||
      "",
    currentExplanations: Array.isArray(resegmentation.explanations)
      ? resegmentation.explanations
      : Array.isArray(resegmentation.currentExplanations)
        ? resegmentation.currentExplanations
        : []
  };
}

module.exports = {
  applyResegmentationToRecord,
  buildAppliedResult,
  buildExplanationSegmentationLabel,
  hasVisibleSegmentationSummary,
  isV312Resegmentation,
  normalizeSegmentation312Summary,
  normalizeSegmentationVisualSummary,
  readEMIndustryValue,
  readCurrentSegmentationExplanations,
  readDisplayedSegmentationExplanationHeading,
  readDisplayedSegmentationExplanations,
  readDisplayedExplanations,
  readDisplayedExplanationScore,
  readProposedSegmentationExplanations,
  readRecordSegmentationExplanations,
  readSavedSegmentation312Payload,
  readPrimaryValue,
  readTrimmedString
};
