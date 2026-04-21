/**
 * Design mock: Tools — Resegmentation
 * Fully interactive prototype with mock data. No real API calls.
 */
import { useState, useRef } from "react";
import {
  Box, Heading, Text, Button, HStack, VStack, Flex,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Input, InputGroup, InputLeftElement,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  SimpleGrid, Tag, TagLabel, Wrap, WrapItem,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter, DrawerCloseButton,
  Checkbox, Divider, Skeleton, SkeletonText,
  Select, List, ListItem,
  Badge, Icon, Tooltip, Stack, useDisclosure,
  useColorModeValue, Alert, AlertIcon
} from "@chakra-ui/react";
import {
  MdSearch, MdCheck, MdUpload, MdBusiness,
  MdAutorenew, MdVisibility, MdOutlineArrowForward
} from "react-icons/md";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ORGS = [
  { id: "o1", name: "Acme Corp",          currentIndustry: "Manufacturing",  currentFocus: "Industrial B2B" },
  { id: "o2", name: "Pinnacle Group",     currentIndustry: "Finance",         currentFocus: "Investment Management" },
  { id: "o3", name: "Meridian Health",    currentIndustry: "Healthcare",      currentFocus: "Health Systems" },
  { id: "o4", name: "Solaris Energy",     currentIndustry: "Energy",          currentFocus: "Renewables" },
  { id: "o5", name: "Bright Horizons",    currentIndustry: "Education",       currentFocus: "EdTech" },
  { id: "o6", name: "Nova Payments",      currentIndustry: "Finance",         currentFocus: "Payments" },
  { id: "o7", name: "Cascade Logistics",  currentIndustry: "Logistics",       currentFocus: "Supply Chain" },
  { id: "o8", name: "Vertex Software",    currentIndustry: "Technology",      currentFocus: "Enterprise SaaS" },
];

const MOCK_LISTS = [
  { id: "l1", name: "Q4 2025 — Tech Prospects",   count: 12, type: "TEST", subtype: "organization" },
  { id: "l2", name: "Healthcare Outreach Wave 3", count: 8,  type: "TEST", subtype: "organization" },
  { id: "l3", name: "Fintech Series B Targets",   count: 5,  type: "TEST", subtype: "organization" },
];

const LIST_ORGS = {
  l1: [
    { id: "lo1", name: "Vertex Software",    currentIndustry: "Technology",  currentFocus: "Enterprise SaaS" },
    { id: "lo2", name: "Nova Payments",      currentIndustry: "Finance",     currentFocus: "Payments" },
    { id: "lo3", name: "Cascade Logistics",  currentIndustry: "Logistics",   currentFocus: "Supply Chain" },
    { id: "lo4", name: "BlueStar Analytics", currentIndustry: "Technology",  currentFocus: "Data & Analytics" },
  ],
  l2: [
    { id: "lo5", name: "Meridian Health",  currentIndustry: "Healthcare",  currentFocus: "Health Systems" },
    { id: "lo6", name: "CarePath Inc",     currentIndustry: "Healthcare",  currentFocus: "Health Tech" },
  ],
  l3: [
    { id: "lo7", name: "Pinnacle Group",  currentIndustry: "Finance",  currentFocus: "Investment Management" },
    { id: "lo8", name: "Nova Payments",   currentIndustry: "Finance",  currentFocus: "Payments" },
  ],
};

function mockSegmentationResult(org) {
  const upgrades = {
    "Manufacturing":  { industry: "Industrial Technology",   focus: "B2B SaaS" },
    "Finance":        { industry: "Financial Technology",    focus: "Enterprise Fintech" },
    "Healthcare":     { industry: "Healthcare Technology",   focus: "Health Tech SaaS" },
    "Energy":         { industry: "Clean Technology",        focus: "Energy Tech" },
    "Education":      { industry: "Education Technology",   focus: "Learning Platforms" },
    "Logistics":      { industry: "Supply Chain Technology", focus: "Logistics SaaS" },
    "Technology":     { industry: "Enterprise Software",     focus: "B2B SaaS" },
  };
  const updated = upgrades[org.currentIndustry] ?? { industry: org.currentIndustry, focus: org.currentFocus };
  return {
    original: { industry: org.currentIndustry, focus: org.currentFocus },
    updated,
    reasons: [
      {
        source: "website_content",
        sector: "Technology",
        industry: updated.industry,
        focus: updated.focus,
        reason: `Homepage and product pages describe a \u201c${updated.industry.toLowerCase()} platform\u201d targeting enterprise buyers, consistent with a ${updated.focus} classification.`
      },
      {
        source: "linkedin_description",
        sector: "Technology",
        industry: updated.industry,
        focus: org.currentFocus,
        reason: `LinkedIn \u201cAbout\u201d section contains keywords \u201csoftware\u201d and \u201centerprise\u201d appearing in the top two sentences of the company description.`
      },
      {
        source: "news_signal",
        sector: "Technology",
        industry: updated.industry,
        focus: updated.focus,
        reason: `Recent press release announced a Series C funding round \u201cto accelerate enterprise go-to-market,\u201d reinforcing the ${updated.focus} focus.`
      },
    ]
  };
}

