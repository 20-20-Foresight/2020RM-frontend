/**
 * Returns whether a value can be traversed like an object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObjectLike(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads one trimmed string value.
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
 * Escapes one string for safe HTML rendering.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Escapes one string for use inside a regular expression.
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns a de-duplicated list of string values.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeChoiceList(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  const seen = new Set();
  const normalized = [];

  for (const entry of list) {
    const trimmed = readTrimmedString(entry);
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

/**
 * Returns the segmentation payload from one organization record.
 * @param {unknown} record
 * @returns {Record<string, unknown>|null}
 */
function readSegmentation(record) {
  const metadataSegmentation = isObjectLike(record?.metadata?.segmentation)
    ? record.metadata.segmentation
    : null;
  if (metadataSegmentation) {
    return metadataSegmentation;
  }

  return isObjectLike(record?.segmentation) ? record.segmentation : null;
}

/**
 * Builds highlighted quote HTML for one phrase match.
 * @param {string|null} match
 * @param {string|null} phrase
 * @returns {string|null}
 */
function buildHighlightedReasonHtml(match, phrase) {
  if (!match || !phrase) {
    return null;
  }

  const regex = new RegExp(escapeRegExp(match), "ig");
  let lastIndex = 0;
  let highlighted = "";
  let found = false;

  for (const matchResult of phrase.matchAll(regex)) {
    found = true;
    const startIndex = matchResult.index || 0;
    const matchedValue = matchResult[0] || "";

    highlighted += escapeHtml(phrase.slice(lastIndex, startIndex));
    highlighted += `<mark>${escapeHtml(matchedValue)}</mark>`;
    lastIndex = startIndex + matchedValue.length;
  }

  if (!found) {
    return null;
  }

  highlighted += escapeHtml(phrase.slice(lastIndex));

  return /[.!?]$/.test(phrase)
    ? `&ldquo;${highlighted}&rdquo;`
    : `&ldquo;${highlighted}...&rdquo;`;
}

/**
 * Builds safe HTML for one segmentation explanation row.
 * @param {Record<string, unknown>} reason
 * @returns {string}
 */
function buildSegmentationReasonHtml(reason) {
  const trueReason = readTrimmedString(reason.trueReason);
  if (trueReason) {
    return escapeHtml(trueReason);
  }

  const highlightedReason = buildHighlightedReasonHtml(
    readTrimmedString(reason.match),
    readTrimmedString(reason.phrase)
  );
  if (highlightedReason) {
    return highlightedReason;
  }

  const fallback =
    readTrimmedString(reason.description) ||
    readTrimmedString(reason.reason) ||
    readTrimmedString(reason.match);

  return fallback ? escapeHtml(fallback) : "";
}

/**
 * Orders sectors by frequency first, then original discovery order.
 * @param {Record<string, unknown>} segmentation
 * @returns {string[]}
 */
function buildOrderedSectors(segmentation) {
  const counts = new Map();
  const firstIndexByKey = new Map();
  let seenIndex = 0;

  for (const reason of Array.isArray(segmentation?.reasons) ? segmentation.reasons : []) {
    if (!isObjectLike(reason)) {
      continue;
    }

    const sector = readTrimmedString(reason.sector);
    if (!sector) {
      continue;
    }

    const key = sector.toLowerCase();
    const currentValue = counts.get(key);
    if (!currentValue) {
      counts.set(key, {
        count: 1,
        value: sector
      });
      firstIndexByKey.set(key, seenIndex);
      seenIndex += 1;
      continue;
    }

    currentValue.count += 1;
  }

  const orderedSectors = Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1].count !== left[1].count) {
        return right[1].count - left[1].count;
      }

      return (firstIndexByKey.get(left[0]) || 0) - (firstIndexByKey.get(right[0]) || 0);
    })
    .map((entry) => entry[1].value);

  for (const sector of normalizeChoiceList(segmentation?.sector)) {
    if (orderedSectors.some((value) => value.toLowerCase() === sector.toLowerCase())) {
      continue;
    }

    orderedSectors.push(sector);
  }

  return orderedSectors;
}

/**
 * Builds explanation rows for one segmentation payload.
 * @param {Record<string, unknown>} segmentation
 * @returns {Array<{source: string|null, sector: string|null, industry: string|null, focus: string|null, reasonHtml: string}>}
 */
function buildExplanationRows(segmentation) {
  return (Array.isArray(segmentation?.reasons) ? segmentation.reasons : [])
    .map((reason) => {
      if (!isObjectLike(reason)) {
        return null;
      }

      const row = {
        source: readTrimmedString(reason.source),
        sector: readTrimmedString(reason.sector),
        industry: readTrimmedString(reason.industry),
        focus: readTrimmedString(reason.focus),
        reasonHtml: buildSegmentationReasonHtml(reason)
      };

      if (!row.sector && !row.industry && !row.focus && !row.reasonHtml) {
        return null;
      }

      return row;
    })
    .filter(Boolean);
}

/**
 * Builds display-ready segmentation data for one organization record.
 * @param {unknown} record
 * @returns {{
 *   primarySector: string|null,
 *   sectors: string[],
 *   industries: string[],
 *   focuses: string[],
 *   explanations: Array<{source: string|null, sector: string|null, industry: string|null, focus: string|null, reasonHtml: string}>
 * }|null}
 */
function buildOrganizationSegmentationViewModel(record) {
  const segmentation = readSegmentation(record);
  if (!segmentation) {
    return null;
  }

  const sectors = buildOrderedSectors(segmentation);
  const industries = normalizeChoiceList(segmentation.industry);
  const focuses = normalizeChoiceList(segmentation.focus);
  const explanations = buildExplanationRows(segmentation);

  if (!sectors.length && !industries.length && !focuses.length && !explanations.length) {
    return null;
  }

  return {
    primarySector: sectors[0] || null,
    sectors,
    industries,
    focuses,
    explanations
  };
}

module.exports = {
  buildOrganizationSegmentationViewModel,
  buildSegmentationReasonHtml
};
