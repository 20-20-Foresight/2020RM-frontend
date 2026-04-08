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
 * Builds one de-duplicated list of strings.
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
  const reasonPayload = isObjectLike(reason?.reason) ? reason.reason : reason;
  const trueReason = readTrimmedString(reasonPayload.trueReason);
  if (trueReason) {
    return escapeHtml(trueReason);
  }

  const highlightedReason = buildHighlightedReasonHtml(
    readTrimmedString(reasonPayload.match),
    readTrimmedString(reasonPayload.phrase)
  );
  if (highlightedReason) {
    return highlightedReason;
  }

  const fallback =
    readTrimmedString(reasonPayload.description) ||
    readTrimmedString(reasonPayload.reason) ||
    readTrimmedString(reasonPayload.match);

  return fallback ? escapeHtml(fallback) : "";
}

/**
 * Returns one legacy segmentation payload when available.
 * @param {unknown} record
 * @returns {Record<string, unknown>|null}
 */
function readLegacySegmentation(record) {
  const metadataSegmentation = isObjectLike(record?.metadata?.segmentation)
    ? record.metadata.segmentation
    : null;
  if (metadataSegmentation) {
    return metadataSegmentation;
  }

  return isObjectLike(record?.segmentation) ? record.segmentation : null;
}

/**
 * Normalizes one scored dimension list from strings or objects.
 * @param {unknown} value
 * @returns {Array<{name: string, score: number, reasons: object[], sourceDocumentId: string|null, sourceDocumentName: string|null}>}
 */
function normalizeScoredEntries(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((entry) => {
      if (typeof entry === "string") {
        const name = readTrimmedString(entry);
        return name
          ? {
              name,
              score: 1,
              reasons: [],
              sourceDocumentId: null,
              sourceDocumentName: null
            }
          : null;
      }

      if (!isObjectLike(entry)) {
        return null;
      }

      const name =
        readTrimmedString(entry.name) ||
        readTrimmedString(entry.label) ||
        readTrimmedString(entry.valueName) ||
        readTrimmedString(entry.value);
      const score = Number(entry.score);

      if (!name || !Number.isFinite(score) || score <= 0) {
        return null;
      }

      return {
        name,
        score,
        reasons: Array.isArray(entry.reasons) ? entry.reasons.filter((reason) => isObjectLike(reason)) : [],
        sourceDocumentId: readTrimmedString(entry.sourceDocumentId),
        sourceDocumentName: readTrimmedString(entry.sourceDocumentName)
      };
    })
    .filter(Boolean);
}

/**
 * Builds the best available industry/focus projection from one record.
 * @param {unknown} record
 * @returns {{industry: ReturnType<typeof normalizeScoredEntries>, focus: ReturnType<typeof normalizeScoredEntries>, sectors: string[], legacyReasons: object[]}|null}
 */
function readSegmentationProjection(record) {
  const legacySegmentation = readLegacySegmentation(record);
  const legacyIndustryScores = normalizeScoredEntries(
    legacySegmentation?.industryScores || legacySegmentation?.industry
  );
  const legacyFocusScores = normalizeScoredEntries(
    legacySegmentation?.focusScores || legacySegmentation?.focus
  );

  const projection =
    isObjectLike(record?.entityDimensionProjection)
      ? record.entityDimensionProjection
      : isObjectLike(record?.entity_dimension_projection)
        ? record.entity_dimension_projection
        : null;

  const industry =
    normalizeScoredEntries(projection?.industry).length
      ? normalizeScoredEntries(projection?.industry)
      : legacyIndustryScores;
  const focus =
    normalizeScoredEntries(projection?.focus).length
      ? normalizeScoredEntries(projection?.focus)
      : legacyFocusScores;
  const sectors = normalizeChoiceList(legacySegmentation?.sector);
  const legacyReasons = Array.isArray(legacySegmentation?.reasons)
    ? legacySegmentation.reasons.filter((reason) => isObjectLike(reason))
    : [];

  if (!industry.length && !focus.length && !sectors.length && !legacyReasons.length) {
    return null;
  }

  return {
    industry,
    focus,
    sectors,
    legacyReasons
  };
}