// ---------------------------------------------------------------------------
// Shared display components
// ---------------------------------------------------------------------------

function SegmentTagList({ items, colorScheme = "blue" }) {
  if (!items || items.length === 0) return <Text color="gray.400" fontSize="sm">—</Text>;
  return (
    <Wrap spacing={1}>
      {(Array.isArray(items) ? items : [items]).map((item) => (
        <WrapItem key={item}>
          <Tag size="sm" colorScheme={colorScheme} borderRadius="full">
            <TagLabel>{item}</TagLabel>
          </Tag>
        </WrapItem>
      ))}
    </Wrap>
  );
}

function SegmentCompare({ original, updated, loading }) {
  const panelBg = useColorModeValue("gray.50", "gray.700");
  const newBg   = useColorModeValue("green.50", "green.900");

  if (loading) {
    return (
      <SimpleGrid columns={2} spacing={4} mt={4}>
        {[0, 1].map((i) => (
          <Box key={i} p={4} borderRadius="md" border="1px solid" borderColor="gray.200" bg={panelBg}>
            <Skeleton height="18px" mb={3} width="40%" />
            <SkeletonText noOfLines={2} spacing={2} />
          </Box>
        ))}
      </SimpleGrid>
    );
  }

  if (!original) return null;

  return (
    <SimpleGrid columns={2} spacing={4} mt={4}>
      <Box p={4} borderRadius="md" border="1px solid" borderColor="gray.200" bg={panelBg}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={3}>
          Current Segments
        </Text>
        <Stack spacing={3}>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>Industry</Text>
            <SegmentTagList items={[original.industry]} colorScheme="gray" />
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>Focus</Text>
            <SegmentTagList items={[original.focus]} colorScheme="gray" />
          </Box>
        </Stack>
      </Box>

      <Box p={4} borderRadius="md" border="1px solid" borderColor="green.200" bg={newBg}>
        <HStack mb={3} justify="space-between">
          <Text fontSize="xs" fontWeight="bold" color="green.600" textTransform="uppercase" letterSpacing="wide">
            Proposed Segments
          </Text>
          <Badge colorScheme="green" fontSize="xs">Updated</Badge>
        </HStack>
        <Stack spacing={3}>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>Industry</Text>
            <SegmentTagList items={[updated.industry]} colorScheme="green" />
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>Focus</Text>
            <SegmentTagList items={[updated.focus]} colorScheme="green" />
          </Box>
        </Stack>
      </Box>
    </SimpleGrid>
  );
}

