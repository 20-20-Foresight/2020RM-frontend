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
 * Builds a stable slug from one label.
 * @param {unknown} value
 * @returns {string}
 */
function slugifyLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Builds one compact display string for a target list.
 * @param {Array<{name?: string, score?: string|number}>|null|undefined} targets
 * @param {string} fallback
 * @returns {string}
 */
function summarizeTargets(targets, fallback = "") {
  const entries = Array.isArray(targets) ? targets : [];
  if (!entries.length) {
    return fallback;
  }

  return entries
    .map((entry) => {
      const name = readTrimmedString(entry?.name);
      const score = entry?.score == null ? "" : String(entry.score).trim();
      if (!name) {
        return "";
      }
      return score ? `${name} (${score})` : name;
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * Chooses the friendlier of two labels that normalize to the same slug.
 * @param {string} currentValue
 * @param {string} nextValue
 * @returns {string}
 */
function choosePreferredLabel(currentValue, nextValue) {
  const current = readTrimmedString(currentValue);
  const next = readTrimmedString(nextValue);
  if (!current) {
    return next;
  }
  if (!next) {
    return current;
  }

  const currentLooksLikeSlug = current.includes("-") && current.toLowerCase() === slugifyLabel(current);
  const nextLooksLikeSlug = next.includes("-") && next.toLowerCase() === slugifyLabel(next);
  if (currentLooksLikeSlug && !nextLooksLikeSlug) {
    return next;
  }

  return current;
}

/**
 * Deduplicates taxonomy labels by slug while preferring friendly labels over raw slugs.
 * @param {string[]} values
 * @returns {string[]}
 */
function normalizeTaxonomyOptions(values) {
  /** @type {Map<string, string>} */
  const labelsBySlug = new Map();

  for (const rawValue of Array.isArray(values) ? values : []) {
    const value = readTrimmedString(rawValue);
    if (!value) {
      continue;
    }

    const slug = slugifyLabel(value) || value.toLowerCase();
    labelsBySlug.set(slug, choosePreferredLabel(labelsBySlug.get(slug) || "", value));
  }

  return Array.from(labelsBySlug.values()).sort((left, right) => left.localeCompare(right));
}

/**
 * Returns one taxonomy lookup match, if any.
 * @param {unknown} value
 * @param {string[]|null|undefined} options
 * @returns {{matched: boolean, label: string, slug: string}|null}
 */
function readTaxonomyMatch(value, options) {
  const normalizedValue = readTrimmedString(value);
  if (!normalizedValue) {
    return null;
  }

  const entries = Array.isArray(options) ? options : [];
  const exactLabelMatch = entries.find(
    (option) => readTrimmedString(option).toLowerCase() === normalizedValue.toLowerCase()
  );
  if (exactLabelMatch) {
    return {
      matched: true,
      label: exactLabelMatch,
      slug: slugifyLabel(exactLabelMatch),
    };
  }

  const normalizedSlug = slugifyLabel(normalizedValue);
  const slugMatch = entries.find((option) => slugifyLabel(option) === normalizedSlug);
  if (slugMatch) {
    return {
      matched: true,
      label: slugMatch,
      slug: slugifyLabel(slugMatch),
    };
  }

  return {
    matched: false,
    label: normalizedValue,
    slug: normalizedSlug,
  };
}

/**
 * Builds category options for segmentation rules from the current category docs plus current rows.
 * @param {{industryOptions?: string[], focusOptions?: string[]}|null|undefined} categoryCatalog
 * @param {Array<{industry?: string, focus?: string, industryTargets?: Array<{name?: string}>, focusTargets?: Array<{name?: string}>}>} rows
 * @returns {{industryOptions: string[], focusOptions: string[]}}
 */
function buildTaxonomyOptions(categoryCatalog, rows) {
  const industryValues = [
    Array.isArray(categoryCatalog?.industryOptions) ? categoryCatalog.industryOptions : []
  ].flat();
  const focusValues = [
    Array.isArray(categoryCatalog?.focusOptions) ? categoryCatalog.focusOptions : []
  ].flat();

  for (const row of Array.isArray(rows) ? rows : []) {
    const industry = readTrimmedString(row?.industry);
    const focus = readTrimmedString(row?.focus);
    const industryTargets = Array.isArray(row?.industryTargets) ? row.industryTargets : [];
    const focusTargets = Array.isArray(row?.focusTargets) ? row.focusTargets : [];

    if (industry) {
      industryValues.push(industry);
    }
    industryTargets.forEach((target) => {
      const name = readTrimmedString(target?.name);
      if (name) {
        industryValues.push(name);
      }
    });

    if (focus) {
      focusValues.push(focus);
    }
    focusTargets.forEach((target) => {
      const name = readTrimmedString(target?.name);
      if (name) {
        focusValues.push(name);
      }
    });
  }

  return {
    industryOptions: normalizeTaxonomyOptions(industryValues),
    focusOptions: normalizeTaxonomyOptions(focusValues),
  };
}

/**
 * Resolves one stored taxonomy value to the closest friendly label.
 * @param {unknown} value
 * @param {string[]|null|undefined} options
 * @returns {string}
 */
function resolveFriendlyTaxonomyLabel(value, options) {
  return readTaxonomyMatch(value, options)?.label || "";
}

/**
 * Returns the friendly labels that should match one taxonomy filter.
 * @param {{industry?: string, focus?: string, industryTargets?: Array<{name?: string}>, focusTargets?: Array<{name?: string}>}} row
 * @param {"industry"|"focus"} key
 * @param {{industryOptions?: string[], focusOptions?: string[]}|null|undefined} taxonomyOptions
 * @returns {string[]}
 */
function readFilterLabels(row, key, taxonomyOptions) {
  const targets = Array.isArray(row?.[key === "industry" ? "industryTargets" : "focusTargets"])
    ? row[key === "industry" ? "industryTargets" : "focusTargets"]
    : [];
  const optionList = key === "industry" ? taxonomyOptions?.industryOptions : taxonomyOptions?.focusOptions;
  const labels = targets
    .map((target) => resolveFriendlyTaxonomyLabel(target?.name, optionList))
    .filter(Boolean);

  if (labels.length) {
    return labels;
  }

  const fallbackLabel = resolveFriendlyTaxonomyLabel(row?.[key], optionList);
  return fallbackLabel ? [fallbackLabel] : [];
}

/**
 * Builds the display value for one Industry/Focus cell.
 * @param {{
 *   key: "industry"|"focus",
 *   row: {industry?: string, focus?: string, industryTargets?: Array<{name?: string, score?: string|number}>, focusTargets?: Array<{name?: string, score?: string|number}>},
 *   taxonomyOptions?: {industryOptions?: string[], focusOptions?: string[]}|null
 * }} options
 * @returns {string}
 */
function readDisplayValue({ key, row, taxonomyOptions }) {
  const targets = Array.isArray(row?.[key === "industry" ? "industryTargets" : "focusTargets"])
    ? row[key === "industry" ? "industryTargets" : "focusTargets"]
    : [];
  const optionList = key === "industry" ? taxonomyOptions?.industryOptions : taxonomyOptions?.focusOptions;
  const fallback = resolveFriendlyTaxonomyLabel(row?.[key], optionList);
  const displayTargets = targets.map((target) => ({
    ...target,
    name: resolveFriendlyTaxonomyLabel(target?.name, optionList),
  }));
  return summarizeTargets(displayTargets, fallback);
}

/**
 * Returns whether two taxonomy values should be treated as equivalent.
 * @param {unknown} leftValue
 * @param {unknown} rightValue
 * @returns {boolean}
 */
function valuesMatchForRemap(leftValue, rightValue) {
  const left = readTrimmedString(leftValue);
  const right = readTrimmedString(rightValue);
  if (!left || !right) {
    return false;
  }

  return left.toLowerCase() === right.toLowerCase() || slugifyLabel(left) === slugifyLabel(right);
}

/**
 * Reads one row's taxonomy warning strings.
 * @param {{
 *   industry?: string,
 *   focus?: string,
 *   industryTargets?: Array<{name?: string}>,
 *   focusTargets?: Array<{name?: string}>
 * }} row
 * @param {{industryOptions?: string[], focusOptions?: string[]}|null|undefined} taxonomyOptions
 * @returns {string[]}
 */
function readRowTaxonomyWarnings(row, taxonomyOptions) {
  /** @type {string[]} */
  const warnings = [];

  [
    {
      key: "industry",
      label: "Industry",
      optionList: taxonomyOptions?.industryOptions,
      targets: Array.isArray(row?.industryTargets) ? row.industryTargets : [],
      primary: row?.industry,
    },
    {
      key: "focus",
      label: "Focus",
      optionList: taxonomyOptions?.focusOptions,
      targets: Array.isArray(row?.focusTargets) ? row.focusTargets : [],
      primary: row?.focus,
    },
  ].forEach(({ label, optionList, primary, targets }) => {
    const primaryMatch = readTaxonomyMatch(primary, optionList);
    const unresolvedValues = new Set();

    if (primaryMatch && !primaryMatch.matched) {
      unresolvedValues.add(primaryMatch.label);
    }

    const targetMatches = targets
      .map((target) => readTaxonomyMatch(target?.name, optionList))
      .filter(Boolean);
    targetMatches.forEach((match) => {
      if (!match.matched) {
        unresolvedValues.add(match.label);
      }
    });

    if (unresolvedValues.size) {
      warnings.push(
        `${label} has values not found in taxonomy: ${Array.from(unresolvedValues).join(", ")}`
      );
    }

    const firstTargetMatch = targetMatches[0] || null;
    if (
      primaryMatch?.label &&
      firstTargetMatch?.label &&
      primaryMatch.label !== firstTargetMatch.label
    ) {
      warnings.push(
        `${label} primary value (${primaryMatch.label}) does not match first target (${firstTargetMatch.label})`
      );
    }
  });

  return warnings;
}

/**
 * Builds one normalized target list for a bulk selection update.
 * @param {string} value
 * @returns {Array<{name: string, score: string}>}
 */
function buildBulkSelectionTargets(value) {
  const normalizedValue = readTrimmedString(value);
  if (!normalizedValue) {
    return [];
  }

  return [
    {
      name: normalizedValue,
      score: "3",
    },
  ];
}

/**
 * Returns whether two target lists are equivalent.
 * @param {Array<{name?: string, score?: string|number}>|null|undefined} left
 * @param {Array<{name?: string, score?: string|number}>|null|undefined} right
 * @returns {boolean}
 */
function targetListsMatch(left, right) {
  const leftEntries = Array.isArray(left) ? left : [];
  const rightEntries = Array.isArray(right) ? right : [];

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every((entry, index) => {
    const comparison = rightEntries[index];
    return (
      readTrimmedString(entry?.name) === readTrimmedString(comparison?.name) &&
      readTrimmedString(entry?.score == null ? "" : String(entry.score)) ===
        readTrimmedString(comparison?.score == null ? "" : String(comparison.score))
    );
  });
}

/**
 * Applies one bulk selection update to the current rows.
 * @param {Array<object>} rows
 * @param {{
 *   industry?: string,
 *   focus?: string
 * }} selection
 * @param {number[]} selectedRowIndexes
 * @returns {{rows: object[], changedRowCount: number, changedValueCount: number, changedRowIndexes: number[]}}
 */
function applyBulkSelectionUpdate(rows, selection, selectedRowIndexes) {
  const nextIndustry = readTrimmedString(selection?.industry);
  const nextFocus = readTrimmedString(selection?.focus);
  const selectedIndexes = new Set(
    (Array.isArray(selectedRowIndexes) ? selectedRowIndexes : []).filter(
      (value) => Number.isInteger(value) && value >= 0
    )
  );

  if (!selectedIndexes.size || (!nextIndustry && !nextFocus)) {
    return {
      rows: Array.isArray(rows) ? rows.slice() : [],
      changedRowCount: 0,
      changedValueCount: 0,
      changedRowIndexes: [],
    };
  }

  let changedRowCount = 0;
  let changedValueCount = 0;
  const changedRowIndexes = [];

  const nextRows = (Array.isArray(rows) ? rows : []).map((row, rowIndex) => {
    if (!row || typeof row !== "object" || !selectedIndexes.has(rowIndex)) {
      return row;
    }

    let rowChanged = false;
    let nextRow = row;

    if (nextIndustry) {
      const nextTargets = buildBulkSelectionTargets(nextIndustry);
      if (
        readTrimmedString(row.industry) !== nextIndustry ||
        !targetListsMatch(row.industryTargets, nextTargets)
      ) {
        nextRow = {
          ...nextRow,
          industry: nextIndustry,
          industryTargets: nextTargets,
        };
        rowChanged = true;
        changedValueCount += 2;
      }
    }

    if (nextFocus) {
      const nextTargets = buildBulkSelectionTargets(nextFocus);
      if (
        readTrimmedString(row.focus) !== nextFocus ||
        !targetListsMatch(row.focusTargets, nextTargets)
      ) {
        nextRow = {
          ...nextRow,
          focus: nextFocus,
          focusTargets: nextTargets,
        };
        rowChanged = true;
        changedValueCount += 2;
      }
    }

    if (rowChanged) {
      changedRowCount += 1;
      changedRowIndexes.push(rowIndex);
    }

    return nextRow;
  });

  return {
    rows: nextRows,
    changedRowCount,
    changedValueCount,
    changedRowIndexes,
  };
}

/**
 * Returns whether one row matches the active filter set.
 * @param {{
 *   categories?: string[],
 *   description?: string,
 *   sector?: string,
 *   industry?: string,
 *   focus?: string,
 *   industryTargets?: Array<{name?: string, score?: string|number}>,
 *   focusTargets?: Array<{name?: string, score?: string|number}>
 * }} row
 * @param {Record<string, string>} filters
 * @param {{industryOptions?: string[], focusOptions?: string[]}|null|undefined} taxonomyOptions
 * @returns {boolean}
 */
function rowMatchesFilters(row, filters, taxonomyOptions) {
  for (const [key, value] of Object.entries(filters)) {
    const normalizedFilter = readTrimmedString(value).toLowerCase();
    if (!normalizedFilter) {
      continue;
    }

    if (key.startsWith("category-")) {
      const index = Number(key.slice("category-".length));
      const cellValue = readTrimmedString(row?.categories?.[index]).toLowerCase();
      if (!cellValue.includes(normalizedFilter)) {
        return false;
      }
      continue;
    }

    if (key === "description") {
      const cellValue = readTrimmedString(row?.description).toLowerCase();
      if (!cellValue.includes(normalizedFilter)) {
        return false;
      }
      continue;
    }

    if (key === "industry" || key === "focus") {
      const labels = readFilterLabels(row, key, taxonomyOptions).map((label) => label.toLowerCase());
      if (!labels.some((label) => label === normalizedFilter || label.includes(normalizedFilter))) {
        return false;
      }
      continue;
    }

    if (readTrimmedString(row?.[key]).toLowerCase() !== normalizedFilter) {
      return false;
    }
  }

  return true;
}

export {
  applyBulkSelectionUpdate,
  buildTaxonomyOptions,
  readDisplayValue,
  readRowTaxonomyWarnings,
  resolveFriendlyTaxonomyLabel,
  rowMatchesFilters,
};
