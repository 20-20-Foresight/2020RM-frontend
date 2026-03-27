const {
  loadRawAdminDataDocument,
  saveRawAdminDataDocument
} = require("./admin-data.server");
const {
  SIF_TAXONOMY_DATA_ID,
  normalizeSifTaxonomyDocument
} = require("./sif-taxonomy");

/**
 * Loads the authoritative SIF taxonomy through the admin data BFF.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof loadRawAdminDataDocument> & {document: Record<string, unknown>}>}
 */
async function loadSifTaxonomyDocument(options) {
  const data = await loadRawAdminDataDocument({
    request: options.request,
    id: SIF_TAXONOMY_DATA_ID,
    fetchImpl: options.fetchImpl
  });

  return {
    ...data,
    document: normalizeSifTaxonomyDocument(data.document)
  };
}

/**
 * Saves one authoritative SIF taxonomy document through the admin data BFF.
 * @param {{request: Request, expectedVersion?: number|null, description?: string, document: unknown, fetchImpl?: typeof fetch}} options
 * @returns {Promise<ReturnType<typeof saveRawAdminDataDocument>>}
 */
async function saveSifTaxonomyDocument(options) {
  return saveRawAdminDataDocument({
    request: options.request,
    id: SIF_TAXONOMY_DATA_ID,
    expectedVersion: options.expectedVersion,
    description: typeof options.description === "string" ? options.description : "",
    document: normalizeSifTaxonomyDocument(options.document),
    fetchImpl: options.fetchImpl
  });
}

module.exports = {
  loadSifTaxonomyDocument,
  saveSifTaxonomyDocument
};

