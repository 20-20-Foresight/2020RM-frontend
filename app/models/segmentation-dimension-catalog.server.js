const { loadRawAdminDataDocument } = require("./admin-data.server");
const { loadDimensionDefinitionDocuments } = require("./segmentation-document.server");
const { buildDimensionDefinitionViewModel } = require("./dimension-definition-document");

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

  const details = await Promise.all(
    documents
      .filter((item) => item?.id)
      .map((item) =>
        loadDocument({
          request: options.request,
          id: item.id
        })
      )
  );

  return details
    .flatMap((detail) => buildDimensionDefinitionViewModel({ document: detail?.document }).rows)
    .map((row) => ({
      id: row.id,
      label: row.label || row.key
    }))
    .filter((row) => row.id && row.label)
    .sort((left, right) => left.label.localeCompare(right.label));
}

module.exports = {
  loadSegmentationDimensionCatalog
};
