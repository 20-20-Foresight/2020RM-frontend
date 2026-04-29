import { useEffect, useRef, useState } from "react";
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
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  Select,
  Skeleton,
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
import { postResegmentationAction } from "../models/resegmentation-client.mjs";
import {
  applyResegmentationToRecord,
  buildAppliedResult,
  hasVisibleSegmentationSummary,
  normalizeSegmentationVisualSummary,
  readDisplayedSegmentationExplanationHeading,
  readDisplayedSegmentationExplanations,
  readPrimaryValue,
  readTrimmedString
} from "../models/resegmentation-ui.mjs";
import {
  buildSelectedListRows,
  countRenderableListMembers
} from "../models/resegmentation-list-detail.mjs";
import {
  ApplyModal,
  ExplanationTable,
  SegmentCompare
} from "./ResegmentationReviewContent.jsx";
import ResegmentationImportDrawer from "./ResegmentationImportDrawer.jsx";

const ORGANIZATION_SEARCH_DEBOUNCE_MS = 2000;

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
 * Read the current segmentation summary for one list row.
 * @param {object|null|undefined} org
 * @param {object|null|undefined} result
 * @returns {{industry: string[], focus: string[]}}
 */
function readListRowCurrentSummary(org, result) {
  return normalizeSegmentationVisualSummary(result?.current || org?.currentSegmentation || null);
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
  const [hasSinglePreviewed, setHasSinglePreviewed] = useState(false);

  const [lists, setLists] = useState(Array.isArray(initialLists) ? initialLists : []);
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
  const [listImportMessage, setListImportMessage] = useState("");

  const searchRequestRef = useRef(0);
  const { isOpen: isSingleApplyOpen, onOpen: openSingleApply, onClose: closeSingleApply } =
    useDisclosure();
  const { isOpen: isListApplyOpen, onOpen: openListApply, onClose: closeListApply } =
    useDisclosure();
  const { isOpen: isReviewOpen, onOpen: openReview, onClose: closeReview } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: openImport, onClose: closeImport } = useDisclosure();

  const dropdownBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.700");
  const appliedRowBg = useColorModeValue("green.50", "green.900");

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
        const payload = await postResegmentationAction("searchOrganizations", {
          query: trimmedQuery
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
  const singleProposedSummary = normalizeSegmentationVisualSummary(singleResult?.proposed);
  const hasSingleProposedSummary = hasVisibleSegmentationSummary(singleProposedSummary);
  const selectedCurrentSummary = singleApplied
    ? buildRecordSegmentationSummary(selectedOrganization?.record || null)
    : hasVisibleSegmentationSummary(resultCurrentSummary)
      ? resultCurrentSummary
      : buildRecordSegmentationSummary(selectedOrganization?.record || null);
  const singleDisplayedExplanations = readDisplayedSegmentationExplanations(
    selectedOrganization?.record || null,
    singleResult
  );
  const singleExplanationHeading = readDisplayedSegmentationExplanationHeading(
    selectedOrganization?.record || null,
    singleResult
  );
  const singleEmptyPreviewWarning = hasSinglePreviewed && !hasSingleProposedSummary
    ? "Not enough data exists to segment this organization."
    : "";
  const singleApplyTooltipLabel = !selectedOrganization?.summary?.uuid
    ? "Select an organization first"
    : !hasSinglePreviewed
      ? "Run segmentation first"
      : !hasSingleProposedSummary
        ? "No segmentation is available to apply."
        : "";

  const selectedListRows = buildSelectedListRows(selectedListDetail);

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
    setHasSinglePreviewed(false);
    setIsLoadingOrganization(true);

    try {
      const payload = await postResegmentationAction("loadOrganization", {
        uuid: candidate.uuid
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
    setHasSinglePreviewed(false);

    try {
      const payload = await postResegmentationAction("segmentOrganization", {
        uuid: selectedOrganization.summary.uuid,
        dryRun: true,
        includeExplanation: true
      });
      setSingleResult(payload.resegmentation || null);
      setSingleResultMessage(payload.statusExplained || "");
      setHasSinglePreviewed(true);
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

    const payload = await postResegmentationAction("segmentOrganization", {
      uuid: selectedOrganization.summary.uuid,
      dryRun: false,
      saveSalesforce,
      includeExplanation: true
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
    setListImportMessage("");

    if (!nextListId) {
      return;
    }

    setIsLoadingList(true);
    try {
      const payload = await postResegmentationAction("loadListDetail", {
        uuid: nextListId
      });
      setSelectedListDetail(payload.listDetail || null);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Unable to load list details.");
    } finally {
      setIsLoadingList(false);
    }
  }

  /**
   * Selects the newly imported list and refreshes the picker options.
   * @param {object|null} list
   * @param {{statusExplained?: string, listDetail?: object|null}} [details]
   * @returns {Promise<void>}
   */
  async function handleImportedList(list, details = {}) {
    if (!list?.uuid) {
      return;
    }

    const importedRenderableCount = countRenderableListMembers(details.listDetail || null);
    const importedMemberCount = Number(details.listDetail?.list?.memberCount || 0);
    if (details.listDetail && importedMemberCount > 0 && importedRenderableCount === 0) {
      setListError(
        "The imported list was created, but its members could not be loaded yet. Your previous list selection was kept."
      );
      setListImportMessage(details.statusExplained || `Imported list ${list.name || list.uuid}.`);
      return;
    }

    setLists((currentValue) => {
      const nextLists = Array.isArray(currentValue) ? currentValue.slice() : [];
      const existingIndex = nextLists.findIndex((entry) => entry?.uuid === list.uuid);
      if (existingIndex >= 0) {
        nextLists[existingIndex] = {
          ...nextLists[existingIndex],
          ...list,
        };
        return nextLists;
      }

      return [list, ...nextLists];
    });
    setListImportMessage(details.statusExplained || `Imported list ${list.name || list.uuid}.`);
    if (details.listDetail) {
      setSelectedListId(list.uuid);
      setSelectedListDetail(details.listDetail);
      setListError("");
      setRowResults({});
      setRowAppliedIds(new Set());
      setReviewOrg(null);
      setPendingApplyOrg(null);
      setSegmentAllMessage("");
      return;
    }

    await handleSelectList(list.uuid);
  }

  async function segmentListRow(org) {
    setRowSegmentingIds((currentValue) => {
      const nextValue = new Set(currentValue);
      nextValue.add(org.uuid);
      return nextValue;
    });

    try {
      const payload = await postResegmentationAction("segmentOrganization", {
        uuid: org.uuid,
        dryRun: true,
        includeExplanation: true
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
    const payload = await postResegmentationAction("segmentOrganization", {
      uuid: org.uuid,
      dryRun: false,
      saveSalesforce: options.saveSalesforce,
      includeExplanation: true
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
                      setHasSinglePreviewed(false);
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
                    <Tooltip label={singleApplyTooltipLabel} isDisabled={!singleApplyTooltipLabel}>
                      <Button
                        size="sm"
                        colorScheme={singleApplied ? "green" : "blue"}
                        leftIcon={singleApplied ? <MdCheck /> : undefined}
                        isDisabled={!hasSingleProposedSummary}
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
                {!selectedOrganizationError && singleEmptyPreviewWarning ? (
                  <Alert status="warning" borderRadius="md" mb={4}>
                    <AlertIcon />
                    {singleEmptyPreviewWarning}
                  </Alert>
                ) : null}
                {singleAppliedMessage ? (
                  <Alert status="success" borderRadius="md" mb={4}>
                    <AlertIcon />
                    {singleAppliedMessage}
                  </Alert>
                ) : null}
                {!singleAppliedMessage && !singleEmptyPreviewWarning && singleResultMessage ? (
                  <Alert status="info" borderRadius="md" mb={4}>
                    <AlertIcon />
                    {singleResultMessage}
                  </Alert>
                ) : null}

                <SegmentCompare
                  current={selectedCurrentSummary}
                  proposed={singleResult?.proposed || null}
                  loading={isLoadingOrganization || isSegmentingSingle}
                  alwaysShow
                  emptyProposedMessage={
                    hasSinglePreviewed
                      ? "No segmentation was generated for this organization."
                      : "Run segmentation to preview the proposed updates."
                  }
                />
                <ExplanationTable
                  explanations={singleDisplayedExplanations}
                  heading={singleExplanationHeading}
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
                <Button
                  size="sm"
                  leftIcon={<Icon as={MdUpload} />}
                  variant="outline"
                  colorScheme="blue"
                  onClick={openImport}
                >
                  Import List
                </Button>
              </Flex>

              {listError ? (
                <Alert status="error" borderRadius="md" mb={4}>
                  <AlertIcon />
                  {listError}
                </Alert>
              ) : null}
              {listImportMessage ? (
                <Alert status="success" borderRadius="md" mb={4}>
                  <AlertIcon />
                  {listImportMessage}
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

      <ResegmentationImportDrawer
        isOpen={isImportOpen}
        onClose={closeImport}
        onImportedList={handleImportedList}
      />

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
