const { loadRawAdminDataDocument } = require("./admin-data.server");
const { loadCategoryDocuments } = require("./segmentation-document.server");

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
 * Returns whether a value is a plain object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Collects category labels from one category document shape.
 * @param {unknown} document
 * @returns {string[]}
 */
function collectCategoryLabels(document) {
  /** @type {Set<string>} */
  const labels = new Set();

  /**
   * @param {unknown} value
   */
  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    const label = readTrimmedString(value.label) || readTrimmedString(value.name) || readTrimmedString(value.title);
    const isDeleted = value.deleted === true || value.deletedOn != null;
    const isInactive = value.active === false;

    if (label && !isDeleted && !isInactive) {
      labels.add(label);
    }

    for (const nestedKey of ["values", "categories", "items", "entries"]) {
      if (nestedKey in value) {
        visit(value[nestedKey]);
      }
    }
  }

  visit(document);
  return Array.from(labels).sort((left, right) => left.localeCompare(right));
}

/**
 * Loads the category labels needed by segmentation rule editors.
 * @param {{
 *   request: Request,
 *   loadCategoryDocuments?: typeof loadCategoryDocuments,
 *   loadRawAdminDataDocument?: typeof loadRawAdminDataDocument
 * }} options
 * @returns {Promise<{industryOptions: string[], focusOptions: string[]}>}
 */
async function loadSegmentationCategoryCatalog(options) {
  const loadCategories =
    options.loadCategoryDocuments || loadCategoryDocuments;
  const loadDocument =
    options.loadRawAdminDataDocument || loadRawAdminDataDocument;
  const documents = await loadCategories({
    request: options.request
  });
  const industrySummary =
    documents.find((item) => readTrimmedString(item.name)?.toLowerCase() === "industry") || null;
  const focusSummary =
    documents.find((item) => readTrimmedString(item.name)?.toLowerCase() === "focus") || null;

  const [industryDetail, focusDetail] = await Promise.all([
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
  ]);

  return {
    industryOptions: collectCategoryLabels(industryDetail?.document),
    focusOptions: collectCategoryLabels(focusDetail?.document)
  };
}

module.exports = {
  collectCategoryLabels,
  loadSegmentationCategoryCatalog
};
