import { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  HStack,
  Icon,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  TableContainer,
  Tag,
  TagLabel,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import {
  buildExplanationSegmentationLabel,
  normalizeSegmentation312Summary,
  normalizeSegmentationVisualSummary,
  readEMIndustryValue,
  readDisplayedExplanations
} from "../models/resegmentation-ui.mjs";
import { MdOpenInNew } from "react-icons/md";
import { buildSegmentationDocumentPath } from "../models/segmentation-document.mjs";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readExplanationFieldLabel(row) {
  return (
    readTrimmedString(row?.sourceField) ||
    readTrimmedString(row?.source) ||
    "Not set"
  );
}

function readExplanationStatusLabel(row) {
  switch (readTrimmedString(row?.rowType)) {
    case "matched":
      return "Matched";
    case "missing_input":
      return "Missing Input";
    case "no_match":
      return "No Match";
    case "source_missing":
      return "Missing Data";
    case "warning":
      return "Warning";
    default:
      return "";
  }
}

function readExplanationStatusScheme(row) {
  switch (readTrimmedString(row?.rowType)) {
    case "matched":
      return "green";
    case "warning":
      return "orange";
    case "missing_input":
    case "no_match":
    case "source_missing":
      return "yellow";
    default:
      return "gray";
  }
}

function renderExplanationCrosswalk(row) {
  const crosswalkName = readTrimmedString(row?.crosswalkDocumentName);
  const crosswalkId = readTrimmedString(row?.crosswalkDocumentId);
  const label = crosswalkName || crosswalkId;

  if (!label) {
    return "Not set";
  }

  if (!crosswalkId) {
    return label;
  }

  return (
    <HStack spacing={1} align="center">
      <Text as="span" fontSize="xs">
        {label}
      </Text>
      <Link
        href={buildSegmentationDocumentPath(crosswalkId)}
        isExternal
        color="blue.500"
        aria-label={`Open ${label} crosswalk`}
      >
        <Icon as={MdOpenInNew} boxSize={3.5} />
      </Link>
    </HStack>
  );
}

/**
 * Renders one segmentation chip list.
 * @param {{items?: string[]|null, colorScheme?: string}} props
 * @returns {JSX.Element}
 */
export function SegmentTagList({ items, colorScheme = "blue" }) {
  if (!Array.isArray(items) || !items.length) {
    return (
      <Text color="gray.400" fontSize="sm">
        Not set
      </Text>
    );
  }

  return (
    <Wrap spacing={1}>
      {items.map((item) => (
        <WrapItem key={item}>
          <Tag size="sm" colorScheme={colorScheme} borderRadius="full">
            <TagLabel>{item}</TagLabel>
          </Tag>
        </WrapItem>
      ))}
    </Wrap>
  );
}

/**
 * Renders one current-vs-proposed comparison panel.
 * @param {{
 *   current?: {industry?: string[], focus?: string[]}|null,
 *   proposed?: {industry?: string[], focus?: string[]}|null,
 *   loading?: boolean,
 *   alwaysShow?: boolean,
 *   emptyProposedMessage?: string
 * }} props
 * @returns {JSX.Element|null}
 */
export function SegmentCompare({
  current,
  proposed,
  currentEMIndustry = "",
  proposedEMIndustry = "",
  loading = false,
  alwaysShow = false,
  emptyProposedMessage = "Run segmentation to preview the proposed updates."
}) {
  const panelBg = useColorModeValue("gray.50", "gray.700");
  const newBg = useColorModeValue("green.50", "green.900");
  const currentSummary = normalizeSegmentationVisualSummary(current);
  const proposedSummary = normalizeSegmentationVisualSummary(proposed);
  const currentEMIndustryLabel = readEMIndustryValue(currentEMIndustry, "Not set");
  const proposedEMIndustryLabel = readEMIndustryValue(proposedEMIndustry, "Not set");

  if (loading) {
    return (
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mt={4}>
        {[0, 1].map((index) => (
          <Box
            key={index}
            p={4}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
            bg={panelBg}
          >
            <Skeleton height="18px" mb={3} width="40%" />
            <Skeleton height="16px" mb={2} />
            <Skeleton height="16px" mb={2} />
            <Skeleton height="16px" />
          </Box>
        ))}
      </SimpleGrid>
    );
  }

  if (
    !alwaysShow &&
    !currentSummary.industry.length &&
    !currentSummary.focus.length &&
    !proposedSummary.industry.length &&
    !proposedSummary.focus.length
  ) {
    return null;
  }

  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mt={4}>
      <Box p={4} borderRadius="md" border="1px solid" borderColor="gray.200" bg={panelBg}>
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
          mb={3}
        >
          Current Segments
        </Text>
        <Stack spacing={3}>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              EM Industry
            </Text>
            <Text fontSize="sm" color={currentEMIndustryLabel === "Not set" ? "gray.400" : "inherit"}>
              {currentEMIndustryLabel}
            </Text>
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Industry
            </Text>
            <SegmentTagList items={currentSummary.industry} colorScheme="gray" />
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Focus
            </Text>
            <SegmentTagList items={currentSummary.focus} colorScheme="gray" />
          </Box>
        </Stack>
      </Box>

      <Box p={4} borderRadius="md" border="1px solid" borderColor="green.200" bg={newBg}>
        <HStack mb={3} justify="space-between">
          <Text
            fontSize="xs"
            fontWeight="bold"
            color="green.600"
            textTransform="uppercase"
            letterSpacing="wide"
          >
            Proposed Segments
          </Text>
          {proposed ? (
            <Badge colorScheme="green" fontSize="xs">
              Preview
            </Badge>
          ) : null}
        </HStack>
        {proposedSummary.industry.length || proposedSummary.focus.length ? (
          <Stack spacing={3}>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                EM Industry
              </Text>
              <Text
                fontSize="sm"
                color={proposedEMIndustryLabel === "Not set" ? "gray.400" : "inherit"}
              >
                {proposedEMIndustryLabel}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Industry
              </Text>
              <SegmentTagList items={proposedSummary.industry} colorScheme="green" />
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Focus
              </Text>
              <SegmentTagList items={proposedSummary.focus} colorScheme="green" />
            </Box>
          </Stack>
        ) : (
          <Text fontSize="sm" color="gray.500">
            {emptyProposedMessage}
          </Text>
        )}
      </Box>
    </SimpleGrid>
  );
}

