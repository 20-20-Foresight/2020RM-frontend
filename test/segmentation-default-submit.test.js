const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSegmentationDefaultSubmitFormData
} = require("../app/models/segmentation-default-submit");

test("buildSegmentationDefaultSubmitFormData includes the full document payload for one immediate save", () => {
  const formData = buildSegmentationDefaultSubmitFormData({
    data: {
      editorType: "segmentation.default",
      version: 7,
      document: {
        crosswalk: {}
      },
      segmentationDefault: {
        structure: "flat-crosswalk"
      }
    },
    description: "Updated description",
    metadata: {
      name: "biscred",
      type: "crosswalk"
    },
    editorConfig: {
      type: "segmentation.default"
    },
    rows: [
      {
        categories: ["Assets", "Office"],
        industryTargets: [{ name: "RE Commercial", score: "3" }],
        focusTargets: [{ name: "Office", score: "3" }]
      }
    ]
  });

  assert.equal(formData.get("description"), "Updated description");
  assert.equal(formData.get("editorType"), "segmentation.default");
  assert.equal(formData.get("expectedVersion"), "7");
  assert.equal(formData.get("segmentationStructure"), "flat-crosswalk");
  assert.deepEqual(JSON.parse(formData.get("metadata")), {
    name: "biscred",
    type: "crosswalk"
  });
  assert.deepEqual(JSON.parse(formData.get("editor")), {
    type: "segmentation.default"
  });
  assert.deepEqual(JSON.parse(formData.get("document")), {
    crosswalk: {}
  });
  assert.deepEqual(JSON.parse(formData.get("segmentationRows")), [
    {
      categories: ["Assets", "Office"],
      industryTargets: [{ name: "RE Commercial", score: "3" }],
      focusTargets: [{ name: "Office", score: "3" }]
    }
  ]);
});
