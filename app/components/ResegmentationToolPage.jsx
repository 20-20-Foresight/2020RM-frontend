import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableContainer,
  Tabs,
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
  useDisclosure,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  MdAutorenew,
  MdBusiness,
  MdCheck,
  MdOutlineArrowForward,
  MdSearch,
  MdUpload,
  MdVisibility,
} from "react-icons/md";
import { buildOrganizationSegmentationViewModel } from "../models/organization-segmentation.mjs";

const ORGANIZATION_SEARCH_DEBOUNCE_MS = 2000;

/**
 * Read one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalize one segmentation summary for resegmentation visuals.
 * Sector is intentionally excluded from this page for now.
 * @param {object|null|undefined} summary
 * @returns {{industry: string[], focus: string[]}}
 */
function normalizeSegmentationVisualSummary(summary) {
  return {
    industry: Array.isArray(summary?.industry)
      ? summary.industry.filter((value) => readTrimmedString(value))
      : [],
    focus: Array.isArray(summary?.focus)
      ? summary.focus.filter((value) => readTrimmedString(value))
      : [],
  };
}

/**
 * Returns whether one normalized segmentation summary has any visible values.
 * @param {{industry?: string[], focus?: string[]}|null|undefined} summary
 * @returns {boolean}
 */
function hasVisibleSegmentationSummary(summary) {
  return Boolean(summary?.industry?.length || summary?.focus?.length);
}

/**
 * Build the comparison-friendly summary from one exported organization record.
 * @param {object|null} record
 * @returns {{industry: string[], focus: string[]}}
 */
function buildRecordSegmentationSummary(record) {
  const segmentation = buildOrganizationSegmentationViewModel(record);
  return normalizeSegmentationVisualSummary({
    industry: segmentation?.industries,
    focus: segmentation?.focuses,
  });
}

/**
 * Build one display-friendly label for a segment array.
 * @param {string[]} values
 * @param {string} fallback
 * @returns {string}
 */
function readPrimaryValue(values, fallback = "Not set") {
  return Array.isArray(values) && values.length ? values[0] : fallback;
}

/**
 * Returns the display-ready explanation rows for this page.
 * Sector rows are intentionally hidden until the backend sector issue is fixed.
 * @param {object[]|null|undefined} explanations
 * @returns {object[]}
 */
function readDisplayedExplanations(explanations) {
  return (Array.isArray(explanations) ? explanations : []).filter(
    (row) => readTrimmedString(row?.dimension).toLowerCase() !== "sector"
  );
}

/**
 * Read one explanation score for display.
 * @param {unknown} value
 * @returns {number}
 */
function readDisplayedExplanationScore(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

/**
 * Build one compact explanation segmentation label.
 * @param {object|null|undefined} row
 * @returns {string}
 */
function buildExplanationSegmentationLabel(row) {
  const dimension = readTrimmedString(row?.dimension) || "Not set";
  const value = readTrimmedString(row?.value) || "Not set";
  const score = readDisplayedExplanationScore(row?.score);
  return `${dimension}: ${value} (${score})`;
}

/**
 * Read the current segmentation summary for one list row.
 * @param {object|null|undefined} org
 * @param {object|null|undefined} result
 * @returns {{industry: string[], focus: string[]}}
 */
function readListRowCurrentSummary(org, result) {
  return normalizeSegmentationVisualSummary(result?.current || org?.currentSegmentation || null);
}

/**
 * Reads one route-action response without hiding HTML/auth/404 failures behind JSON parse errors.
 * @param {Response} response
 * @returns {Promise<object>}
 */
async function readActionResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return bodyText ? JSON.parse(bodyText) : {};
    } catch (error) {
      throw new Error("The resegmentation action returned invalid JSON.");
    }
  }

  const titleMatch = bodyText.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const message = title || bodyText.trim() || response.statusText || "Unexpected non-JSON response.";
  throw new Error(
    response.redirected || bodyText.includes("<!DOCTYPE")
      ? `${message}. The request returned an HTML page instead of JSON; refresh the page and sign in again if needed.`
      : message
  );
}

/**
 * Returns one updated organization record after a successful apply.
 * @param {object|null} record
 * @param {object|null} resegmentation
 * @returns {object}
 */