function AssessmentTagList({ items = [], colorScheme = "blue" }) {
  if (!Array.isArray(items) || !items.length) {
    return (
      <Text color="gray.400" fontSize="sm">
        Not set
      </Text>
    );
  }

  return (
    <Wrap spacing={2}>
      {items.map((item) => (
        <WrapItem key={`${item.value}-${item.confidence}`}>
          <Tag size="md" colorScheme={colorScheme} borderRadius="full">
            <TagLabel>{`${item.value} (${item.confidence}/5)`}</TagLabel>
          </Tag>
        </WrapItem>
      ))}
    </Wrap>
  );
}

/**
 * Renders the v3.12 playbook output.
 * @param {{currentV312?: object|null, proposedV312?: object|null}} props
 * @returns {JSX.Element|null}
 */
export function Segmentation312Compare({ currentV312, proposedV312 }) {
  const current = normalizeSegmentation312Summary(currentV312);
  const proposed = normalizeSegmentation312Summary(proposedV312);
  const panelBg = useColorModeValue("gray.50", "gray.700");
  const newBg = useColorModeValue("green.50", "green.900");

  if (
    !current.sector &&
    !proposed.sector &&
    !current.verticals.length &&
    !proposed.verticals.length &&
    !current.emailIndustry &&
    !proposed.emailIndustry
  ) {
    return null;
  }

  function renderAssessmentBlock(label, value, fallbackColor = "gray.400") {
    if (!value?.value) {
      return (
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1}>
            {label}
          </Text>
          <Text fontSize="sm" color={fallbackColor}>
            Not set
          </Text>
        </Box>
      );
    }

    return (
      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>
          {label}
        </Text>
        <Text fontSize="sm" fontWeight="semibold">
          {`${value.value} (${value.confidence}/5)`}
        </Text>
        {value.reason ? (
          <Text fontSize="sm" color="gray.600" mt={1}>
            {value.reason}
          </Text>
        ) : null}
      </Box>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mt={4}>
      <Box p={4} borderRadius="md" border="1px solid" borderColor="gray.200" bg={panelBg}>
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="wide"
          mb={3}
        >
          Current Playbook Output
        </Text>
        <Stack spacing={4}>
          {renderAssessmentBlock("Sector", current.sector)}
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Verticals
            </Text>
            <AssessmentTagList items={current.verticals} colorScheme="gray" />
          </Box>
          {renderAssessmentBlock("Email Industry", current.emailIndustry)}
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Visible Keywords
            </Text>
            <AssessmentTagList items={current.visibleKeywords} colorScheme="gray" />
          </Box>
        </Stack>
      </Box>

      <Box p={4} borderRadius="md" border="1px solid" borderColor="green.200" bg={newBg}>
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="green.600"
          textTransform="uppercase"
          letterSpacing="wide"
          mb={3}
        >
          Proposed Playbook Output
        </Text>
        <Stack spacing={4}>
          {renderAssessmentBlock("Sector", proposed.sector)}
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Verticals
            </Text>
            <AssessmentTagList items={proposed.verticals} colorScheme="green" />
          </Box>
          {renderAssessmentBlock("Email Industry", proposed.emailIndustry)}
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Visible Keywords
            </Text>
            <AssessmentTagList items={proposed.visibleKeywords} colorScheme="green" />
          </Box>
          {proposed.overallAssessment?.reason ? (
            <Box borderWidth="1px" borderColor="green.200" borderRadius="md" bg="whiteAlpha.600" p={3}>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Overall Assessment
              </Text>
              <Text fontSize="sm" fontWeight="semibold">
                {`${proposed.overallAssessment.value || "Best Guess"} (${proposed.overallAssessment.confidence}/5)`}
              </Text>
              <Text fontSize="sm" color="gray.600" mt={1}>
                {proposed.overallAssessment.reason}
              </Text>
            </Box>
          ) : null}
        </Stack>
      </Box>
    </SimpleGrid>
  );
}

