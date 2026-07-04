import resegmentationUiModule from "./resegmentation-ui.cjs";

export const {
  applyResegmentationToRecord,
  buildAppliedResult,
  buildExplanationSegmentationLabel,
  hasVisibleSegmentationSummary,
  isV312Resegmentation,
  normalizeSegmentation312Summary,
  normalizeSegmentationVisualSummary,
  readEMIndustryValue,
  readCurrentSegmentationExplanations,
  readDisplayedSegmentationExplanationHeading,
  readDisplayedSegmentationExplanations,
  readDisplayedExplanations,
  readDisplayedExplanationScore,
  readProposedSegmentationExplanations,
  readSavedSegmentation312Payload,
  readPrimaryValue,
  readTrimmedString
} = resegmentationUiModule;
