import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Grid,
  Heading,
  HStack,
  Icon,
  Input,
  Link as ChakraLink,
  Select,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  Wrap,
  WrapItem,
  VStack
} from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { FiArrowLeft, FiBriefcase, FiCalendar, FiExternalLink, FiMapPin, FiMonitor, FiPlus, FiTrash2, FiVideo } from "react-icons/fi";
import { loadEsClientCandidateDetail } from "../models/es-client.server";

const DOCUMENT_KIND_ORDER = [
  "presentation",
  "resume",
  "deep_dive",
  "deal_sheet",
  "skills_checklist",
  "pertinent_information",
  "achiever_results",
  "project_list",
  "supporting"
];

const REJECT_REASONS = [
  "Does not seem qualified",
  "Interviewed Previously, did not like",
  "Not professional enough"
];
const INTERVIEW_PREFERENCES = [
  { key: "zoom", label: "Zoom", icon: FiVideo },
  { key: "teams", label: "Teams", icon: FiMonitor }
];
const TIME_OPTIONS = [
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM"
];

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDateValue() {
  return formatDateInputValue(new Date());
}

function getNextTwoWeekSuggestions() {
  const today = new Date();
  const suggestions = [];
  let dayOffset = 0;

  while (suggestions.length < 5) {
    const next = new Date(today);
    next.setDate(today.getDate() + dayOffset);
    dayOffset += 1;

    const dayOfWeek = next.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    suggestions.push({
      value: formatDateInputValue(next),
      label: next.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric"
      })
    });
  }

  return suggestions;
}

function createAvailabilityRow() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: getTodayDateValue(),
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago"
  };
}

function getCandidateDemoLocation(searchId) {
  if (searchId === "vp-of-land-sales-head-of-land-acquisition") {
    return "Chicago, IL";
  }
  if (searchId === "regional-fm-manager-az") {
    return "Phoenix, AZ";
  }
  if (searchId === "cfo") {
    return "Chicago, IL";
  }
  if (searchId === "vp-of-investor-relations") {
    return "New York, NY";
  }
  return "Chicago, IL";
}

function getCandidateDemoTitle(searchId) {
  if (searchId === "vp-of-land-sales-head-of-land-acquisition") {
    return "VP of Land Acquisition";
  }
  if (searchId === "regional-fm-manager-az") {
    return "Regional Facilities Manager";
  }
  if (searchId === "cfo") {
    return "Chief Financial Officer";
  }
  if (searchId === "vp-of-investor-relations") {
    return "VP of Investor Relations";
  }
  return "Executive";
}

export async function loader({ request, params }) {
  return json(await loadEsClientCandidateDetail({
    request,
    searchId: params.searchId,
    candidateId: params.candidateId
  }));
}

function CandidateDocumentPanel({ document }) {
  const isPdf = document?.mimeType === "application/pdf";

  if (!document) {
    return (
      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6}>
        <Text color="gray.500" fontSize="sm">No document is available for this tab.</Text>
      </Box>
    );
  }

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden" shadow="sm">
      <HStack justify="space-between" px={5} py={4} borderBottomWidth="1px" borderColor="gray.100">
        <Box>
          <Text fontWeight="semibold" color="gray.900">{document.title}</Text>
          {document.downloadName ? <Text fontSize="sm" color="gray.500">{document.downloadName}</Text> : null}
        </Box>
        <Button as={Link} to={document.href} target="_blank" rel="noreferrer" size="sm" variant="outline" leftIcon={<FiExternalLink />}>
          Open File
        </Button>
      </HStack>
      {isPdf ? (
        <Box as="iframe" title={document.title} src={document.href} w="100%" minH="900px" border="0" bg="white" />
      ) : (
        <Box px={5} py={8}>
          <Text color="gray.600">
            Inline preview is not available for this file type yet. Use <ChakraLink as={Link} to={document.href} target="_blank" rel="noreferrer" color="blue.600">Open File</ChakraLink> to view it.
          </Text>
        </Box>
      )}
    </Box>
  );
}

