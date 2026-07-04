const { loadRawAdminDataDocument } = require("./admin-data.server");
const { loadCategoryDocuments } = require("./segmentation-document.server");

const categoryCatalogCache = {
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
 * Builds a stable cache signature for the relevant category summaries.
 * @param {object|null} industrySummary
 * @param {object|null} focusSummary
 * @returns {string}
 */
function buildCategoryCatalogSignature(industrySummary, focusSummary) {
  return JSON.stringify([
    {
      id: readTrimmedString(industrySummary?.id),
      version: Number.isFinite(industrySummary?.version)
        ? Number(industrySummary.version)
        : null
    },
    {
      id: readTrimmedString(focusSummary?.id),
      version: Number.isFinite(focusSummary?.version)
        ? Number(focusSummary.version)
        : null
    }
  ]);
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
  const signature = buildCategoryCatalogSignature(industrySummary, focusSummary);

  if (categoryCatalogCache.catalog && categoryCatalogCache.signature === signature) {
    return categoryCatalogCache.catalog;
  }
  if (categoryCatalogCache.pending && categoryCatalogCache.pending.signature === signature) {
    return categoryCatalogCache.pending.promise;
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
      const catalog = {
        industryOptions: collectCategoryLabels(industryDetail?.document),
        focusOptions: collectCategoryLabels(focusDetail?.document)
      };
      categoryCatalogCache.signature = signature;
      categoryCatalogCache.catalog = catalog;
      return catalog;
    })
    .finally(() => {
      if (categoryCatalogCache.pending?.signature === signature) {
        categoryCatalogCache.pending = null;
      }
    });

  categoryCatalogCache.pending = {
    signature,
    promise
  };
  return promise;
}

module.exports = {
  collectCategoryLabels,
  loadSegmentationCategoryCatalog,
  __testOnly: {
    resetCache() {
      categoryCatalogCache.signature = null;
      categoryCatalogCache.catalog = null;
      categoryCatalogCache.pending = null;
    }
  }
};
