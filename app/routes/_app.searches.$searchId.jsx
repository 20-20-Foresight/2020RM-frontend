import {
  Badge,
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link as ChakraLink,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tabs,
  VStack
} from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation, useNavigate, useSearchParams } from "@remix-run/react";
import { FiArrowLeft, FiDownload, FiExternalLink, FiFileText, FiMail, FiMapPin, FiPhone, FiSettings, FiUpload } from "react-icons/fi";
import { MilestoneChevrons } from "../components/MilestoneChevrons";
import { loadEsClientSearchDetail } from "../models/es-client.server";

const CLIENT_MILESTONES = [
  { key: "agreement", label: "Agreement", shortLabel: "Agreement" },
  { key: "job_description", label: "Job Description", shortLabel: "Job Description" },
  { key: "sourcing", label: "Sourcing", shortLabel: "Sourcing" },
  { key: "presentations", label: "Presentations", shortLabel: "Presentations" },
  { key: "interviews", label: "Interviews", shortLabel: "Interviews" },
  { key: "offer", label: "Offer", shortLabel: "Offer" },
  { key: "complete", label: "Complete", shortLabel: "Complete" }
];

export async function loader({ request, params }) {
  const url = new URL(request.url);
  return json(await loadEsClientSearchDetail({
    request,
    searchId: params.searchId,
    selectedJobDescriptionId: url.searchParams.get("jd")
  }));
}

function ContactBlock({ label, contact }) {
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={5} py={4} shadow="sm">
      <Text color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em">{label}</Text>
      <Text color="gray.900" fontSize="lg" mt={1} fontWeight="semibold">{contact?.name || "TBD"}</Text>
      {contact?.email ? (
        <ChakraLink href={`mailto:${contact.email}`} color="blue.600" display="inline-flex" alignItems="center" gap={2} mt={2}>
          <FiMail />
          {contact.email}
        </ChakraLink>
      ) : null}
      {contact?.phone ? (
        <HStack spacing={2} mt={2} color="gray.600">
          <FiPhone />
          <Text>{contact.phone}</Text>
        </HStack>
      ) : null}
    </Box>
  );
}

function EmbeddedDocument({ document, emptyText }) {
  if (!document) {
    return (
      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6}>
        <Text color="gray.500" fontSize="sm">{emptyText}</Text>
      </Box>
    );
  }

  const isPdf = document.mimeType === "application/pdf";

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
        <Box as="iframe" title={document.title} src={document.href} w="100%" minH="880px" border="0" bg="white" />
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

function HtmlPreview({ html, emptyText }) {
  if (!html) {
    return (
      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6}>
        <Text color="gray.500" fontSize="sm">{emptyText}</Text>
      </Box>
    );
  }

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      overflow="hidden"
      shadow="sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function getClientMilestoneIndex(search, agreementCount) {
  const activePhaseIndex = Number.isInteger(search?.activePhaseIndex) ? search.activePhaseIndex : 0;

  if (search?.status === "placed") {
    return 6;
  }
  if (activePhaseIndex >= 6) {
    return 5;
  }
  if (activePhaseIndex >= 5) {
    return 4;
  }
  if (activePhaseIndex >= 4) {
    return 3;
  }
  if (activePhaseIndex >= 2) {
    return 2;
  }
  if ((search?.jobDescriptionDocuments?.length || 0) > 0) {
    return 1;
  }
  if (agreementCount > 0) {
    return 0;
  }
  return 0;
}

