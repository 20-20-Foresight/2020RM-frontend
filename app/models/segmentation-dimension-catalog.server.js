const { loadRawAdminDataDocument } = require("./admin-data.server");
const { loadDimensionDefinitionDocuments } = require("./segmentation-document.server");
const { buildDimensionDefinitionViewModel } = require("./dimension-definition-document");

const dimensionCatalogCache = {
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
 * Builds a stable cache signature for the current dimension-definition summaries.
 * @param {object[]} documents
 * @returns {string}
 */
function buildDimensionCatalogSignature(documents) {
  return JSON.stringify(
    (Array.isArray(documents) ? documents : [])
      .filter((item) => readTrimmedString(item?.id))
      .map((item) => ({
        id: readTrimmedString(item.id),
        version: Number.isFinite(item?.version) ? Number(item.version) : null
      }))
      .sort((left, right) => left.id.localeCompare(right.id))
  );
}

/**
 * Loads dimension definitions for category editor pickers.
 * @param {{
 *   request: Request,
 *   loadDimensionDefinitionDocuments?: typeof loadDimensionDefinitionDocuments,
 *   loadRawAdminDataDocument?: typeof loadRawAdminDataDocument
 * }} options
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
async function loadSegmentationDimensionCatalog(options) {
  const loadDefinitions = options.loadDimensionDefinitionDocuments || loadDimensionDefinitionDocuments;
  const loadDocument = options.loadRawAdminDataDocument || loadRawAdminDataDocument;
  const documents = await loadDefinitions({
    request: options.request
  });
  const signature = buildDimensionCatalogSignature(documents);

  if (dimensionCatalogCache.catalog && dimensionCatalogCache.signature === signature) {
    return dimensionCatalogCache.catalog;
  }
  if (dimensionCatalogCache.pending && dimensionCatalogCache.pending.signature === signature) {
    return dimensionCatalogCache.pending.promise;
  }

  const promise = Promise.all(
    documents
      .filter((item) => item?.id)
      .map((item) =>
        loadDocument({
          request: options.request,
          id: item.id
        })
      )
  )
    .then((details) => {
      const catalog = details
        .flatMap((detail) => buildDimensionDefinitionViewModel({ document: detail?.document }).rows)
        .map((row) => ({
          id: row.id,
          label: row.label || row.key
        }))
        .filter((row) => row.id && row.label)
        .sort((left, right) => left.label.localeCompare(right.label));
      dimensionCatalogCache.signature = signature;
      dimensionCatalogCache.catalog = catalog;
      return catalog;
    })
    .finally(() => {
      if (dimensionCatalogCache.pending?.signature === signature) {
        dimensionCatalogCache.pending = null;
      }
    });

  dimensionCatalogCache.pending = {
    signature,
    promise
  };
  return promise;
}

module.exports = {
  loadSegmentationDimensionCatalog,
  __testOnly: {
    resetCache() {
      dimensionCatalogCache.signature = null;
      dimensionCatalogCache.catalog = null;
      dimensionCatalogCache.pending = null;
    }
  }
};
