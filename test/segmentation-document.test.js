const test = require("node:test");
const assert = require("node:assert/strict");

const { buildSegmentationDocumentPath } = require("../app/models/segmentation-document");

test("buildSegmentationDocumentPath reuses the admin data editor route for named segmentation documents", () => {
  assert.equal(buildSegmentationDocumentPath("crm.data.taxonomy:sif"), "/admin/data/crm.data.taxonomy%3Asif");
  assert.equal(buildSegmentationDocumentPath("crm.data:segmentation rules"), "/admin/data/crm.data%3Asegmentation%20rules");
});

test("buildSegmentationDocumentPath falls back to the segmentation landing route when the id is missing", () => {
  assert.equal(buildSegmentationDocumentPath(""), "/admin/segmentation");
  assert.equal(buildSegmentationDocumentPath(null), "/admin/segmentation");
});