export default function EsClientSearchDetailPage() {
  const data = useLoaderData();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const search = data?.search || null;

  if (!search) {
    return (
      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={10}>
        <Heading size="md">Search not found</Heading>
        <Text color="gray.600" mt={2}>This client-facing search record is not available.</Text>
      </Box>
    );
  }

  const candidates = Array.isArray(search.candidates) ? search.candidates : [];
  const selectedJobDescriptionDocument = data?.selectedJobDescriptionDocument || search.jobDescriptionDocuments?.[0] || null;
  const clientMilestoneIndex = getClientMilestoneIndex(search, data.agreements?.length || 0);
  const currentMilestone = CLIENT_MILESTONES[clientMilestoneIndex] || null;
  const selectedJobDescriptionId = data?.selectedJobDescriptionId || selectedJobDescriptionDocument?.id || "";
  const isCandidateDrillIn = location.pathname.includes(`/searches/${search.id}/candidates/`);

  function handleJobDescriptionChange(event) {
    const nextId = event.target.value;
    const nextParams = new URLSearchParams(searchParams);
    if (nextId) {
      nextParams.set("jd", nextId);
    } else {
      nextParams.delete("jd");
    }
    navigate(`?${nextParams.toString()}`);
  }

  if (isCandidateDrillIn) {
    return <Outlet />;
  }

  return (
    <VStack align="stretch" spacing={6}>
      <HStack spacing={3}>
        <Button as={Link} to={search.status === "active" ? "/jobs/all-es-jobs" : "/jobs/completed-searches"} size="sm" variant="ghost" leftIcon={<FiArrowLeft />}>
          Back to {search.status === "active" ? "Active Searches" : "Completed Searches"}
        </Button>
      </HStack>

      <Box borderRadius="2xl" overflow="hidden" borderWidth="1px" borderColor="#d6dde8" bg="linear-gradient(180deg, #f8fbff 0%, #ffffff 55%)" shadow="sm">
        <Box px={{ base: 5, md: 8 }} py={{ base: 6, md: 8 }}>
          <Heading size="2xl" color="gray.900">{search.title}</Heading>
          {search.location ? (
            <HStack mt={3} spacing={2} color="gray.600">
              <Icon as={FiMapPin} />
              <Text>{search.location}</Text>
            </HStack>
          ) : null}

          <Box mt={6}>
            <MilestoneChevrons milestones={CLIENT_MILESTONES} activeIndex={clientMilestoneIndex} size="md" />
          </Box>
        </Box>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={5} py={4} shadow="sm">
          <Text color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em">Current Phase</Text>
          <Text color="gray.900" fontSize="lg" mt={1} fontWeight="semibold">{currentMilestone?.label || "Unknown"}</Text>
        </Box>
        <ContactBlock label="Lead Recruiter" contact={search.recruiterContact} />
        <ContactBlock label="Client Manager" contact={search.clientManagerContact} />
      </SimpleGrid>

      <Tabs colorScheme="blue" variant="unstyled">
        <TabList borderBottomWidth="1px" borderColor="gray.200" gap={6}>
          <Tab px={0} py={3} fontWeight="semibold" color="gray.600" _selected={{ color: "blue.700", borderBottom: "2px solid", borderColor: "blue.700" }}>
            Job Description
          </Tab>
          <Tab px={0} py={3} fontWeight="semibold" color="gray.600" _selected={{ color: "blue.700", borderBottom: "2px solid", borderColor: "blue.700" }}>
            Candidates
          </Tab>
          <Tab px={0} py={3} fontWeight="semibold" color="gray.600" _selected={{ color: "blue.700", borderBottom: "2px solid", borderColor: "blue.700" }}>
            Agreements
          </Tab>
        </TabList>

        <TabPanels px={0}>
          <TabPanel px={0} pt={5}>
            <VStack align="stretch" spacing={4}>
              <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={5} shadow="sm">
                <HStack justify="space-between" align="flex-start" spacing={4}>
                  <Box flex="1" maxW="540px">
                    <Select
                      value={selectedJobDescriptionId}
                      onChange={handleJobDescriptionChange}
                      bg="white"
                      borderColor="gray.200"
                    >
                      {search.jobDescriptionDocuments?.map((document) => (
                        <option key={document.id} value={document.id}>
                          {`${document.downloadName || document.title} | ${document.modifiedAt ? new Date(document.modifiedAt).toLocaleDateString("en-US") : "No date"}`}
                        </option>
                      ))}
                    </Select>
                  </Box>

                  <Menu placement="bottom-end">
                    <MenuButton
                      as={IconButton}
                      aria-label="Job description actions"
                      icon={<FiSettings />}
                      variant="outline"
                    />
                    <MenuList>
                      <MenuItem
                        as={Link}
                        to={selectedJobDescriptionDocument?.fileExtension === "pdf" ? selectedJobDescriptionDocument.href : "#"}
                        target={selectedJobDescriptionDocument?.fileExtension === "pdf" ? "_blank" : undefined}
                        rel={selectedJobDescriptionDocument?.fileExtension === "pdf" ? "noreferrer" : undefined}
                        icon={<FiDownload />}
                        isDisabled={selectedJobDescriptionDocument?.fileExtension !== "pdf"}
                      >
                        Download PDF
                      </MenuItem>
                      <MenuItem
                        as={Link}
                        to={selectedJobDescriptionDocument?.fileExtension === "docx" ? selectedJobDescriptionDocument.href : "#"}
                        target={selectedJobDescriptionDocument?.fileExtension === "docx" ? "_blank" : undefined}
                        rel={selectedJobDescriptionDocument?.fileExtension === "docx" ? "noreferrer" : undefined}
                        icon={<FiDownload />}
                        isDisabled={selectedJobDescriptionDocument?.fileExtension !== "docx"}
                      >
                        Download DOCX
                      </MenuItem>
                      <MenuItem icon={<FiUpload />} isDisabled>
                        Upload New Version
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>
                {selectedJobDescriptionDocument ? (
                  <Text mt={3} color="gray.500" fontSize="sm">
                    Viewing {selectedJobDescriptionDocument.title}
                  </Text>
                ) : (
                  <Text mt={3} color="gray.500" fontSize="sm">No job description was provided for this search.</Text>
                )}
              </Box>

              <HtmlPreview
                html={data?.jobDescriptionPreview?.html || ""}
                emptyText="No job description was provided for this search."
              />
            </VStack>
          </TabPanel>

          <TabPanel px={0} pt={5}>
            <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
              <Heading size="md" mb={4}>Candidates</Heading>
              {candidates.length ? (
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Status</Th>
                      <Th>Summary</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {candidates.map((candidate) => (
                      <Tr key={candidate.id}>
                        <Td>
                          <VStack align="start" spacing={0}>
                            <ChakraLink as={Link} to={candidate.detailUrl} color="blue.700" fontWeight="semibold">
                              {candidate.name}
                            </ChakraLink>
                            {candidate.title ? <Text fontSize="sm" color="gray.500">{candidate.title}</Text> : null}
                          </VStack>
                        </Td>
                        <Td>
                          <Badge colorScheme={
                            candidate.status === "Placed" ? "green" :
                            candidate.status === "Offer" ? "orange" :
                            candidate.status === "Short List" ? "blue" :
                            candidate.status === "Interviewed" ? "purple" :
                            candidate.status === "Rejected" ? "red" :
                            "gray"
                          }>
                            {candidate.status}
                          </Badge>
                        </Td>
                        <Td>
                          <Text color="gray.700" fontSize="sm">{candidate.summary}</Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Text color="gray.500" fontSize="sm">No candidate records are attached yet for this search.</Text>
              )}
            </Box>
          </TabPanel>

          <TabPanel px={0} pt={5}>
            <Grid templateColumns={{ base: "1fr", xl: "0.95fr 1.05fr" }} gap={4}>
              <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
                <Heading size="md" mb={4}>Agreement Files</Heading>
                <VStack align="stretch" spacing={3}>
                  {data.agreements?.length ? data.agreements.map((agreement) => (
                    <Box key={agreement.id} borderWidth="1px" borderColor="gray.100" borderRadius="lg" p={4}>
                      <HStack justify="space-between" align="flex-start">
                        <Box>
                          <HStack spacing={2} mb={2}>
                            <Badge colorScheme={agreement.status === "executed" ? "green" : "blue"}>{agreement.status}</Badge>
                          </HStack>
                          <Text fontWeight="semibold" color="gray.900">{agreement.title}</Text>
                          {agreement.description ? <Text mt={1} fontSize="sm" color="gray.600">{agreement.description}</Text> : null}
                        </Box>
                        <Icon as={FiFileText} color="gray.400" />
                      </HStack>
                      {agreement.document?.href ? (
                        <ChakraLink as={Link} to={agreement.document.href} target="_blank" rel="noreferrer" mt={3} display="inline-flex" alignItems="center" gap={2} color="blue.600" fontWeight="medium">
                          Open Document <FiExternalLink />
                        </ChakraLink>
                      ) : null}
                    </Box>
                  )) : (
                    <Text color="gray.500" fontSize="sm">No agreements were provided for this search.</Text>
                  )}
                </VStack>
              </Box>

              <EmbeddedDocument
                document={data.agreements?.[0]?.document || null}
                emptyText="No agreement was provided for this search."
              />
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}