function ReasonsTable({ reasons, loading }) {
  const theadBg = useColorModeValue("gray.50", "gray.700");

  if (loading) {
    return (
      <Box mt={6}>
        <Skeleton height="16px" width="30%" mb={3} />
        <SkeletonText noOfLines={4} spacing={3} />
      </Box>
    );
  }
  if (!reasons?.length) return null;

  return (
    <Box mt={6}>
      <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>Segmentation Reasoning</Text>
      <TableContainer border="1px solid" borderColor="gray.200" borderRadius="md">
        <Table size="sm" variant="simple">
          <Thead bg={theadBg}>
            <Tr>
              <Th>Source</Th>
              <Th>Sector</Th>
              <Th>Industry</Th>
              <Th>Focus</Th>
              <Th>Reason</Th>
            </Tr>
          </Thead>
          <Tbody>
            {reasons.map((r, i) => (
              <Tr key={i}>
                <Td>
                  <Badge colorScheme="purple" fontSize="xs" fontFamily="mono">
                    {r.source}
                  </Badge>
                </Td>
                <Td fontSize="xs">{r.sector}</Td>
                <Td fontSize="xs">{r.industry}</Td>
                <Td fontSize="xs">{r.focus}</Td>
                <Td fontSize="xs" maxW="340px" whiteSpace="normal" lineHeight="1.5">{r.reason}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Apply modal (shared by both tabs)
// ---------------------------------------------------------------------------

function ApplyModal({ isOpen, onClose, onApply, orgName }) {
  const [saveSalesforce, setSaveSalesforce] = useState(false);
  const [applying, setApplying] = useState(false);

  function handleApply() {
    setApplying(true);
    setTimeout(() => {
      setApplying(false);
      setSaveSalesforce(false);
      onApply({ saveSalesforce });
      onClose();
    }, 1200);
  }

  function handleClose() {
    setSaveSalesforce(false);
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
            <Text as="span" fontWeight="semibold">{orgName}</Text>?
          </Text>
          <Checkbox
            isChecked={saveSalesforce}
            onChange={(e) => setSaveSalesforce(e.target.checked)}
            colorScheme="blue"
          >
            <Text fontSize="sm">Save in Salesforce</Text>
          </Checkbox>
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
            loadingText="Applying…"
          >
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Review drawer (list tab) — slides in from right, keeps table visible
// ---------------------------------------------------------------------------

function ReviewDrawer({ isOpen, onClose, org, result, onApply, isApplied }) {
  const { isOpen: isApplyOpen, onOpen: openApply, onClose: closeApply } = useDisclosure();

  if (!org) return null;

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
                <Text fontSize="md" fontWeight="bold">{org.name}</Text>
                <Text fontSize="xs" color="gray.500" fontWeight="normal">
                  Segmentation Review
                </Text>
              </Box>
            </HStack>
          </DrawerHeader>

          <DrawerBody py={5}>
            {isApplied && (
              <Alert status="success" borderRadius="md" mb={5} size="sm">
                <AlertIcon />
                Segmentation has been applied.
              </Alert>
            )}

            <SegmentCompare
              original={result?.original}
              updated={result?.updated}
              loading={false}
            />
            <ReasonsTable reasons={result?.reasons} loading={false} />
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px" gap={3} justifyContent="flex-start">
            <Button
              size="sm"
              colorScheme={isApplied ? "green" : "blue"}
              leftIcon={isApplied ? <MdCheck /> : undefined}
              isDisabled={isApplied}
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

// ---------------------------------------------------------------------------
// Single organization tab
// ---------------------------------------------------------------------------

function SingleOrgTab() {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(false);
  const { isOpen: isApplyOpen, onOpen: openApply, onClose: closeApply } = useDisclosure();
  const inputRef = useRef(null);
  const dropdownBg = useColorModeValue("white", "gray.800");

  const filtered = query.length >= 1
    ? MOCK_ORGS.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  function selectOrg(org) {
    setSelectedOrg(org);
    setQuery(org.name);
    setShowDropdown(false);
    setResult(null);
    setApplied(false);
  }

  function handleSegment() {
    setIsSegmenting(true);
    setResult(null);
    setApplied(false);
    setTimeout(() => {
      setResult(mockSegmentationResult(selectedOrg));
      setIsSegmenting(false);
    }, 2200);
  }

  return (
    <Box>
      {/* Org search */}
      <Box mb={5} maxW="420px" position="relative">
        <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
          Search for an organization
        </Text>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={MdSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            ref={inputRef}
            placeholder="Organization name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              if (!e.target.value) setSelectedOrg(null);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            autoComplete="off"
          />
        </InputGroup>
        {showDropdown && filtered.length > 0 && (
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
            <List>
              {filtered.map((org) => (
                <ListItem
                  key={org.id}
                  px={3}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: "blue.50" }}
                  onMouseDown={() => selectOrg(org)}
                >
                  <HStack spacing={2}>
                    <Icon as={MdBusiness} color="gray.400" boxSize={4} />
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">{org.name}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {org.currentIndustry} · {org.currentFocus}
                      </Text>
                    </Box>
                  </HStack>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>

      {/* Selected org header + actions */}
      {selectedOrg && (
        <Box>
          <Flex align="center" justify="space-between" mb={4} pb={4} borderBottom="1px solid" borderColor="gray.100">
            <Box>
              <HStack spacing={2} mb={1}>
                <Icon as={MdBusiness} color="blue.500" boxSize={5} />
                <Heading size="md">{selectedOrg.name}</Heading>
              </HStack>
              <Text fontSize="xs" color="gray.500">
                Current: {selectedOrg.currentIndustry} · {selectedOrg.currentFocus}
              </Text>
            </Box>
            <HStack spacing={3}>
              <Button
                size="sm"
                colorScheme="blue"
                leftIcon={<MdAutorenew />}
                onClick={handleSegment}
                isLoading={isSegmenting}
                loadingText="Segmenting…"
                isDisabled={applied}
              >
                Segment Now
              </Button>
              <Tooltip label={!result ? "Run segmentation first" : ""} isDisabled={!!result}>
                <Button
                  size="sm"
                  colorScheme="green"
                  leftIcon={<MdCheck />}
                  isDisabled={!result || applied}
                  onClick={openApply}
                >
                  {applied ? "Applied" : "Apply"}
                </Button>
              </Tooltip>
            </HStack>
          </Flex>

          {applied && (
            <Alert status="success" borderRadius="md" mb={4} size="sm">
              <AlertIcon />
              Segmentation applied to {selectedOrg.name}.
            </Alert>
          )}

          <SegmentCompare
            original={result?.original}
            updated={result?.updated}
            loading={isSegmenting}
          />
          <ReasonsTable reasons={result?.reasons} loading={isSegmenting} />
        </Box>
      )}

      <ApplyModal
        isOpen={isApplyOpen}
        onClose={closeApply}
        onApply={() => setApplied(true)}
        orgName={selectedOrg?.name ?? ""}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// List organizations tab
// ---------------------------------------------------------------------------

function ListOrgsTab() {
  const [selectedListId, setSelectedListId] = useState("");
  const [segmentingIds, setSegmentingIds] = useState(new Set());
  const [results, setResults] = useState({});
  const [applied, setApplied] = useState(new Set());
  const [reviewOrg, setReviewOrg] = useState(null);
  const { isOpen: isApplyOpen, onOpen: openApply, onClose: closeApply } = useDisclosure();
  const { isOpen: isReviewOpen, onOpen: openReview, onClose: closeReview } = useDisclosure();
  const [pendingApplyOrg, setPendingApplyOrg] = useState(null);

  const headerBg = useColorModeValue("gray.50", "gray.700");
  const appliedRowBg = useColorModeValue("green.50", "green.900");

  const selectedList = MOCK_LISTS.find((l) => l.id === selectedListId);
  const orgs = selectedListId ? (LIST_ORGS[selectedListId] ?? []) : [];

  function runSegmentation(orgId) {
    const org = orgs.find((o) => o.id === orgId);
    if (!org) return;
    setSegmentingIds((prev) => new Set([...prev, orgId]));
    setTimeout(() => {
      setResults((prev) => ({ ...prev, [orgId]: mockSegmentationResult(org) }));
      setSegmentingIds((prev) => {
        const next = new Set(prev);
        next.delete(orgId);
        return next;
      });
    }, 1800 + Math.random() * 800);
  }

  function runAll() {
    orgs.forEach((org) => {
      if (!results[org.id] && !segmentingIds.has(org.id)) {
        setTimeout(() => runSegmentation(org.id), Math.random() * 400);
      }
    });
  }

  function startApply(org) {
    setPendingApplyOrg(org);
    openApply();
  }

  function handleApplied() {
    if (pendingApplyOrg) {
      setApplied((prev) => new Set([...prev, pendingApplyOrg.id]));
      setPendingApplyOrg(null);
    }
  }

  function handleReviewApplied() {
    if (reviewOrg) {
      setApplied((prev) => new Set([...prev, reviewOrg.id]));
    }
  }

  function openReviewFor(org) {
    setReviewOrg(org);
    openReview();
  }

  return (
    <Box>
      {/* List selector + upload */}
      <Flex align="flex-end" gap={4} mb={6} flexWrap="wrap">
        <Box flex="1" minW="220px" maxW="380px">
          <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
            Select a list
          </Text>
          <Select
            placeholder="Choose a list…"
            value={selectedListId}
            onChange={(e) => {
              setSelectedListId(e.target.value);
              setSegmentingIds(new Set());
              setResults({});
              setApplied(new Set());
              setReviewOrg(null);
            }}
            size="sm"
          >
            {MOCK_LISTS.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.count} orgs)
              </option>
            ))}
          </Select>
        </Box>
        <Button
          size="sm"
          leftIcon={<Icon as={MdUpload} />}
          variant="outline"
          colorScheme="gray"
          onClick={() => alert("Upload list — not yet implemented")}
        >
          Upload List
        </Button>
      </Flex>

      {selectedList && (
        <Box>
          <Flex justify="space-between" align="center" mb={3}>
            <Box>
              <Heading size="sm">{selectedList.name}</Heading>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                {orgs.length} organizations · type: {selectedList.type} · subtype: {selectedList.subtype}
              </Text>
            </Box>
            <Button
              size="sm"
              colorScheme="blue"
              leftIcon={<MdAutorenew />}
              onClick={runAll}
              isDisabled={orgs.every((o) => results[o.id] || segmentingIds.has(o.id))}
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
                {orgs.map((org) => {
                  const isSegmenting = segmentingIds.has(org.id);
                  const result = results[org.id];
                  const isApplied = applied.has(org.id);
                  const hasResult = !!result;

                  return (
                    <Tr key={org.id} bg={isApplied ? appliedRowBg : undefined} opacity={isApplied ? 0.75 : 1}>
                      <Td fontWeight="medium" fontSize="sm">
                        <HStack spacing={1}>
                          <Icon as={MdBusiness} color="gray.400" boxSize={3.5} />
                          <Text>{org.name}</Text>
                        </HStack>
                      </Td>
                      <Td fontSize="xs" color="gray.600">{org.currentIndustry}</Td>
                      <Td fontSize="xs" color="gray.600">{org.currentFocus}</Td>
                      <Td>
                        {isSegmenting ? (
                          <Skeleton height="20px" width="120px" startColor="blue.100" endColor="blue.300" />
                        ) : hasResult ? (
                          <Tag size="sm" colorScheme="green" borderRadius="full">
                            <TagLabel>{result.updated.industry}</TagLabel>
                          </Tag>
                        ) : (
                          <Text fontSize="xs" color="gray.300">—</Text>
                        )}
                      </Td>
                      <Td>
                        {isSegmenting ? (
                          <Skeleton height="20px" width="100px" startColor="blue.100" endColor="blue.300" />
                        ) : hasResult ? (
                          <Tag size="sm" colorScheme="green" borderRadius="full">
                            <TagLabel>{result.updated.focus}</TagLabel>
                          </Tag>
                        ) : (
                          <Text fontSize="xs" color="gray.300">—</Text>
                        )}
                      </Td>
                      <Td>
                        <Button
                          size="xs"
                          colorScheme="blue"
                          leftIcon={<MdAutorenew />}
                          onClick={() => runSegmentation(org.id)}
                          isLoading={isSegmenting}
                          isDisabled={isApplied}
                          variant="outline"
                        >
                          Segment
                        </Button>
                      </Td>
                      <Td>
                        <Tooltip label={!hasResult ? "Segment first" : ""} isDisabled={hasResult}>
                          <Button
                            size="xs"
                            leftIcon={<MdVisibility />}
                            isDisabled={!hasResult}
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
                          label={!hasResult ? "Segment first" : isApplied ? "Already applied" : ""}
                          isDisabled={hasResult && !isApplied}
                        >
                          <Button
                            size="xs"
                            leftIcon={isApplied ? <MdCheck /> : undefined}
                            colorScheme={isApplied ? "green" : "blue"}
                            isDisabled={!hasResult || isApplied}
                            onClick={() => startApply(org)}
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
      )}

      {/* Apply modal for table-row apply button */}
      <ApplyModal
        isOpen={isApplyOpen}
        onClose={closeApply}
        onApply={handleApplied}
        orgName={pendingApplyOrg?.name ?? ""}
      />

      {/* Review drawer — slides in from right, keeps table in view */}
      <ReviewDrawer
        isOpen={isReviewOpen}
        onClose={closeReview}
        org={reviewOrg}
        result={reviewOrg ? results[reviewOrg.id] : null}
        onApply={handleReviewApplied}
        isApplied={reviewOrg ? applied.has(reviewOrg.id) : false}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DesignToolsResegmentationPage() {
  return (
    <Box>
      <Heading size="md" mb={1}>Resegmentation</Heading>
      <Text color="gray.500" fontSize="sm" mb={6}>
        Re-run organization segmentation to update industry and focus classifications.
      </Text>

      <Tabs colorScheme="blue" variant="enclosed">
        <TabList>
          <Tab>Single Organization</Tab>
          <Tab>List of Organizations</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={5}>
            <SingleOrgTab />
          </TabPanel>
          <TabPanel px={0} pt={5}>
            <ListOrgsTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
