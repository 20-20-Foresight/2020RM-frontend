const { loadAdminDataList } = require("./admin-data.server");

/**
 * Loads the segmentation rule documents for `/admin/segmentation`.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof loadAdminDataList>>}
 */
async function loadSegmentationDocuments(options) {
  return loadAdminDataList({
    request: options.request,
    namespacePrefix: "crm.data",
    filter: {
      type: "taxonomy"
    },
    fetchImpl: options.fetchImpl
  });
}

module.exports = {
  loadSegmentationDocuments
};