/**
 * Orders sectors by frequency first, then original discovery order.
 * @param {string[]} sectors
 * @param {object[]} reasons
 * @returns {string[]}
 */
function buildOrderedSectors(sectors, reasons) {
  const counts = new Map();
  const firstIndexByKey = new Map();
  let seenIndex = 0;

  for (const reason of Array.isArray(reasons) ? reasons : []) {
    const sector = readTrimmedString(reason?.sector);
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

  for (const sector of sectors) {
    if (orderedSectors.some((value) => value.toLowerCase() === sector.toLowerCase())) {
      continue;
    }

    orderedSectors.push(sector);
  }

  return orderedSectors;
}

/**
 * Builds explanation rows from the new projection-style nested reasons.
 * @param {{dimension: string, values: ReturnType<typeof normalizeScoredEntries>}} options
 * @returns {Array<{source: string|null, dimension: string, value: string, score: number|null, crosswalkDocumentName: string|null, rule: string|null, reasonHtml: string}>}
 */
function buildProjectionExplanationRows(options) {
  const rows = [];

  for (const value of Array.isArray(options.values) ? options.values : []) {
    if (!Array.isArray(value.reasons) || !value.reasons.length) {
      continue;
    }

    for (const reason of value.reasons) {
      rows.push({
        source: readTrimmedString(reason?.reason?.source) || null,
        dimension: options.dimension,
        value: value.name,
        score: Number.isFinite(value.score) ? value.score : null,
        crosswalkDocumentName:
          readTrimmedString(reason?.crosswalkDocumentName) ||
          readTrimmedString(reason?.crosswalk) ||
          value.sourceDocumentName ||
          null,
        rule: readTrimmedString(reason?.rule) || null,
        reasonHtml: buildSegmentationReasonHtml(reason)
      });
    }
  }

  return rows;
}

/**
 * Builds explanation rows from the legacy flat reasons payload.
 * @param {object[]} reasons
 * @returns {Array<{source: string|null, dimension: string, value: string, score: number|null, crosswalkDocumentName: string|null, rule: string|null, reasonHtml: string}>}
 */
function buildLegacyExplanationRows(reasons) {
  return (Array.isArray(reasons) ? reasons : [])
    .map((reason) => {
      const industry = readTrimmedString(reason?.industry);
      const focus = readTrimmedString(reason?.focus);
      const sector = readTrimmedString(reason?.sector);
      const value = focus || industry || sector;
      const dimension = focus ? "Focus" : industry ? "Industry" : sector ? "Sector" : null;

      if (!value || !dimension) {
        return null;
      }

      return {
        source: readTrimmedString(reason?.source),
        dimension,
        value,
        score: null,
        crosswalkDocumentName:
          readTrimmedString(reason?.sourceDocumentName) ||
          readTrimmedString(reason?.crosswalk) ||
          null,
        rule: readTrimmedString(reason?.rule) || readTrimmedString(reason?.uuid) || null,
        reasonHtml: buildSegmentationReasonHtml(reason)
      };
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
 *   explanations: Array<{source: string|null, dimension: string, value: string, score: number|null, crosswalkDocumentName: string|null, rule: string|null, reasonHtml: string}>
 * }|null}
 */
function buildOrganizationSegmentationViewModel(record) {
  const projection = readSegmentationProjection(record);
  if (!projection) {
    return null;
  }

  const sectors = buildOrderedSectors(projection.sectors, projection.legacyReasons);
  const industries = projection.industry.map((entry) => entry.name);
  const focuses = projection.focus.map((entry) => entry.name);
  const explanations = [
    ...buildProjectionExplanationRows({
      dimension: "Industry",
      values: projection.industry
    }),
    ...buildProjectionExplanationRows({
      dimension: "Focus",
      values: projection.focus
    }),
    ...buildLegacyExplanationRows(projection.legacyReasons)
  ];

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
