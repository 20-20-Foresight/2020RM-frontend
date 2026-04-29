const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyResegmentationToRecord,
  buildAppliedResult,
  normalizeSegmentationVisualSummary,
  readDisplayedSegmentationExplanationHeading,
  readDisplayedSegmentationExplanations
} = require("../app/models/resegmentation-ui");

test("applyResegmentationToRecord updates segmentation and projection without mutating the source record", () => {
  const sourceRecord = {
    name: "Acme Holdings",
    metadata: {
      segmentation: {
        industry: ["old industry"],
        focus: ["old focus"],
        reasons: [{ source: "legacy" }]
      }
    },
    entityDimensionProjection: {
      industry: [{ name: "old industry", score: 4, reasons: [{ source: "legacy" }] }],
      focus: [{ name: "old focus", score: 2, reasons: [{ source: "legacy" }] }]
    }
  };
  const resegmentation = {
    proposed: {
      sector: "Financial Services",
      industry: ["asset management"],
      focus: ["family office"]
    }
  };

  const updatedRecord = applyResegmentationToRecord(sourceRecord, resegmentation);

  assert.notEqual(updatedRecord, sourceRecord);
  assert.deepEqual(sourceRecord.metadata.segmentation.industry, ["old industry"]);
  assert.deepEqual(updatedRecord.metadata.segmentation, {
    sector: "Financial Services",
    industry: ["asset management"],
    focus: ["family office"],
    reasons: []
  });
  assert.deepEqual(updatedRecord.entityDimensionProjection, {
    industry: [{ name: "asset management", score: 1, reasons: [] }],
    focus: [{ name: "family office", score: 1, reasons: [] }]
  });
});

test("buildAppliedResult promotes proposed segments into the current comparison state", () => {
  const result = buildAppliedResult({
    current: {
      industry: ["old industry"],
      focus: ["old focus"]
    },
    proposed: {
      industry: ["new industry"],
      focus: ["new focus"]
    }
  });

  assert.deepEqual(result.current, {
    industry: ["new industry"],
    focus: ["new focus"]
  });
});

test("normalizeSegmentationVisualSummary removes empty values", () => {
  assert.deepEqual(
    normalizeSegmentationVisualSummary({
      industry: ["software", "", "  "],
      focus: ["payments", " "]
    }),
    {
      industry: ["software"],
      focus: ["payments"]
    }
  );
});

test("readDisplayedSegmentationExplanations shows current record reasons before preview", () => {
  const record = {
    metadata: {
      segmentation: {
        industry: ["software"],
        focus: ["payments"],
        reasons: [
          {
            source: "linkedin",
            industry: "software",
            focus: "payments",
            reason: 'Industry Listed: "Software"'
          }
        ]
      }
    }
  };

  const explanations = readDisplayedSegmentationExplanations(record, null);

  assert.equal(explanations.length, 1);
  assert.equal(
    readDisplayedSegmentationExplanationHeading(record, null),
    "Current Segmentation Reasoning"
  );
});

test("readDisplayedSegmentationExplanations replaces current reasons with preview reasons", () => {
  const record = {
    metadata: {
      segmentation: {
        industry: ["software"],
        focus: ["payments"],
        reasons: [
          {
            source: "linkedin",
            industry: "software",
            reason: 'Industry Listed: "Software"'
          }
        ]
      }
    }
  };
  const resegmentation = {
    explanations: [
      {
        source: "description",
        dimension: "Industry",
        value: "fintech",
        score: 5,
        crosswalkDocumentName: "Description Rules",
        reasonHtml: "Derived from fresh description text"
      }
    ]
  };

  const explanations = readDisplayedSegmentationExplanations(record, resegmentation);

  assert.deepEqual(explanations, resegmentation.explanations);
  assert.equal(
    readDisplayedSegmentationExplanationHeading(record, resegmentation),
    "Proposed Segmentation Reasoning"
  );
});

test("readDisplayedSegmentationExplanations clears stale current reasons when preview has none", () => {
  const record = {
    metadata: {
      segmentation: {
        industry: ["software"],
        reasons: [
          {
            source: "linkedin",
            industry: "software",
            reason: 'Industry Listed: "Software"'
          }
        ]
      }
    }
  };

  assert.deepEqual(readDisplayedSegmentationExplanations(record, {}), []);
  assert.equal(
    readDisplayedSegmentationExplanationHeading(record, {}),
    "Proposed Segmentation Reasoning"
  );
});
