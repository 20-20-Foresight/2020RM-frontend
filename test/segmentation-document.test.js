const test = require("node:test");
const assert = require("node:assert/strict");

test("buildSegmentationDocumentPath reuses the admin data editor route for named segmentation documents", () => {
  const { buildSegmentationDocumentPath } = require("../app/models/segmentation-document");
  assert.equal(buildSegmentationDocumentPath("crm.data.taxonomy:sif"), "/admin/data/crm.data.taxonomy%3Asif");
  assert.equal(buildSegmentationDocumentPath("crm.data:segmentation rules"), "/admin/data/crm.data%3Asegmentation%20rules");
});

test("buildSegmentationDocumentPath falls back to the segmentation crosswalks route when the id is missing", () => {
  const { buildSegmentationDocumentPath } = require("../app/models/segmentation-document");
  assert.equal(buildSegmentationDocumentPath(""), "/admin/segmentation/crosswalks");
  assert.equal(buildSegmentationDocumentPath(null), "/admin/segmentation/crosswalks");
});