function CandidateStatusBadge({ status }) {
  return (
    <Badge colorScheme={
      status === "Placed" ? "green" :
      status === "Offer" ? "orange" :
      status === "Short List" ? "blue" :
      status === "Interviewed" ? "purple" :
      status === "Rejected" ? "red" :
      "gray"
    }>
      {status}
    </Badge>
  );
}

export default function EsClientCandidateDetailPage() {
  const data = useLoaderData();
  const search = data?.search || null;
  const candidate = data?.candidate || null;
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [rejectNotes, setRejectNotes] = useState("");
  const [interviewPreference, setInterviewPreference] = useState("zoom");
  const [availabilityRows, setAvailabilityRows] = useState([createAvailabilityRow()]);
  const [interviewNotes, setInterviewNotes] = useState("");
  const demoLocation = candidate.location || getCandidateDemoLocation(search.id);
  const demoTitle = candidate.title && candidate.title !== "Candidate"
    ? candidate.title
    : getCandidateDemoTitle(search.id);
  const dateSuggestions = getNextTwoWeekSuggestions();

  function updateAvailabilityRow(rowId, field, value) {
    setAvailabilityRows((current) => current.map((row) => (
      row.id === rowId ? { ...row, [field]: value } : row
    )));
  }

  function addAvailabilityRow() {
    setAvailabilityRows((current) => [...current, createAvailabilityRow()]);
  }

  function removeAvailabilityRow(rowId) {
    setAvailabilityRows((current) => current.length > 1 ? current.filter((row) => row.id !== rowId) : current);
  }

  if (!search || !candidate) {
    return (
      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={10}>
        <Heading size="md">Candidate not found</Heading>
        <Text color="gray.600" mt={2}>This candidate record is not available.</Text>
      </Box>
    );
  }

  const orderedSections = DOCUMENT_KIND_ORDER
    .map((kind) => ({
      kind,
      documents: Array.isArray(candidate.documentsByKind?.[kind]) ? candidate.documentsByKind[kind] : []
    }))
    .filter((section) => section.documents.length > 0);

  return (
    <VStack align="stretch" spacing={6}>
      <HStack spacing={3}>
        <Button as={Link} to={search.detailUrl} size="sm" variant="ghost" leftIcon={<FiArrowLeft />}>
          Back to {search.title}
        </Button>
      </HStack>

      <Grid templateColumns={{ base: "1fr", xl: "8fr 2fr" }} gap={4}>
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="2xl" p={{ base: 5, md: 8 }} shadow="sm">
          <Heading size="2xl" color="gray.900">{candidate.name}</Heading>
          <HStack mt={3} spacing={3} color="gray.600" flexWrap="wrap">
            <CandidateStatusBadge status={candidate.status} />
            {demoLocation ? (
              <HStack spacing={2}>
                <Icon as={FiMapPin} />
                <Text>{demoLocation}</Text>
              </HStack>
            ) : null}
            {demoTitle ? (
              <HStack spacing={2}>
                <Icon as={FiBriefcase} />
                <Text>{demoTitle}</Text>
              </HStack>
            ) : null}
          </HStack>
          {candidate.summary ? <Text mt={4} color="gray.700" maxW="3xl">{candidate.summary}</Text> : null}
        </Box>

        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="2xl" p={5} shadow="sm">
          <VStack align="stretch" spacing={3}>
            <Button size="sm" colorScheme="blue" onClick={() => setIsInterviewOpen(true)}>
              Schedule Interview
            </Button>
            <Button size="sm" variant="outline" colorScheme="green" onClick={() => setIsOfferOpen(true)}>
              Make Offer
            </Button>
            <Button size="sm" variant="outline" colorScheme="red" onClick={() => setIsRejectOpen(true)}>
              Reject
            </Button>
          </VStack>
        </Box>
      </Grid>

      <Tabs colorScheme="blue" variant="unstyled">
        <TabList borderBottomWidth="1px" borderColor="gray.200" gap={6} overflowX="auto">
          {orderedSections.map((section) => (
            <Tab
              key={section.kind}
              px={0}
              py={3}
              fontWeight="semibold"
              color="gray.600"
              _selected={{ color: "blue.700", borderBottom: "2px solid", borderColor: "blue.700" }}
            >
              {section.documents[0]?.label || "Document"}
            </Tab>
          ))}
          <Tab
            px={0}
            py={3}
            fontWeight="semibold"
            color="gray.600"
            _selected={{ color: "blue.700", borderBottom: "2px solid", borderColor: "blue.700" }}
          >
            Notes
          </Tab>
        </TabList>
        <TabPanels px={0}>
          {orderedSections.map((section) => (
            <TabPanel key={section.kind} px={0} pt={5}>
              <CandidateDocumentPanel document={section.documents[0]} />
            </TabPanel>
          ))}
          <TabPanel px={0} pt={5}>
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
              <Heading size="md" mb={4}>Notes</Heading>
              <VStack align="stretch" spacing={4}>
                <Box borderWidth="1px" borderColor="gray.100" borderRadius="lg" p={4}>
                  <Text fontWeight="semibold" color="gray.900">Peter Weyland</Text>
                  <Text fontSize="sm" color="gray.500" mt={1}>June 19, 2026 at 8:15 AM</Text>
                  <Text mt={3} color="gray.700">TBD</Text>
                </Box>
                <Box borderWidth="1px" borderColor="gray.100" borderRadius="lg" p={4}>
                  <Text fontWeight="semibold" color="gray.900">Dan Morgan</Text>
                  <Text fontSize="sm" color="gray.500" mt={1}>June 19, 2026 at 8:21 AM</Text>
                  <Text mt={3} color="gray.700">TBD</Text>
                </Box>
              </VStack>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Drawer isOpen={isInterviewOpen} onClose={() => setIsInterviewOpen(false)} placement="right" size="xl">
        <DrawerOverlay />
        <DrawerContent maxW={{ base: "100vw", lg: "66vw" }}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Schedule Interview</DrawerHeader>
          <DrawerBody py={6}>
            <VStack align="stretch" spacing={6}>
              <Box>
                <Text fontWeight="semibold" color="gray.900" mb={3}>Preference</Text>
                <HStack spacing={3} align="stretch">
                  {INTERVIEW_PREFERENCES.map((preference) => {
                    const isSelected = interviewPreference === preference.key;
                    return (
                      <Button
                        key={preference.key}
                        variant="outline"
                        borderColor="#2B6CB0"
                        color="#1E4E8C"
                        bg={isSelected ? "#E7F1FF" : "white"}
                        _hover={{ bg: isSelected ? "#D9EAFE" : "#F5FAFF", borderColor: "#2C5282" }}
                        _active={{ bg: "#D9EAFE" }}
                        leftIcon={<Icon as={preference.icon} />}
                        onClick={() => setInterviewPreference(preference.key)}
                      >
                        {preference.label}
                      </Button>
                    );
                  })}
                </HStack>
              </Box>

              <Box>
                <HStack justify="space-between" mb={3}>
                  <Text fontWeight="semibold" color="gray.900">Available Times</Text>
                  <Button size="sm" variant="outline" leftIcon={<FiPlus />} onClick={addAvailabilityRow}>
                    Add Time
                  </Button>
                </HStack>

                <VStack align="stretch" spacing={4}>
                  {availabilityRows.map((row) => (
                    <Box key={row.id} borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between" align="flex-start">
                          <Box flex="1">
                            <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Suggested Dates</Text>
                            <Wrap spacing={2}>
                              {dateSuggestions.map((suggestion) => {
                                const isSelected = row.date === suggestion.value;
                                return (
                                  <WrapItem key={suggestion.value}>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      borderColor={isSelected ? "#2B6CB0" : "gray.200"}
                                      color={isSelected ? "#1E4E8C" : "gray.600"}
                                      bg={isSelected ? "#E7F1FF" : "#F8FAFC"}
                                      leftIcon={<FiCalendar />}
                                      onClick={() => updateAvailabilityRow(row.id, "date", suggestion.value)}
                                    >
                                      {suggestion.label}
                                    </Button>
                                  </WrapItem>
                                );
                              })}
                            </Wrap>
                          </Box>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            leftIcon={<FiTrash2 />}
                            onClick={() => removeAvailabilityRow(row.id)}
                            isDisabled={availabilityRows.length === 1}
                          >
                            Remove
                          </Button>
                        </HStack>

                        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3}>
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Date</Text>
                            <Input
                              type="date"
                              value={row.date}
                              min={getTodayDateValue()}
                              onChange={(event) => updateAvailabilityRow(row.id, "date", event.target.value)}
                            />
                          </Box>
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Start</Text>
                            <Select value={row.startTime} onChange={(event) => updateAvailabilityRow(row.id, "startTime", event.target.value)}>
                              {TIME_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </Select>
                          </Box>
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>End</Text>
                            <Select value={row.endTime} onChange={(event) => updateAvailabilityRow(row.id, "endTime", event.target.value)}>
                              {TIME_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </Select>
                          </Box>
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Time Zone</Text>
                            <Select value={row.timezone} onChange={(event) => updateAvailabilityRow(row.id, "timezone", event.target.value)}>
                              {[
                                row.timezone,
                                "America/Chicago",
                                "America/New_York",
                                "America/Denver",
                                "America/Los_Angeles",
                                "UTC"
                              ].filter((value, index, array) => array.indexOf(value) === index).map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </Select>
                          </Box>
                        </SimpleGrid>
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </Box>

              <Box>
                <Text fontWeight="semibold" color="gray.900" mb={3}>Note</Text>
                <Textarea
                  value={interviewNotes}
                  onChange={(event) => setInterviewNotes(event.target.value)}
                  minH="180px"
                  placeholder="Add scheduling notes here..."
                />
              </Box>

              <HStack justify="flex-end">
                <Button variant="ghost" onClick={() => setIsInterviewOpen(false)}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={() => setIsInterviewOpen(false)}>
                  Schedule
                </Button>
              </HStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={isOfferOpen} onClose={() => setIsOfferOpen(false)} placement="right" size="xl">
        <DrawerOverlay />
        <DrawerContent maxW={{ base: "100vw", lg: "66vw" }}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Make Offer</DrawerHeader>
          <DrawerBody py={6}>
            <Text color="gray.700">TBD</Text>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} placement="right" size="xl">
        <DrawerOverlay />
        <DrawerContent maxW={{ base: "100vw", lg: "66vw" }}>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Reject Candidate</DrawerHeader>
          <DrawerBody py={6}>
            <VStack align="stretch" spacing={6}>
              <Box>
                <Text fontWeight="semibold" color="gray.900" mb={3}>Reason</Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {REJECT_REASONS.map((reason) => {
                    const isSelected = rejectReason === reason;
                    return (
                      <Button
                        key={reason}
                        variant="outline"
                        borderColor="#D14343"
                        color="#9B2C2C"
                        bg={isSelected ? "#FCE8E8" : "white"}
                        _hover={{ bg: isSelected ? "#FADCDC" : "#FFF5F5", borderColor: "#C53030" }}
                        _active={{ bg: "#FADCDC" }}
                        justifyContent="flex-start"
                        whiteSpace="normal"
                        h="auto"
                        minH="52px"
                        py={3}
                        onClick={() => setRejectReason(reason)}
                      >
                        {reason}
                      </Button>
                    );
                  })}
                </SimpleGrid>
              </Box>

              <Box>
                <Text fontWeight="semibold" color="gray.900" mb={3}>Additional Feedback</Text>
                <Textarea
                  value={rejectNotes}
                  onChange={(event) => setRejectNotes(event.target.value)}
                  minH="180px"
                  placeholder="Add more context here..."
                />
              </Box>

              <HStack justify="flex-end">
                <Button variant="ghost" onClick={() => setIsRejectOpen(false)}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={() => setIsRejectOpen(false)}>
                  Save
                </Button>
              </HStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </VStack>
  );
}
