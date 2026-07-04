/**
 * Builds the current editor path for one segmentation document.
 * For now segmentation documents reuse the existing admin data editor.
 * @param {string|null|undefined} id
 * @returns {string}
 */
export function buildSegmentationDocumentPath(id) {
  return id ? `/admin/data/${encodeURIComponent(id)}` : "/admin/segmentation/crosswalks";
}