function applyResegmentationToRecord(record, resegmentation) {
  const nextRecord =
    record && typeof record === "object"
      ? JSON.parse(JSON.stringify(record))
      : {};
  nextRecord.metadata ||= {};
  nextRecord.metadata.segmentation = {
    sector: resegmentation?.proposed?.sector || null,
    industry: Array.isArray(resegmentation?.proposed?.industry)
      ? resegmentation.proposed.industry.slice()
      : [],
    focus: Array.isArray(resegmentation?.proposed?.focus)
      ? resegmentation.proposed.focus.slice()
      : [],
    reasons: [],
  };
  nextRecord.entityDimensionProjection = {
    industry: (resegmentation?.proposed?.industry || []).map((name) => ({
      name,
      score: 1,
      reasons: [],
    })),
    focus: (resegmentation?.proposed?.focus || []).map((name) => ({
      name,
      score: 1,
      reasons: [],
    })),
  };
  return nextRecord;
}

/**
 * Returns one client-side applied result so the current panel reflects the saved state.
 * @param {object|null} resegmentation
 * @returns {object|null}
 */
function buildAppliedResult(resegmentation) {
  if (!resegmentation || typeof resegmentation !== "object") {
    return null;
  }

  return {
    ...resegmentation,
    current: resegmentation.proposed || resegmentation.current || null,
  };
}

/**
 * Renders one segmentation chip list.
 * @param {{items?: string[]|null, colorScheme?: string}} props
 * @returns {JSX.Element}
 */
function SegmentTagList({ items, colorScheme = "blue" }) {
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
 *   loading?: boolean
 * }} props
 * @returns {JSX.Element|null}
 */
function SegmentCompare({ current, proposed, loading = false }) {
  const panelBg = useColorModeValue("gray.50", "gray.700");
  const newBg = useColorModeValue("green.50", "green.900");
  const currentSummary = normalizeSegmentationVisualSummary(current);
  const proposedSummary = normalizeSegmentationVisualSummary(proposed);

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
            Run segmentation to preview the proposed updates.
          </Text>
        )}
      </Box>
    </SimpleGrid>
  );
}

/**
 * Renders one explanation table.
 * @param {{explanations?: object[]|null, loading?: boolean}} props
 * @returns {JSX.Element|null}
 */
