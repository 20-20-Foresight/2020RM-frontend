import { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Icon,
  Text,
  Tooltip,
  useDisclosure
} from "@chakra-ui/react";
import { MdAutorenew, MdBusiness, MdCheck } from "react-icons/md";
import { buildOrganizationSegmentationViewModel } from "../models/organization-segmentation.mjs";
import { postResegmentationAction } from "../models/resegmentation-client.mjs";
import {
  applyResegmentationToRecord,
  buildAppliedResult,
  hasVisibleSegmentationSummary,
  normalizeSegmentationVisualSummary,
  readDisplayedSegmentationExplanationHeading,
  readDisplayedSegmentationExplanations
} from "../models/resegmentation-ui.mjs";
import { ApplyModal, ExplanationTable, SegmentCompare } from "./ResegmentationReviewContent.jsx";

/**
 * Build the comparison-friendly summary from one exported organization record.
 * @param {object|null} record
 * @returns {{industry: string[], focus: string[]}}
 */
function buildRecordSegmentationSummary(record) {
  const segmentation = buildOrganizationSegmentationViewModel(record);
  return normalizeSegmentationVisualSummary({
    industry: segmentation?.industries,
    focus: segmentation?.focuses
  });
}

/**
 * Renders the single-organization resegmentation drawer used from the detail page.
 * @param {{
 *   isOpen: boolean,
 *   onClose: Function,
 *   organizationUUID: string,
 *   organizationName: string,
 *   record: object|null,
 *   onApplied?: Function
 * }} props
 * @returns {JSX.Element}
 */
export function OrganizationResegmentationFlyout({
  isOpen,
  onClose,
  organizationUUID,
  organizationName,
  record,
  onApplied
}) {
  const [result, setResult] = useState(null);
  const [resultMessage, setResultMessage] = useState("");
  const [error, setError] = useState("");
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState("");
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const { isOpen: isApplyOpen, onOpen: openApply, onClose: closeApply } = useDisclosure();

  useEffect(() => {
    setResult(null);
    setResultMessage("");
    setError("");
    setIsSegmenting(false);
    setIsApplied(false);
    setAppliedMessage("");
    setHasPreviewed(false);
  }, [organizationUUID]);

  const resultCurrentSummary = normalizeSegmentationVisualSummary(result?.current);
  const proposedSummary = normalizeSegmentationVisualSummary(result?.proposed);
  const hasProposedSummary = hasVisibleSegmentationSummary(proposedSummary);
  const currentSummary = isApplied
    ? buildRecordSegmentationSummary(record)
    : hasVisibleSegmentationSummary(resultCurrentSummary)
      ? resultCurrentSummary
      : buildRecordSegmentationSummary(record);
  const displayedExplanations = readDisplayedSegmentationExplanations(record, result);
  const explanationHeading = readDisplayedSegmentationExplanationHeading(record, result);
  const isReady = Boolean(organizationUUID);
  const emptyPreviewWarning = hasPreviewed && !hasProposedSummary
    ? "Not enough data exists to segment this organization."
    : "";
  const applyTooltipLabel = !isReady
    ? "Organization details are incomplete."
    : !hasPreviewed
      ? "Run segmentation first"
      : !hasProposedSummary
        ? "No segmentation is available to apply."
        : "";

  async function handleSegment() {
    if (!isReady) {
      return;
    }

    setIsSegmenting(true);
    setResult(null);
    setIsApplied(false);
    setAppliedMessage("");
    setResultMessage("");
    setError("");
    setHasPreviewed(false);

    try {
      const payload = await postResegmentationAction("segmentOrganization", {
        uuid: organizationUUID,
        dryRun: true,
        includeExplanation: true
      });
      setResult(payload.resegmentation || null);
      setResultMessage(payload.statusExplained || "");
      setHasPreviewed(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to preview resegmentation.");
    } finally {
      setIsSegmenting(false);
    }
  }

  async function handleApply({ saveSalesforce }) {
    if (!isReady) {
      return;
    }

    const payload = await postResegmentationAction("segmentOrganization", {
      uuid: organizationUUID,
      dryRun: false,
      saveSalesforce,
      includeExplanation: true
    });
    const nextResult = buildAppliedResult(payload.resegmentation);
    const nextRecord = applyResegmentationToRecord(record, payload.resegmentation);
    const nextMessage = payload.statusExplained || "Segmentation applied.";
    setResult(nextResult);
    setIsApplied(true);
    setAppliedMessage(nextMessage);
    setResultMessage("");
    setError("");
    if (typeof onApplied === "function") {
      await onApplied({
        record: nextRecord,
        resegmentation: payload.resegmentation,
        statusExplained: nextMessage
      });
    }
  }

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="xl">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" pb={4}>
            <HStack spacing={2}>
              <Icon as={MdBusiness} color="blue.500" boxSize={5} />
              <Box>
                <Text fontSize="md" fontWeight="bold">
                  {organizationName || "Organization"}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="normal">
                  Segmentation Review
                </Text>
              </Box>
            </HStack>
          </DrawerHeader>

          <DrawerBody py={5}>
            {!isReady ? (
              <Alert status="warning" borderRadius="md" mb={5}>
                <AlertIcon />
                Organization details are incomplete, so resegmentation is unavailable.
              </Alert>
            ) : null}
            {error ? (
              <Alert status="error" borderRadius="md" mb={5}>
                <AlertIcon />
                {error}
              </Alert>
            ) : null}
            {!error && emptyPreviewWarning ? (
              <Alert status="warning" borderRadius="md" mb={5}>
                <AlertIcon />
                {emptyPreviewWarning}
              </Alert>
            ) : null}
            {appliedMessage ? (
              <Alert status="success" borderRadius="md" mb={5}>
                <AlertIcon />
                {appliedMessage}
              </Alert>
            ) : null}
            {!appliedMessage && !emptyPreviewWarning && resultMessage ? (
              <Alert status="info" borderRadius="md" mb={5}>
                <AlertIcon />
                {resultMessage}
              </Alert>
            ) : null}

            <SegmentCompare
              current={currentSummary}
              proposed={result?.proposed || null}
              loading={isSegmenting}
              alwaysShow
              emptyProposedMessage={
                hasPreviewed
                  ? "No segmentation was generated for this organization."
                  : "Run segmentation to preview the proposed updates."
              }
            />
            <ExplanationTable
              explanations={displayedExplanations}
              heading={explanationHeading}
              loading={isSegmenting}
            />
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" gap={3} justifyContent="flex-start">
            <Button
              size="sm"
              colorScheme="blue"
              leftIcon={<MdAutorenew />}
              onClick={handleSegment}
              isLoading={isSegmenting}
              loadingText="Segmenting..."
              isDisabled={!isReady}
            >
              Segment Now
            </Button>
            <Tooltip label={applyTooltipLabel} isDisabled={!applyTooltipLabel}>
              <Button
                size="sm"
                colorScheme={isApplied ? "green" : "blue"}
                leftIcon={isApplied ? <MdCheck /> : undefined}
                isDisabled={!isReady || !hasProposedSummary}
                onClick={openApply}
              >
                {isApplied ? "Applied" : "Apply"}
              </Button>
            </Tooltip>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ApplyModal
        isOpen={isApplyOpen}
        onClose={closeApply}
        onApply={handleApply}
        orgName={organizationName || "Organization"}
        isDisabled={!isReady}
        disabledReason="Organization details are incomplete."
      />
    </>
  );
}
