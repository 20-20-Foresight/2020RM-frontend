import resegmentationUiModule from "./resegmentation-ui.cjs";

export const {
  applyResegmentationToRecord,
  buildAppliedResult,
  buildExplanationSegmentationLabel,
  hasVisibleSegmentationSummary,
  normalizeSegmentationVisualSummary,
  readEMIndustryValue,
  readCurrentSegmentationExplanations,
  readDisplayedSegmentationExplanationHeading,
  readDisplayedSegmentationExplanations,
  readDisplayedExplanations,
  readDisplayedExplanationScore,
  readProposedSegmentationExplanations,
  readPrimaryValue,
  readTrimmedString
} = resegmentationUiModule;