function ExplanationTable({ explanations, loading = false }) {
  const theadBg = useColorModeValue("gray.50", "gray.700");
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
        Segmentation Reasoning
      </Text>
      <TableContainer border="1px solid" borderColor="gray.200" borderRadius="md">
        <Table size="sm" variant="simple">
          <Thead bg={theadBg}>
            <Tr>
              <Th>Segmentation</Th>
              <Th>Source</Th>
              <Th>Crosswalk</Th>
              <Th>How Derived</Th>
            </Tr>
          </Thead>
          <Tbody>
            {visibleExplanations.map((row, index) => (
              <Tr key={`${row.source || "source"}-${index}`}>
                <Td fontSize="xs" fontWeight="medium">
                  {buildExplanationSegmentationLabel(row)}
                </Td>
                <Td fontSize="xs">{row.source || "Not set"}</Td>
                <Td fontSize="xs">{row.crosswalkDocumentName || "Not set"}</Td>
                <Td fontSize="xs" maxW="340px" whiteSpace="normal" lineHeight="1.5">
                  <Box
                    sx={{
                      mark: {
                        bg: "yellow.100",
                        px: 1,
                        borderRadius: "sm",
                      },
                    }}
                    dangerouslySetInnerHTML={{
                      __html: row.reasonHtml || "Not provided",
                    }}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/**
 * Shared apply modal for single-org and list flows.
 * @param {{
 *   isOpen: boolean,
 *   onClose: Function,
 *   onApply: ({saveSalesforce: boolean}) => Promise<void>,
 *   orgName: string
 * }} props
 * @returns {JSX.Element}
 */
function ApplyModal({ isOpen, onClose, onApply, orgName }) {
  const [saveSalesforce, setSaveSalesforce] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
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
            mb={error ? 4 : 0}
          >
            <Text fontSize="sm">Stage Salesforce account updates</Text>
          </Checkbox>
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
          >
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Review drawer for list-row previews.
 * @param {{
 *   isOpen: boolean,
 *   onClose: Function,
 *   org: object|null,
 *   result: object|null,
 *   onApply: ({saveSalesforce: boolean}) => Promise<void>,
 *   isApplied: boolean
 * }} props
 * @returns {JSX.Element|null}
 */
function ReviewDrawer({ isOpen, onClose, org, result, onApply, isApplied }) {
  const { isOpen: isApplyOpen, onOpen: openApply, onClose: closeApply } = useDisclosure();

  if (!org) {
    return null;
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
                  {org.name}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="normal">
                  Segmentation Review
                </Text>
              </Box>
            </HStack>
          </DrawerHeader>

          <DrawerBody py={5}>
            {isApplied ? (
              <Alert status="success" borderRadius="md" mb={5}>
                <AlertIcon />
                Segmentation has been applied.
              </Alert>
            ) : null}
            <SegmentCompare current={result?.current} proposed={result?.proposed} />
            <ExplanationTable explanations={result?.explanations} />
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" gap={3} justifyContent="flex-start">
            <Button
              size="sm"
              colorScheme={isApplied ? "green" : "blue"}
              leftIcon={isApplied ? <MdCheck /> : undefined}
              isDisabled={isApplied || !result}
              onClick={openApply}
            >
              {isApplied ? "Applied" : "Apply"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ApplyModal
        isOpen={isApplyOpen}
        onClose={closeApply}
        onApply={onApply}
        orgName={org.name}
      />
    </>
  );
}

/**
 * Production resegmentation tool page.
 * @param {{initialLists?: object[], initialError?: string|null}} props
 * @returns {JSX.Element}
 */
export function ResegmentationToolPage({
  initialLists = [],
  initialError = null,
}) {
  const [singleQuery, setSingleQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedOrganizationError, setSelectedOrganizationError] = useState("");
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [singleResult, setSingleResult] = useState(null);
  const [singleResultMessage, setSingleResultMessage] = useState("");
  const [isSegmentingSingle, setIsSegmentingSingle] = useState(false);
  const [singleApplied, setSingleApplied] = useState(false);
  const [singleAppliedMessage, setSingleAppliedMessage] = useState("");

  const [lists] = useState(Array.isArray(initialLists) ? initialLists : []);
  const [listError, setListError] = useState(initialError || "");
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedListDetail, setSelectedListDetail] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [rowResults, setRowResults] = useState({});
  const [rowSegmentingIds, setRowSegmentingIds] = useState(new Set());
  const [rowAppliedIds, setRowAppliedIds] = useState(new Set());
  const [isSegmentingAll, setIsSegmentingAll] = useState(false);
  const [reviewOrg, setReviewOrg] = useState(null);
  const [pendingApplyOrg, setPendingApplyOrg] = useState(null);
  const [segmentAllMessage, setSegmentAllMessage] = useState("");

  const searchRequestRef = useRef(0);
  const { isOpen: isSingleApplyOpen, onOpen: openSingleApply, onClose: closeSingleApply } =
    useDisclosure();
  const { isOpen: isListApplyOpen, onOpen: openListApply, onClose: closeListApply } =
    useDisclosure();
  const { isOpen: isReviewOpen, onOpen: openReview, onClose: closeReview } = useDisclosure();

  const dropdownBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const appliedRowBg = useColorModeValue("green.50", "green.900");

  /**
   * Calls one same-origin 2020RM-backend proxy endpoint for an interactive tool action.
   * @param {string} intent
   * @param {Record<string, unknown>} fields
   * @returns {Promise<object>}
   */
  async function postAction(intent, fields = {}) {
    const uuid = readTrimmedString(fields.uuid);
    let requestPath = "";
    const requestOptions = {
      method: "GET",
      credentials: "same-origin",
    };

    if (intent === "searchOrganizations") {
      const params = new URLSearchParams({
        name: readTrimmedString(fields.query),
      });
      requestPath = `/api/rest/resegmentation/organizations?${params.toString()}`;
    } else if (intent === "loadOrganization") {
      requestPath = `/api/rest/resegmentation/organizations/${encodeURIComponent(uuid)}`;
    } else if (intent === "loadListDetail") {
      requestPath = `/api/rest/resegmentation/lists/${encodeURIComponent(uuid)}`;
    } else if (intent === "segmentOrganization") {
      requestPath = `/api/rest/resegmentation/organizations/${encodeURIComponent(uuid)}/segment`;
      requestOptions.method = "POST";
      requestOptions.headers = {
        "content-type": "application/json",
      };
      requestOptions.body = JSON.stringify({
        dryRun: fields.dryRun !== false,
        saveSalesforce: fields.saveSalesforce === true,
        includeExplanation: fields.includeExplanation !== false,
      });
    } else {
      throw new Error("Unknown resegmentation action.");
    }

    const response = await fetch(requestPath, requestOptions);
    const payload = await readActionResponse(response);
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || "Resegmentation request failed.");
    }

    if (intent === "searchOrganizations") {
      return {
        organizations: Array.isArray(payload.organizations) ? payload.organizations : [],
        status: payload.status,
        statusExplained: payload.statusExplained,
      };
    }
    if (intent === "loadOrganization") {
      return {
        organization: payload.organization || null,
        status: payload.status,
        statusExplained: payload.statusExplained,
      };
    }
    if (intent === "loadListDetail") {
      return {
        listDetail: payload.listDetail || null,
        status: payload.status,
        statusExplained: payload.statusExplained,
      };
    }
    if (intent === "segmentOrganization") {
      return {
        resegmentation: payload.resegmentation || null,
        status: payload.status,
        statusExplained: payload.statusExplained,
      };
    }

    return payload;
  }

  useEffect(() => {
    const trimmedQuery = readTrimmedString(singleQuery);
    const selectedName = readTrimmedString(selectedOrganization?.summary?.name);

    if (!trimmedQuery || (selectedName && trimmedQuery === selectedName)) {
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return undefined;
    }

    const requestNumber = searchRequestRef.current + 1;
    searchRequestRef.current = requestNumber;

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const payload = await postAction("searchOrganizations", {
          query: trimmedQuery,
        });
        if (searchRequestRef.current !== requestNumber) {
          return;
        }
        setSearchResults(Array.isArray(payload.organizations) ? payload.organizations : []);
        setSearchError("");
      } catch (error) {
        if (searchRequestRef.current !== requestNumber) {
          return;
        }
        setSearchResults([]);
        setSearchError(error instanceof Error ? error.message : "Unable to search organizations.");
      } finally {
        if (searchRequestRef.current === requestNumber) {
          setIsSearching(false);
        }
      }
    }, ORGANIZATION_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [singleQuery, selectedOrganization?.summary?.name]);

  const resultCurrentSummary = normalizeSegmentationVisualSummary(singleResult?.current);
  const selectedCurrentSummary = singleApplied
    ? buildRecordSegmentationSummary(selectedOrganization?.record || null)
    : hasVisibleSegmentationSummary(resultCurrentSummary)
      ? resultCurrentSummary
      : buildRecordSegmentationSummary(selectedOrganization?.record || null);

  const selectedListRows = Array.isArray(selectedListDetail?.members)
    ? selectedListDetail.members
        .filter((row) => row?.member?.uuid)
        .map((row) => ({
          membershipUUID: row.uuid,
          uuid: row.member.uuid,
          name: row.member.name || "Unnamed organization",
          currentSegmentation: normalizeSegmentationVisualSummary(
            row.member.currentSegmentation || null
          ),
        }))
    : [];

  async function handleSelectOrganization(candidate) {
    setSelectedOrganization({
      summary: candidate,
      record: null,
    });
    setSingleQuery(candidate.name || "");
    setSearchResults([]);
    setSearchFocused(false);
    setSearchError("");
    setSelectedOrganizationError("");
    setSingleResult(null);
    setSingleApplied(false);
    setSingleAppliedMessage("");
    setSingleResultMessage("");
    setIsLoadingOrganization(true);

    try {
      const payload = await postAction("loadOrganization", {
        uuid: candidate.uuid,
      });
      setSelectedOrganization({
        summary: candidate,
        record: payload.organization || null,
      });
    } catch (error) {
      setSelectedOrganizationError(
        error instanceof Error ? error.message : "Unable to load organization details."
      );
    } finally {
      setIsLoadingOrganization(false);
    }
  }

  async function handleSingleSegment() {
    if (!selectedOrganization?.summary?.uuid) {
      return;
    }

    setIsSegmentingSingle(true);
    setSingleResult(null);
    setSingleApplied(false);
    setSingleAppliedMessage("");
    setSingleResultMessage("");
    setSelectedOrganizationError("");

    try {
      const payload = await postAction("segmentOrganization", {
        uuid: selectedOrganization.summary.uuid,
        dryRun: true,
        includeExplanation: true,
      });
      setSingleResult(payload.resegmentation || null);
      setSingleResultMessage(payload.statusExplained || "");
    } catch (error) {
      setSelectedOrganizationError(
        error instanceof Error ? error.message : "Unable to preview resegmentation."
      );
    } finally {
      setIsSegmentingSingle(false);
    }
  }

  async function handleSingleApply({ saveSalesforce }) {
    if (!selectedOrganization?.summary?.uuid) {
      return;
    }

    const payload = await postAction("segmentOrganization", {
      uuid: selectedOrganization.summary.uuid,
      dryRun: false,
      saveSalesforce,
      includeExplanation: true,
    });
    setSingleResult(buildAppliedResult(payload.resegmentation));
    setSingleApplied(true);
    setSingleAppliedMessage(payload.statusExplained || "Segmentation applied.");
    setSelectedOrganization((currentValue) => ({
      summary: currentValue?.summary || selectedOrganization.summary,
      record: applyResegmentationToRecord(currentValue?.record || null, payload.resegmentation),
    }));
  }

  async function handleSelectList(nextListId) {
    setSelectedListId(nextListId);
    setSelectedListDetail(null);
    setListError("");
    setRowResults({});
    setRowAppliedIds(new Set());
    setReviewOrg(null);
    setPendingApplyOrg(null);
    setSegmentAllMessage("");

    if (!nextListId) {
      return;
    }

    setIsLoadingList(true);
    try {
      const payload = await postAction("loadListDetail", {
        uuid: nextListId,
      });
      setSelectedListDetail(payload.listDetail || null);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Unable to load list details.");
    } finally {
      setIsLoadingList(false);
    }
  }

  async function segmentListRow(org) {
    setRowSegmentingIds((currentValue) => {
      const nextValue = new Set(currentValue);
      nextValue.add(org.uuid);
      return nextValue;
    });

    try {
      const payload = await postAction("segmentOrganization", {
        uuid: org.uuid,
        dryRun: true,
        includeExplanation: true,
      });
      setRowResults((currentValue) => ({
        ...currentValue,
        [org.uuid]: payload.resegmentation || null,
      }));
      setListError("");
      return payload;
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Unable to preview list resegmentation.");
      throw error;
    } finally {
      setRowSegmentingIds((currentValue) => {
        const nextValue = new Set(currentValue);
        nextValue.delete(org.uuid);
        return nextValue;
      });
    }
  }

  async function handleSegmentAll() {
    if (!selectedListRows.length) {
      return;
    }

    const pendingRows = selectedListRows.filter(
      (org) => !rowResults[org.uuid] && !rowSegmentingIds.has(org.uuid)
    );

    if (!pendingRows.length) {
      return;
    }

    setIsSegmentingAll(true);
    setSegmentAllMessage("");
    const settled = await Promise.allSettled(pendingRows.map((org) => segmentListRow(org)));
    const failedCount = settled.filter((result) => result.status === "rejected").length;
    setSegmentAllMessage(
      failedCount
        ? `Segmented ${pendingRows.length - failedCount} organizations. ${failedCount} failed.`
        : `Segmented ${pendingRows.length} organizations.`
    );
    setIsSegmentingAll(false);
  }

  async function handleApplyListRow(org, options) {
    const payload = await postAction("segmentOrganization", {
      uuid: org.uuid,
      dryRun: false,
      saveSalesforce: options.saveSalesforce,
      includeExplanation: true,
    });
    setRowResults((currentValue) => ({
      ...currentValue,
      [org.uuid]: buildAppliedResult(payload.resegmentation),
    }));
    setRowAppliedIds((currentValue) => {
      const nextValue = new Set(currentValue);
      nextValue.add(org.uuid);
      return nextValue;
    });
    setListError("");
  }

  function openReviewFor(org) {
    setReviewOrg(org);
    openReview();
  }

  return (
    <Box>
      <Heading size="md" mb={1}>
        Resegmentation
      </Heading>
      <Text color="gray.500" fontSize="sm" mb={6}>
        Re-run organization segmentation to update industry and focus classifications.
      </Text>

      {initialError ? (
        <Alert status="warning" borderRadius="md" mb={4}>
          <AlertIcon />
          {initialError}
        </Alert>
      ) : null}

      <Tabs colorScheme="blue" variant="enclosed">
        <TabList>
          <Tab>Single Organization</Tab>
          <Tab>List of Organizations</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={5}>
            <Box mb={5} maxW="420px" position="relative">
              <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                Search for an organization
              </Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Icon as={MdSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Organization name..."
                  value={singleQuery}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSingleQuery(nextValue);
                    setSearchFocused(true);
                    if (
                      readTrimmedString(nextValue) !==
                      readTrimmedString(selectedOrganization?.summary?.name)
                    ) {
                      setSelectedOrganization(null);
                      setSingleResult(null);
                      setSingleApplied(false);
                      setSingleAppliedMessage("");
                      setSingleResultMessage("");
                      setSelectedOrganizationError("");
                    }
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  autoComplete="off"
                />
              </InputGroup>

              {searchFocused &&
              readTrimmedString(singleQuery) &&
              (isSearching || searchResults.length || searchError) ? (
                <Box
                  position="absolute"
                  top="100%"
                  left={0}
                  right={0}
                  zIndex={10}
                  bg={dropdownBg}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  shadow="md"
                  mt={1}
                  maxH="220px"
                  overflowY="auto"
                >
                  {searchError ? (
                    <Box px={3} py={2}>
                      <Text fontSize="sm" color="red.500">
                        {searchError}
                      </Text>
                    </Box>
                  ) : null}
                  {isSearching ? (
                    <Box px={3} py={2}>
                      <Skeleton height="16px" mb={2} />
                      <Skeleton height="16px" />
                    </Box>
                  ) : null}
                  {!isSearching && searchResults.length ? (
                    <List>
                      {searchResults.map((org) => (
                        <ListItem
                          key={org.uuid}
                          px={3}
                          py={2}
                          cursor="pointer"
                          _hover={{ bg: "blue.50" }}
                          onMouseDown={() => handleSelectOrganization(org)}
                        >
                          <HStack spacing={2}>
                            <Icon as={MdBusiness} color="gray.400" boxSize={4} />
                            <Box>
                              <Text fontSize="sm" fontWeight="medium">
                                {org.name}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {org.website || org.linkedin || "No website or LinkedIn"}
                              </Text>
                            </Box>
                          </HStack>
                        </ListItem>
                      ))}
                    </List>
                  ) : null}
                  {!isSearching && !searchError && !searchResults.length ? (
                    <Box px={3} py={2}>
                      <Text fontSize="sm" color="gray.500">
                        No matching organizations found.
                      </Text>
                    </Box>
                  ) : null}
                </Box>
              ) : null}
            </Box>

            {selectedOrganization ? (
              <Box>
                <Flex
                  align="center"
                  justify="space-between"
                  mb={4}
                  pb={4}
                  borderBottom="1px solid"
                  borderColor="gray.100"
                  gap={4}
                  flexWrap="wrap"
                >
                  <Box>
                    <HStack spacing={2} mb={1}>
                      <Icon as={MdBusiness} color="blue.500" boxSize={5} />
                      <Heading size="md">{selectedOrganization.summary.name}</Heading>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      Current: {readPrimaryValue(selectedCurrentSummary.industry)} ·{" "}
                      {readPrimaryValue(selectedCurrentSummary.focus)}
                    </Text>
                  </Box>
                  <HStack spacing={3}>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      leftIcon={<MdAutorenew />}
                      onClick={handleSingleSegment}
                      isLoading={isSegmentingSingle}
                      loadingText="Segmenting..."
                      isDisabled={isLoadingOrganization}
                    >
                      Segment Now
                    </Button>
                    <Tooltip
                      label={!singleResult ? "Run segmentation first" : ""}
                      isDisabled={!!singleResult}
                    >
                      <Button
                        size="sm"
                        colorScheme={singleApplied ? "green" : "blue"}
                        leftIcon={singleApplied ? <MdCheck /> : undefined}
                        isDisabled={!singleResult}
                        onClick={openSingleApply}
                      >
                        {singleApplied ? "Applied" : "Apply"}
                      </Button>
                    </Tooltip>
                  </HStack>
                </Flex>

                {selectedOrganizationError ? (
                  <Alert status="error" borderRadius="md" mb={4}>
                    <AlertIcon />
                    {selectedOrganizationError}
                  </Alert>
                ) : null}
                {singleAppliedMessage ? (
                  <Alert status="success" borderRadius="md" mb={4}>
                    <AlertIcon />
                    {singleAppliedMessage}
                  </Alert>
                ) : null}
                {!singleAppliedMessage && singleResultMessage ? (
                  <Alert status="info" borderRadius="md" mb={4}>
                    <AlertIcon />
                    {singleResultMessage}
                  </Alert>
                ) : null}

                <SegmentCompare
                  current={selectedCurrentSummary}
                  proposed={singleResult?.proposed || null}
                  loading={isLoadingOrganization || isSegmentingSingle}
                />
                <ExplanationTable
                  explanations={singleResult?.explanations}
                  loading={isSegmentingSingle}
                />
              </Box>
            ) : null}
          </TabPanel>

          <TabPanel px={0} pt={5}>
            <Box>
              <Flex align="flex-end" gap={4} mb={6} flexWrap="wrap">
                <Box flex="1" minW="220px" maxW="380px">
                  <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                    Select a list
                  </Text>
                  <Select
                    placeholder="Choose a list..."
                    value={selectedListId}
                    onChange={(event) => handleSelectList(event.target.value)}
                    size="sm"
                  >
                    {lists.map((list) => (
                      <option key={list.uuid} value={list.uuid}>
                        {list.name} ({list.memberCount || 0} orgs)
                      </option>
                    ))}
                  </Select>
                </Box>
                <Tooltip label="Phase 1 uses seeded backend lists. CSV/XLSX import lands in phase 2.">
                  <Button
                    size="sm"
                    leftIcon={<Icon as={MdUpload} />}
                    variant="outline"
                    colorScheme="gray"
                    isDisabled
                  >
                    Import List (Phase 2)
                  </Button>
                </Tooltip>
              </Flex>

              {listError ? (
                <Alert status="error" borderRadius="md" mb={4}>
                  <AlertIcon />
                  {listError}
                </Alert>
              ) : null}
              {segmentAllMessage ? (
                <Alert status="info" borderRadius="md" mb={4}>
                  <AlertIcon />
                  {segmentAllMessage}
                </Alert>
              ) : null}

              {isLoadingList ? (
                <Box>
                  <Skeleton height="20px" mb={3} width="240px" />
                  <Skeleton height="36px" mb={2} />
                  <Skeleton height="36px" mb={2} />
                  <Skeleton height="36px" />
                </Box>
              ) : null}

              {selectedListDetail ? (
                <Box>
                  <Flex justify="space-between" align="center" mb={3} gap={4} flexWrap="wrap">
                    <Box>
                      <Heading size="sm">{selectedListDetail.list?.name}</Heading>
                      <Text fontSize="xs" color="gray.500" mt={0.5}>
                        {selectedListRows.length} organizations · type:{" "}
                        {selectedListDetail.list?.listTypeSlug || "Unknown"} · subtype:{" "}
                        {selectedListDetail.list?.listSubTypeSlug || "Unknown"}
                      </Text>
                    </Box>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      leftIcon={<MdAutorenew />}
                      onClick={handleSegmentAll}
                      isLoading={isSegmentingAll}
                      loadingText="Segmenting..."
                      isDisabled={selectedListRows.every(
                        (org) => rowResults[org.uuid] || rowSegmentingIds.has(org.uuid)
                      )}
                    >
                      Segment All
                    </Button>
                  </Flex>

                  <TableContainer border="1px solid" borderColor="gray.200" borderRadius="md">
                    <Table size="sm" variant="simple">
                      <Thead bg={headerBg}>
                        <Tr>
                          <Th>Organization</Th>
                          <Th>Current Industry</Th>
                          <Th>Current Focus</Th>
                          <Th>
                            <HStack spacing={1}>
                              <Text>Updated Industry</Text>
                              <Icon as={MdOutlineArrowForward} color="green.500" boxSize={3} />
                            </HStack>
                          </Th>
                          <Th>
                            <HStack spacing={1}>
                              <Text>Updated Focus</Text>
                              <Icon as={MdOutlineArrowForward} color="green.500" boxSize={3} />
                            </HStack>
                          </Th>
                          <Th>Segment</Th>
                          <Th>Review</Th>
                          <Th>Apply</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedListRows.map((org) => {
                          const result = rowResults[org.uuid];
                          const isSegmenting = rowSegmentingIds.has(org.uuid);
                          const isApplied = rowAppliedIds.has(org.uuid);
                          const currentSummary = readListRowCurrentSummary(org, result);

                          return (
                            <Tr
                              key={org.uuid}
                              bg={isApplied ? appliedRowBg : undefined}
                              opacity={isApplied ? 0.8 : 1}
                            >
                              <Td fontWeight="medium" fontSize="sm">
                                <HStack spacing={1}>
                                  <Icon as={MdBusiness} color="gray.400" boxSize={3.5} />
                                  <Text>{org.name}</Text>
                                </HStack>
                              </Td>
                              <Td fontSize="xs" color="gray.600">
                                {readPrimaryValue(currentSummary.industry)}
                              </Td>
                              <Td fontSize="xs" color="gray.600">
                                {readPrimaryValue(currentSummary.focus)}
                              </Td>
                              <Td>
                                {isSegmenting ? (
                                  <Skeleton height="20px" width="120px" />
                                ) : result ? (
                                  <Tag size="sm" colorScheme="green" borderRadius="full">
                                    <TagLabel>{readPrimaryValue(result.proposed?.industry)}</TagLabel>
                                  </Tag>
                                ) : (
                                  <Text fontSize="xs" color="gray.300">
                                    —
                                  </Text>
                                )}
                              </Td>
                              <Td>
                                {isSegmenting ? (
                                  <Skeleton height="20px" width="100px" />
                                ) : result ? (
                                  <Tag size="sm" colorScheme="green" borderRadius="full">
                                    <TagLabel>{readPrimaryValue(result.proposed?.focus)}</TagLabel>
                                  </Tag>
                                ) : (
                                  <Text fontSize="xs" color="gray.300">
                                    —
                                  </Text>
                                )}
                              </Td>
                              <Td>
                                <Button
                                  size="xs"
                                  colorScheme="blue"
                                  leftIcon={<MdAutorenew />}
                                  onClick={() => segmentListRow(org)}
                                  isLoading={isSegmenting}
                                  isDisabled={false}
                                  variant="outline"
                                >
                                  Segment
                                </Button>
                              </Td>
                              <Td>
                                <Tooltip label={!result ? "Segment first" : ""} isDisabled={!!result}>
                                  <Button
                                    size="xs"
                                    leftIcon={<MdVisibility />}
                                    isDisabled={!result}
                                    variant="ghost"
                                    colorScheme="blue"
                                    onClick={() => openReviewFor(org)}
                                  >
                                    Review
                                  </Button>
                                </Tooltip>
                              </Td>
                              <Td>
                                <Tooltip
                                  label={!result ? "Segment first" : isApplied ? "Already applied" : ""}
                                  isDisabled={!!result && !isApplied}
                                >
                                  <Button
                                    size="xs"
                                    leftIcon={isApplied ? <MdCheck /> : undefined}
                                    colorScheme={isApplied ? "green" : "blue"}
                                    isDisabled={!result || isApplied}
                                    onClick={() => {
                                      setPendingApplyOrg(org);
                                      openListApply();
                                    }}
                                  >
                                    {isApplied ? "Applied" : "Apply"}
                                  </Button>
                                </Tooltip>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : null}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <ApplyModal
        isOpen={isSingleApplyOpen}
        onClose={closeSingleApply}
        onApply={handleSingleApply}
        orgName={selectedOrganization?.summary?.name || ""}
      />

      <ApplyModal
        isOpen={isListApplyOpen}
        onClose={closeListApply}
        onApply={(options) => handleApplyListRow(pendingApplyOrg, options)}
        orgName={pendingApplyOrg?.name || ""}
      />

      <ReviewDrawer
        isOpen={isReviewOpen}
        onClose={closeReview}
        org={reviewOrg}
        result={reviewOrg ? rowResults[reviewOrg.uuid] : null}
        onApply={(options) => handleApplyListRow(reviewOrg, options)}
        isApplied={reviewOrg ? rowAppliedIds.has(reviewOrg.uuid) : false}
      />
    </Box>
  );
}

export default ResegmentationToolPage;