/**
 * Renders one explanation table.
 * @param {{explanations?: object[]|null, loading?: boolean}} props
 * @returns {JSX.Element|null}
 */
export function ExplanationTable({
  explanations,
  loading = false,
  heading = "Segmentation Reasoning"
}) {
  const [reviewRow, setReviewRow] = useState(null);
  const theadBg = useColorModeValue("gray.50", "gray.700");
  const reviewBg = useColorModeValue("gray.50", "gray.800");
  const visibleExplanations = readDisplayedExplanations(explanations);

  if (loading) {
    return (
      <Box mt={6}>
        <Skeleton height="16px" width="30%" mb={3} />
        <Skeleton height="16px" mb={2} />
        <Skeleton height="16px" mb={2} />
        <Skeleton height="16px" />
      </Box>
    );
  }

  if (!visibleExplanations.length) {
    return null;
  }

  return (
    <Box mt={6}>
      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
        {heading}
      </Text>
      <TableContainer border="1px solid" borderColor="gray.200" borderRadius="md">
        <Table size="sm" variant="simple">
          <Thead bg={theadBg}>
            <Tr>
              <Th>Status</Th>
              <Th>Segmentation</Th>
              <Th>Field</Th>
              <Th>Crosswalk</Th>
              <Th>How Derived</Th>
              <Th>Review</Th>
            </Tr>
          </Thead>
          <Tbody>
            {visibleExplanations.map((row, index) => {
              const statusLabel = readExplanationStatusLabel(row);
              return (
                <Tr key={`${row.sourceField || row.source || "source"}-${index}`}>
                  <Td fontSize="xs">
                    {statusLabel ? (
                      <Badge colorScheme={readExplanationStatusScheme(row)} fontSize="10px">
                        {statusLabel}
                      </Badge>
                    ) : null}
                  </Td>
                  <Td fontSize="xs" fontWeight="medium" whiteSpace="pre-line">
                    {buildExplanationSegmentationLabel(row)}
                  </Td>
                  <Td fontSize="xs">{readExplanationFieldLabel(row)}</Td>
                  <Td fontSize="xs">{renderExplanationCrosswalk(row)}</Td>
                  <Td fontSize="xs" maxW="340px" whiteSpace="normal" lineHeight="1.5">
                    <Box
                      sx={{
                        mark: {
                          bg: "yellow.100",
                          px: 1,
                          borderRadius: "sm"
                        }
                      }}
                      dangerouslySetInnerHTML={{
                        __html: row.reasonHtml || "Not provided"
                      }}
                    />
                  </Td>
                  <Td fontSize="xs">
                    {row?.review?.description ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setReviewRow(row)}
                      >
                        Review
                      </Button>
                    ) : (
                      <Text color="gray.400">-</Text>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
      <Modal
        isOpen={Boolean(reviewRow)}
        onClose={() => setReviewRow(null)}
        size="xl"
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md">
            {reviewRow?.review?.label || "Review Source"}
          </ModalHeader>
          <Divider />
          <ModalBody py={5}>
            <Stack spacing={3}>
              <Text fontSize="sm" color="gray.500">
                {readExplanationFieldLabel(reviewRow)}
              </Text>
              <Box
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                p={4}
                bg={reviewBg}
                maxH="420px"
                overflowY="auto"
              >
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {reviewRow?.review?.description || "No review text is available."}
                </Text>
              </Box>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button size="sm" onClick={() => setReviewRow(null)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

/**
 * Shared apply modal for single-org review flows.
 * @param {{
 *   isOpen: boolean,
 *   onClose: Function,
 *   onApply: ({saveSalesforce: boolean}) => Promise<void>,
 *   orgName: string,
 *   isDisabled?: boolean,
 *   disabledReason?: string
 * }} props
 * @returns {JSX.Element}
 */
export function ApplyModal({
  isOpen,
  onClose,
  onApply,
  orgName,
  isDisabled = false,
  disabledReason = ""
}) {
  const [saveSalesforce, setSaveSalesforce] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    if (isDisabled) {
      return;
    }

    setApplying(true);
    setError("");
    try {
      await onApply({ saveSalesforce });
      setSaveSalesforce(false);
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to apply resegmentation.");
    } finally {
      setApplying(false);
    }
  }

  function handleClose() {
    setSaveSalesforce(false);
    setApplying(false);
    setError("");
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">Apply Segmentation</ModalHeader>
        <Divider />
        <ModalBody py={5}>
          <Text fontSize="sm" color="gray.600" mb={4}>
            Apply the proposed segments to{" "}
            <Text as="span" fontWeight="semibold">
              {orgName}
            </Text>
            ?
          </Text>
          <Checkbox
            isChecked={saveSalesforce}
            onChange={(event) => setSaveSalesforce(event.target.checked)}
            colorScheme="blue"
            mb={error || isDisabled ? 4 : 0}
            isDisabled={isDisabled}
          >
            <Text fontSize="sm">Stage Salesforce account updates</Text>
          </Checkbox>
          {isDisabled && disabledReason ? (
            <Tooltip label={disabledReason} shouldWrapChildren>
              <Text fontSize="sm" color="gray.500">
                {disabledReason}
              </Text>
            </Tooltip>
          ) : null}
          {error ? (
            <Alert status="error" borderRadius="md" mt={4}>
              <AlertIcon />
              {error}
            </Alert>
          ) : null}
        </ModalBody>
        <ModalFooter gap={2}>
          <Button size="sm" variant="ghost" onClick={handleClose} isDisabled={applying}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handleApply}
            isLoading={applying}
            loadingText="Applying..."
            isDisabled={isDisabled}
          >
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
