const { loadRawAdminDataDocument } = require("./admin-data.server");
const { buildCategoryViewModel } = require("./segmentation-category-document");
const { loadCategoryDocuments } = require("./segmentation-document.server");

const catalogCache = {
  signature: null,
  catalog: null,
  pending: null
};

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
 * Converts stored rich text into plain display text.
 * @param {unknown} value
 * @returns {string|null}
 */
function readPlainTextDescription(value) {
  const text = readTrimmedString(value);
  if (!text) {
    return null;
  }

  const normalizedText = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalizedText || null;
}

/**
 * Builds a stable cache signature for the relevant category summaries.
 * @param {object|null} industrySummary
 * @param {object|null} focusSummary
 * @returns {string}
 */
function buildCatalogSignature(industrySummary, focusSummary) {
  return JSON.stringify([
    {
      id: readTrimmedString(industrySummary?.id),
      version: Number.isFinite(industrySummary?.version) ? Number(industrySummary.version) : null
    },
    {
      id: readTrimmedString(focusSummary?.id),
      version: Number.isFinite(focusSummary?.version) ? Number(focusSummary.version) : null
    }
  ]);
}

/**
 * Builds one normalized focus option from a category row.
 * @param {unknown} value
 * @returns {{id: string, label: string, description: string}|null}
 */
function normalizeFocusOption(value) {
  const id = readTrimmedString(value?.id);
  const label = readTrimmedString(value?.label);
  const deletedOn = readTrimmedString(value?.deletedOn);
  if (!id || !label || deletedOn) {
    return null;
  }

  return {
    id,
    label,
    description: readPlainTextDescription(value?.description) || "No description available."
  };
}

/**
 * Collects visible industry labels from category rows.
 * @param {unknown[]} rows
 * @returns {string[]}
 */
function collectIndustryOptions(rows) {
  /** @type {Set<string>} */
  const values = new Set();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const label = readTrimmedString(row?.label);
    const deletedOn = readTrimmedString(row?.deletedOn);
    if (label && !deletedOn) {
      values.add(label);
    }
  });

  return Array.from(values).sort((left, right) => left.localeCompare(right));
}

/**
 * Loads the category rows needed by the Focus to Industry editor.
 * @param {{
 *   request: Request,
 *   loadCategoryDocuments?: typeof loadCategoryDocuments,
 *   loadRawAdminDataDocument?: typeof loadRawAdminDataDocument
 * }} options
 * @returns {Promise<{industryOptions: string[], focusOptions: Array<{id: string, label: string, description: string}>}>}
 */
async function loadFocusToIndustryCatalog(options) {
  const loadCategories = options.loadCategoryDocuments || loadCategoryDocuments;
  const loadDocument = options.loadRawAdminDataDocument || loadRawAdminDataDocument;
  const documents = await loadCategories({
    request: options.request
  });
  const industrySummary =
    documents.find((item) => readTrimmedString(item.name)?.toLowerCase() === "industry") || null;
  const focusSummary =
    documents.find((item) => readTrimmedString(item.name)?.toLowerCase() === "focus") || null;
  const signature = buildCatalogSignature(industrySummary, focusSummary);

  if (catalogCache.catalog && catalogCache.signature === signature) {
    return catalogCache.catalog;
  }
  if (catalogCache.pending?.signature === signature) {
    return catalogCache.pending.promise;
  }

  const promise = Promise.all([
    industrySummary?.id
      ? loadDocument({
          request: options.request,
          id: industrySummary.id
        })
      : Promise.resolve(null),
    focusSummary?.id
      ? loadDocument({
          request: options.request,
          id: focusSummary.id
        })
      : Promise.resolve(null)
  ])
    .then(([industryDetail, focusDetail]) => {
      const industryRows = buildCategoryViewModel({
        document: industryDetail?.document
      }).rows;
      const focusRows = buildCategoryViewModel({
        document: focusDetail?.document
      }).rows;

      const catalog = {
        industryOptions: collectIndustryOptions(industryRows),
        focusOptions: focusRows
          .map((row) => normalizeFocusOption(row))
          .filter(Boolean)
          .sort((left, right) => left.label.localeCompare(right.label))
      };

      catalogCache.signature = signature;
      catalogCache.catalog = catalog;
      return catalog;
    })
    .finally(() => {
      if (catalogCache.pending?.signature === signature) {
        catalogCache.pending = null;
      }
    });

  catalogCache.pending = {
    signature,
    promise
  };
  return promise;
}

module.exports = {
  loadFocusToIndustryCatalog,
  __testOnly: {
    resetCache() {
      catalogCache.signature = null;
      catalogCache.catalog = null;
      catalogCache.pending = null;
    }
  }
};
