const { loadAdminDataList } = require("./admin-data.server");

const SEGMENTATION_DOCUMENT_TYPE = "segmentation";
const CATEGORY_DOCUMENT_TYPE = "categories";
const DIMENSION_DEFINITION_DOCUMENT_TYPE = "dimension-definition";

/**
 * Loads one filtered admin-data list for the segmentation workspace.
 * @param {{request: Request, type: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof loadAdminDataList>>}
 */
async function loadDocumentsByType(options) {
  return loadAdminDataList({
    request: options.request,
    namespacePrefix: "crm.data",
    filter: {
      type: options.type
    },
    fetchImpl: options.fetchImpl
  });
}

/**
 * Loads the segmentation documents for `/admin/segmentation/crosswalks`.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof loadAdminDataList>>}
 */
async function loadSegmentationDocuments(options) {
  return loadDocumentsByType({
    request: options.request,
    type: SEGMENTATION_DOCUMENT_TYPE,
    fetchImpl: options.fetchImpl
  });
}

/**
 * Loads the dimension-definition documents for `/admin/segmentation/dimensions`.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof loadAdminDataList>>}
 */
async function loadDimensionDefinitionDocuments(options) {
  return loadDocumentsByType({
    request: options.request,
    type: DIMENSION_DEFINITION_DOCUMENT_TYPE,
    fetchImpl: options.fetchImpl
  });
}

/**
 * Loads the category documents for `/admin/segmentation/categories`.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof loadAdminDataList>>}
 */
async function loadCategoryDocuments(options) {
  return loadDocumentsByType({
    request: options.request,
    type: CATEGORY_DOCUMENT_TYPE,
    fetchImpl: options.fetchImpl
  });
}

module.exports = {
  loadCategoryDocuments,
  loadDimensionDefinitionDocuments,
  loadSegmentationDocuments
};
