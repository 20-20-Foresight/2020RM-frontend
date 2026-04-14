/**
 * Builds the form payload used to persist a segmentation editor document.
 * @param {{
 *   data: {
 *     description?: string,
 *     editorType?: string,
 *     version?: number|null,
 *     document?: unknown,
 *     segmentationDefault: { structure: string }
 *   },
 *   description: string,
 *   metadata: Record<string, unknown>,
 *   editorConfig: Record<string, unknown>,
 *   rows: unknown[]
 * }} options
 * @returns {FormData}
 */
function buildSegmentationDefaultSubmitFormData({
  data,
  description,
  metadata,
  editorConfig,
  rows
}) {
  const formData = new FormData();
  formData.set("description", description || "");
  formData.set("metadata", JSON.stringify(metadata || {}));
  formData.set("editor", JSON.stringify(editorConfig || {}));
  formData.set("editorType", data?.editorType || "");
  formData.set("expectedVersion", data?.version == null ? "" : String(data.version));
  formData.set("document", JSON.stringify(data?.document ?? null));
  formData.set("segmentationStructure", data?.segmentationDefault?.structure || "");
  formData.set("segmentationRows", JSON.stringify(Array.isArray(rows) ? rows : []));
  return formData;
}

export {
  buildSegmentationDefaultSubmitFormData
};
