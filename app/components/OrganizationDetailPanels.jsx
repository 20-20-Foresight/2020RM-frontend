import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Link as ChakraLink,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack
} from "@chakra-ui/react";
import { Link as RemixLink, useRevalidator } from "@remix-run/react";
import { FaLinkedin } from "react-icons/fa";
import {
  FiArrowUpRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiSearch,
  FiUsers
} from "react-icons/fi";
import {
  MdBusiness,
  MdCalendarToday,
  MdCampaign,
  MdGroups,
  MdPayments,
  MdWorkOutline
} from "react-icons/md";
import {
  buildOrganizationHeaderViewModel,
  buildOrganizationLocationsViewModel,
  buildOrganizationOverviewViewModel
} from "../models/organization-detail-view.mjs";
import {
  getSearchResultFieldValue,
  resolveSchemaFieldPath
} from "../models/search-result.mjs";
import { buildEntityDetailPath } from "../models/entity-route.mjs";
import { OrganizationResegmentationFlyout } from "./OrganizationResegmentationFlyout.jsx";

const BRAND_BLUE = "#0F4C81";
const BORDER_COLOR = "#D7DFEC";
const PAGE_BG = "#F8FAFC";
const CARD_BG = "white";

const CONTACT_TITLE_PATHS = [
  "metadata.title",
  "metadata.jobtitle",
  "metadata.job_title",
  "metadata.position",
  "title"
];

const CONTACT_LEVEL_PATHS = [
  "metadata.level",
  "metadata.seniority",
  "metadata.seniority_level"
];

const CONTACT_EMAIL_PATH_GROUPS = [
  {
    label: "Primary",
    paths: [
      "metadata.primaryemail",
      "metadata.workemail",
      "metadata.email.work"
    ]
  },
  {
    label: "Secondary",
    paths: [
      "metadata.email.personal",
      "metadata.personalemail",
      "metadata.email"
    ]
  }
];

const PLACEHOLDER_NOTES = [
  {
    title: "Placeholder note",
    subtitle: "CRM Layout Placeholder",
    timestamp: "Awaiting note sync",
    body:
      "Internal organization notes are not connected yet. This card is here to hold the stitched layout until note storage and visibility rules are wired in.",
    tags: ["Placeholder", "Notes"]
  },
  {
    title: "Visibility rules pending",
    subtitle: "CRM Layout Placeholder",
    timestamp: "Awaiting note sync",
    body:
      "We can add role-aware note visibility in a later pass. For now this section is intentionally styled and populated with neutral placeholder content only.",
    tags: ["Visibility", "Placeholder"]
  }
];

/**
 * Renders one shared white surface card used across the organization detail tabs.
 * @param {{
 *   children?: import("react").ReactNode,
 *   p?: object|number|string,
 *   minH?: string|number,
 *   gridColumn?: object|string
 * }} props
 * @returns {JSX.Element}
 */
function SurfaceCard({ children = null, p = { base: 5, md: 6 }, minH = "auto", gridColumn = "auto" }) {
  return (
    <Box
      bg={CARD_BG}
      borderWidth="1px"
      borderColor={BORDER_COLOR}
      borderRadius="20px"
      shadow="sm"
      p={p}
      minH={minH}
      gridColumn={gridColumn}
    >
      {children}
    </Box>
  );
}

/**
 * Renders one compact statistic card.
 * @param {{
 *   label: string,
 *   value: string,
 *   icon: import("react").ElementType
 * }} props
 * @returns {JSX.Element}
 */
function OverviewStatCard({ label, value, icon }) {
  return (
    <SurfaceCard p={{ base: 4, md: 5 }}>
      <Text
        fontSize="xs"
        fontWeight="bold"
        textTransform="uppercase"
        letterSpacing="0.08em"
        color="gray.500"
      >
        {label}
      </Text>
      <HStack spacing={3} mt={3} align="flex-start">
        <Icon as={icon} color={BRAND_BLUE} boxSize={5} mt={1} />
        <Text fontSize="2xl" lineHeight="shorter" fontWeight="semibold" color="gray.900">
          {value}
        </Text>
      </HStack>
    </SurfaceCard>
  );
}

/**
 * Resolves one preferred field value using schema first.
 * @param {object|null} record
 * @param {object|null} schema
 * @param {string[]} preferredPaths
 * @returns {string|null}
 */
function resolvePreferredFieldValue(record, schema, preferredPaths) {
  const schemaFieldPath = resolveSchemaFieldPath(schema, preferredPaths);
  if (schemaFieldPath) {
    const schemaValue = getSearchResultFieldValue(record, schemaFieldPath);
    if (schemaValue) {
      return schemaValue;
    }
  }

  for (const path of preferredPaths) {
    const fallbackValue = getSearchResultFieldValue(record, path);
    if (fallbackValue) {
      return fallbackValue;
    }
  }

  return null;
}

/**
 * Returns one compact location label for a contact row.
 * @param {object|null} relatedLocation
 * @returns {string}
 */
function formatContactLocation(relatedLocation) {
  const city =
    typeof relatedLocation?.city === "string" && relatedLocation.city.trim()
      ? relatedLocation.city.trim()
      : null;
  const regionCode =
    typeof relatedLocation?.regionCode === "string" && relatedLocation.regionCode.trim()
      ? relatedLocation.regionCode.trim()
      : null;
  const countryCode =
    typeof relatedLocation?.countryCode === "string" && relatedLocation.countryCode.trim()
      ? relatedLocation.countryCode.trim()
      : null;

  if (city && regionCode) {
    return `${city}, ${regionCode}`;
  }

  return city || regionCode || countryCode || "Location unavailable";
}

/**
 * Infers one human-readable level from a title when the API has not provided one.
 * @param {string|null} title
 * @returns {string}
 */
function inferContactLevel(title) {
  const normalizedTitle = typeof title === "string" ? title.toLowerCase() : "";

  if (/chief|ceo|cfo|coo|cto|president/.test(normalizedTitle)) {
    return "C-Suite";
  }

  if (/vp|vice president|executive/.test(normalizedTitle)) {
    return "Executive";
  }

  if (/director|head/.test(normalizedTitle)) {
    return "Director";
  }

  if (/manager/.test(normalizedTitle)) {
    return "Manager";
  }

  return "Contact";
}

/**
 * Builds email rows for a contact result with placeholder fallbacks.
 * @param {object|null} result
 * @param {object|null} schema
 * @returns {Array<{label: string, value: string, isVerified: boolean}>}
 */
function buildContactEmailRows(result, schema) {
  const rows = [];
  const seenValues = new Set();

  for (const group of CONTACT_EMAIL_PATH_GROUPS) {
    const value = resolvePreferredFieldValue(result, schema, group.paths);
    if (!value || seenValues.has(value)) {
      continue;
    }

    seenValues.add(value);
    rows.push({
      label: group.label,
      value,
      isVerified: true
    });
  }

  return rows.length
    ? rows
    : [
        {
          label: "Email",
          value: "No email available",
          isVerified: false
        }
      ];
}

/**
 * Filters contacts with lightweight local search and level controls.
 * @param {{
 *   results: object[],
 *   schema: object|null,
 *   query: string,
 *   levelFilter: string
 * }} options
 * @returns {object[]}
 */
function filterContacts(options) {
  const normalizedQuery = options.query.trim().toLowerCase();

  return options.results.filter((result) => {
    const title =
      resolvePreferredFieldValue(result, options.schema, CONTACT_TITLE_PATHS) || "No title available";
    const level =
      resolvePreferredFieldValue(result, options.schema, CONTACT_LEVEL_PATHS) || inferContactLevel(title);
    const location = formatContactLocation(result?.relatedLocation || null);
    const matchesQuery =
      !normalizedQuery ||
      [result?.name, title, level, location]
        .filter((value) => typeof value === "string")
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesLevel =
      options.levelFilter === "All Levels" || level.toLowerCase() === options.levelFilter.toLowerCase();

    return matchesQuery && matchesLevel;
  });
}

/**
 * Renders the overview tab that mirrors the stitched organization summary layout.
 * @param {{
 *   organizationDetail: {
 *     record: object|null,
 *     schema: object|null,
 *     locations: object[]
 *   }
 * }} props
 * @returns {JSX.Element}
 */
export function OrganizationOverviewPanel({ organizationDetail }) {
  const revalidator = useRevalidator();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [recordOverride, setRecordOverride] = useState(null);
  const organizationUUID =
    typeof organizationDetail?.uuid === "string" && organizationDetail.uuid.trim()
      ? organizationDetail.uuid.trim()
      : typeof organizationDetail?.record?.uuid === "string" && organizationDetail.record.uuid.trim()
        ? organizationDetail.record.uuid.trim()
        : "";
  const effectiveRecord = recordOverride || organizationDetail?.record || null;

  useEffect(() => {
    setRecordOverride(null);
  }, [organizationUUID]);

  const overview = buildOrganizationOverviewViewModel({
    record: effectiveRecord,
    schema: organizationDetail?.schema || null,
    locations: Array.isArray(organizationDetail?.locations) ? organizationDetail.locations : []
  });

  return (
    <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 2.2fr) minmax(320px, 1fr)" }} gap={6}>
      <GridItem>
        <Stack spacing={6}>
          <SurfaceCard>
            <Text color="gray.700" fontSize="lg" lineHeight="1.9">
              {overview.description}
            </Text>
          </SurfaceCard>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <OverviewStatCard
              label="Company Size"
              value={overview.companySizeLabel}
              icon={MdGroups}
            />
            <OverviewStatCard
              label="Annual Revenue"
              value={overview.revenueLabel}
              icon={MdPayments}
            />
            <OverviewStatCard
              label="Customer Since"
              value={overview.customerSinceLabel}
              icon={MdCalendarToday}
            />
          </SimpleGrid>
        </Stack>
      </GridItem>

      <GridItem>
        <Stack spacing={6}>
          <SurfaceCard>
            <Flex justify="space-between" align="center">
              <Heading size="md">Account Health</Heading>
              <Icon as={FiCheckCircle} color="gray.400" />
            </Flex>

            <HStack spacing={2} align="flex-end" mt={5}>
              <Text fontSize="5xl" lineHeight="0.95" fontWeight="bold" color={BRAND_BLUE}>
                {overview.accountHealthScore}
              </Text>
              <Text pb={2} color="gray.500" fontWeight="medium">
                / 100
              </Text>
            </HStack>

            <Box mt={5} bg="#E7EEF8" borderRadius="full" h="8px" overflow="hidden">
              <Box
                h="100%"
                borderRadius="full"
                bg={BRAND_BLUE}
                width={`${overview.accountHealthScore}%`}
              />
            </Box>

            <Stack spacing={3} mt={5}>
              <Flex justify="space-between" align="center">
                <Text color="gray.600">Engagement</Text>
                <Text fontWeight="semibold" color={BRAND_BLUE}>
                  {overview.engagementLabel}
                </Text>
              </Flex>
              <Flex justify="space-between" align="center">
                <Text color="gray.600">Churn Risk</Text>
                <Text fontWeight="semibold" color="gray.800">
                  {overview.churnRiskLabel}
                </Text>
              </Flex>
            </Stack>

            <Text mt={4} fontSize="sm" color="gray.500">
              Placeholder until live health metrics are connected.
            </Text>
          </SurfaceCard>

          <SurfaceCard>
            <Flex justify="space-between" align="center" gap={3} mb={5}>
              <Heading size="md">Industry &amp; Expertise</Heading>
              <Button
                variant="link"
                colorScheme="blue"
                size="sm"
                onClick={onOpen}
                isDisabled={!organizationUUID}
              >
                explain
              </Button>
            </Flex>
            <Flex wrap="wrap" gap={3}>
              {overview.expertiseTags.map((tag) => (
                <Badge
                  key={tag}
                  px={3}
                  py={1.5}
                  borderRadius="full"
                  colorScheme="blue"
                  variant="subtle"
                  textTransform="none"
                  fontSize="sm"
                >
                  {tag}
                </Badge>
              ))}
            </Flex>
          </SurfaceCard>

          <OrganizationResegmentationFlyout
            isOpen={isOpen}
            onClose={onClose}
            organizationUUID={organizationUUID}
            organizationName={
              typeof effectiveRecord?.name === "string" && effectiveRecord.name.trim()
                ? effectiveRecord.name.trim()
                : "Organization"
            }
            record={effectiveRecord}
            onApplied={async ({ record: nextRecord }) => {
              setRecordOverride(nextRecord || null);
              revalidator.revalidate();
            }}
          />
        </Stack>
      </GridItem>
    </Grid>
  );
}

/**
 * Renders the organization contacts tab using live people data with stitched styling.
 * @param {{
 *   data: {
 *     results: object[],
 *     schema: object|null,
 *     meta: {count?: number}|null,
 *     error: string|null
 *   }
 * }} props
 * @returns {JSX.Element}
 */
export function OrganizationContactsPanel({ data }) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const results = Array.isArray(data?.results) ? data.results : [];
  const filteredResults = filterContacts({
    results,
    schema: data?.schema || null,
    query,
    levelFilter
  });

  return (
    <SurfaceCard p={0}>
      <Flex
        align={{ base: "stretch", lg: "center" }}
        justify="space-between"
        gap={4}
        direction={{ base: "column", lg: "row" }}
        px={{ base: 5, md: 6 }}
        py={5}
        borderBottomWidth="1px"
        borderColor={BORDER_COLOR}
      >
        <HStack spacing={3}>
          <Heading size="md">Directory</Heading>
          <Badge px={3} py={1} borderRadius="full" colorScheme="blue" variant="subtle">
            {data?.meta?.count || results.length} Total
          </Badge>
        </HStack>

        <HStack spacing={3} align="stretch" flexWrap="wrap">
          <InputGroup maxW={{ base: "full", md: "260px" }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="#718096" />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search contacts..."
              bg="white"
            />
          </InputGroup>

          <Select
            maxW={{ base: "full", md: "160px" }}
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            bg="white"
          >
            <option>All Levels</option>
            <option>C-Suite</option>
            <option>Executive</option>
            <option>Director</option>
            <option>Manager</option>
            <option>Contact</option>
          </Select>

          <Button leftIcon={<FiFilter />} variant="outline" isDisabled>
            Filter
          </Button>
        </HStack>
      </Flex>

      <TableContainer>
        <Table size="md" variant="unstyled">
          <Thead bg="#F3F7FD">
            <Tr>
              <Th px={{ base: 5, md: 6 }} py={4} color="gray.500" fontSize="xs">
                Name
              </Th>
              <Th px={{ base: 5, md: 4 }} py={4} color="gray.500" fontSize="xs">
                Title &amp; Level
              </Th>
              <Th px={{ base: 5, md: 4 }} py={4} color="gray.500" fontSize="xs">
                Location
              </Th>
              <Th px={{ base: 5, md: 4 }} py={4} color="gray.500" fontSize="xs">
                Email Details
              </Th>
              <Th px={{ base: 5, md: 6 }} py={4} color="gray.500" fontSize="xs" textAlign="right">
                Last Interaction
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredResults.length ? (
              filteredResults.map((result, index) => {
                const title =
                  resolvePreferredFieldValue(result, data?.schema || null, CONTACT_TITLE_PATHS) ||
                  "No title available";
                const level =
                  resolvePreferredFieldValue(result, data?.schema || null, CONTACT_LEVEL_PATHS) ||
                  inferContactLevel(title);
                const emails = buildContactEmailRows(result, data?.schema || null);
                const location = formatContactLocation(result?.relatedLocation || null);
                const detailPath = buildEntityDetailPath("person", result?.uuid || "");

                return (
                  <Tr
                    key={result?.uuid || `${result?.name || "contact"}-${index}`}
                    borderTopWidth={index === 0 ? "0" : "1px"}
                    borderColor={BORDER_COLOR}
                    _hover={{ bg: "#FAFCFF" }}
                  >
                    <Td px={{ base: 5, md: 6 }} py={4} verticalAlign="top">
                      <VStack align="start" spacing={2}>
                        <HStack spacing={2}>
                          {detailPath ? (
                            <ChakraLink
                              as={RemixLink}
                              to={detailPath}
                              fontWeight="semibold"
                              color="gray.900"
                              _hover={{ textDecoration: "none", color: BRAND_BLUE }}
                            >
                              {result?.name || "Unnamed contact"}
                            </ChakraLink>
                          ) : (
                            <Text fontWeight="semibold" color="gray.900">
                              {result?.name || "Unnamed contact"}
                            </Text>
                          )}
                          {detailPath ? (
                            <Icon as={FiArrowUpRight} color="gray.400" />
                          ) : null}
                        </HStack>
                        <HStack spacing={2} flexWrap="wrap">
                          <Badge colorScheme="blue" variant="subtle" textTransform="uppercase">
                            Contact
                          </Badge>
                          <Badge colorScheme="green" variant="subtle" textTransform="uppercase">
                            Visible
                          </Badge>
                        </HStack>
                      </VStack>
                    </Td>

                    <Td px={{ base: 5, md: 4 }} py={4} verticalAlign="top">
                      <Text color="gray.900" fontWeight="medium">
                        {title}
                      </Text>
                      <Text mt={1} fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                        {level}
                      </Text>
                    </Td>

                    <Td px={{ base: 5, md: 4 }} py={4} verticalAlign="top">
                      <HStack spacing={2} align="start">
                        <Icon as={MdBusiness} color="gray.400" mt={1} />
                        <Text color="gray.700">{location}</Text>
                      </HStack>
                    </Td>

                    <Td px={{ base: 5, md: 4 }} py={4} verticalAlign="top">
                      <VStack align="start" spacing={2}>
                        {emails.map((emailRow) => (
                          <HStack key={`${result?.uuid || "email"}-${emailRow.label}-${emailRow.value}`} spacing={2}>
                            <Icon as={FiMail} color="gray.400" />
                            <Text color={emailRow.isVerified ? "gray.800" : "gray.500"}>
                              {emailRow.value}
                            </Text>
                            <Icon
                              as={FiCheckCircle}
                              color={emailRow.isVerified ? BRAND_BLUE : "gray.300"}
                            />
                          </HStack>
                        ))}
                      </VStack>
                    </Td>

                    <Td px={{ base: 5, md: 6 }} py={4} verticalAlign="top" textAlign="right">
                      <VStack align="end" spacing={1}>
                        <HStack spacing={2}>
                          <Icon as={FiClock} color="gray.400" />
                          <Text fontWeight="semibold" color="gray.800">
                            Awaiting sync
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                          No activity
                        </Text>
                      </VStack>
                    </Td>
                  </Tr>
                );
              })
            ) : (
              <Tr>
                <Td colSpan={5} px={{ base: 5, md: 6 }} py={10}>
                  <Text color="gray.600">
                    No contacts match the current filters.
                  </Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>

      <Flex
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={3}
        direction={{ base: "column", md: "row" }}
        px={{ base: 5, md: 6 }}
        py={4}
        borderTopWidth="1px"
        borderColor={BORDER_COLOR}
        bg="#F7FAFF"
      >
        <Text color="gray.600">
          Showing {filteredResults.length ? 1 : 0} to {filteredResults.length} of {data?.meta?.count || results.length} contacts
        </Text>
        <Text color="gray.500" fontSize="sm">
          Inline filtering is local-only for this pass.
        </Text>
      </Flex>
    </SurfaceCard>
  );
}

/**
 * Renders one stitched-style section header with a count pill.
 * @param {{title: string, count: number, tone?: "primary"|"muted"}} props
 * @returns {JSX.Element}
 */
function JobsSectionHeader({ title, count, tone = "primary" }) {
  const titleColor = tone === "primary" ? BRAND_BLUE : "gray.700";

  return (
    <Flex align="center" gap={3} pb={3} borderBottomWidth="1px" borderColor={BORDER_COLOR}>
      <Heading size="md" color={titleColor}>
        {title}
      </Heading>
      <Badge colorScheme={tone === "primary" ? "blue" : "gray"} variant="subtle" px={3} py={1} borderRadius="full">
        {count}
      </Badge>
    </Flex>
  );
}

/**
 * Renders the jobs tab with stitched table structure and neutral placeholders.
 * @param {{organizationDetail: {record: object|null}}} props
 * @returns {JSX.Element}
 */
export function OrganizationJobsPanel({ organizationDetail }) {
  const header = buildOrganizationHeaderViewModel({
    record: organizationDetail?.record || null,
    schema: organizationDetail?.schema || null,
    locations: Array.isArray(organizationDetail?.locations) ? organizationDetail.locations : []
  });

  return (
    <Stack spacing={8}>
      <Box>
        <JobsSectionHeader title="Open Searches" count={0} />
        <SurfaceCard p={0} mt={4}>
          <TableContainer>
            <Table variant="unstyled">
              <Thead bg="#F3F7FD">
                <Tr>
                  <Th px={6} py={4}>Job Title</Th>
                  <Th px={4} py={4}>Search Started</Th>
                  <Th px={4} py={4}>Pipeline</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr borderTopWidth="1px" borderColor={BORDER_COLOR}>
                  <Td px={6} py={8} colSpan={3}>
                    <VStack align="start" spacing={2}>
                      <Text fontWeight="semibold" color="gray.900">
                        No open searches are connected for {header.name}.
                      </Text>
                      <Text color="gray.500">
                        This placeholder table is in place so the tab matches the stitched layout until live job data is wired in.
                      </Text>
                    </VStack>
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Box>

      <Box>
        <Flex align="center" justify="space-between" pb={3} borderBottomWidth="1px" borderColor={BORDER_COLOR}>
          <JobsSectionHeader title="Completed Searches" count={0} tone="muted" />
          <Button variant="ghost" colorScheme="blue" isDisabled>
            View All
          </Button>
        </Flex>
        <SurfaceCard p={0} mt={4}>
          <TableContainer>
            <Table variant="unstyled">
              <Thead bg="#F7FAFF">
                <Tr>
                  <Th px={6} py={4}>Job Title</Th>
                  <Th px={4} py={4}>Search Started</Th>
                  <Th px={4} py={4}>Closed Date</Th>
                  <Th px={4} py={4}>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr borderTopWidth="1px" borderColor={BORDER_COLOR}>
                  <Td px={6} py={8} colSpan={4}>
                    <Text color="gray.500">
                      Completed-search history will render here once the jobs feed is connected.
                    </Text>
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>
        </SurfaceCard>
      </Box>
    </Stack>
  );
}

/**
 * Renders one compact outreach metric card.
 * @param {{label: string, value: string, accent?: string}} props
 * @returns {JSX.Element}
 */
function OutreachMetricCard({ label, value, accent = BRAND_BLUE }) {
  return (
    <SurfaceCard p={{ base: 4, md: 5 }}>
      <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">
        {label}
      </Text>
      <Text mt={3} fontSize="3xl" lineHeight="1" fontWeight="bold" color="gray.900">
        {value}
      </Text>
      <Box mt={4} h="6px" borderRadius="full" bg="#E7EEF8" overflow="hidden">
        <Box h="100%" width={value === "0" || value === "0%" ? "4%" : "35%"} bg={accent} />
      </Box>
    </SurfaceCard>
  );
}

/**
 * Renders the outreach tab with stitched metric and chart placeholders.
 * @returns {JSX.Element}
 */
export function OrganizationOutreachPanel() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  return (
    <Stack spacing={6}>
      <Flex align={{ base: "stretch", md: "end" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={4}>
        <Box>
          <Heading size="lg" color={BRAND_BLUE}>
            Outreach Performance
          </Heading>
          <Text mt={2} color="gray.500">
            Placeholder metrics until campaign and deliverability data are connected.
          </Text>
        </Box>
        <HStack spacing={3}>
          <Button leftIcon={<FiCalendar />} variant="outline" isDisabled>
            Last 30 Days
          </Button>
          <Button leftIcon={<FiArrowUpRight />} colorScheme="blue" bg={BRAND_BLUE} _hover={{ bg: BRAND_BLUE }} isDisabled>
            Export Data
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        <OutreachMetricCard label="Emails Sent" value="0" />
        <OutreachMetricCard label="Opened" value="0%" />
        <OutreachMetricCard label="Replied" value="0%" />
        <OutreachMetricCard label="Clicked" value="0%" />
      </SimpleGrid>

      <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 2fr) minmax(320px, 1fr)" }} gap={6}>
        <SurfaceCard>
          <Flex justify="space-between" align="center" mb={8}>
            <Box>
              <Heading size="md">Monthly Email Performance</Heading>
              <Text mt={2} color="gray.500">
                This chart area is ready for live outreach volume.
              </Text>
            </Box>
            <Badge colorScheme="blue" variant="subtle">
              Placeholder
            </Badge>
          </Flex>

          <Flex align="end" justify="space-between" h="260px" gap={4}>
            {months.map((month) => (
              <VStack key={month} justify="end" flex="1" spacing={3}>
                <Box w="100%" maxW="44px" h="18px" borderRadius="10px 10px 0 0" bg="#CFE0F6" />
                <Text fontSize="xs" color="gray.500" fontWeight="bold" letterSpacing="0.08em">
                  {month}
                </Text>
              </VStack>
            ))}
          </Flex>
        </SurfaceCard>

        <Stack spacing={6}>
          <SurfaceCard>
            <Heading size="md">Deliverability Health</Heading>
            <Stack spacing={4} mt={5}>
              {[
                { label: "Bounce Rate", value: "0%" },
                { label: "Spam Reports", value: "0" },
                { label: "Meetings Booked", value: "0" }
              ].map((item) => (
                <Box key={item.label}>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text color="gray.600">{item.label}</Text>
                    <Text fontWeight="semibold" color="gray.900">
                      {item.value}
                    </Text>
                  </Flex>
                  <Box h="6px" borderRadius="full" bg="#E7EEF8" overflow="hidden">
                    <Box h="100%" width="4%" bg={BRAND_BLUE} />
                  </Box>
                </Box>
              ))}
            </Stack>
          </SurfaceCard>

          <SurfaceCard>
            <Heading size="md">Best Outreach Windows</Heading>
            <Stack spacing={4} mt={5}>
              {["Morning", "Midday", "Afternoon"].map((slot) => (
                <Flex key={slot} justify="space-between" align="center">
                  <Text color="gray.600">{slot}</Text>
                  <Text fontWeight="semibold" color="gray.900">
                    0 sends
                  </Text>
                </Flex>
              ))}
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Stack>
  );
}

/**
 * Renders one placeholder similar-organization card.
 * @param {{title: string, location: string, tags: string[]}} props
 * @returns {JSX.Element}
 */
function SimilarOrganizationCard({ title, location, tags }) {
  return (
    <SurfaceCard minH="100%">
      <VStack align="start" spacing={5} h="100%">
        <Box>
          <HStack spacing={3} align="center">
            <Flex
              boxSize="48px"
              borderRadius="16px"
              bg="#EEF4FF"
              borderWidth="1px"
              borderColor={BORDER_COLOR}
              align="center"
              justify="center"
              color={BRAND_BLUE}
            >
              <Icon as={MdBusiness} boxSize={6} />
            </Flex>
            <Box>
              <Heading size="sm" color={BRAND_BLUE}>
                {title}
              </Heading>
              <Text mt={1} fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="blue.500">
                0% match
              </Text>
            </Box>
          </HStack>
        </Box>

        <Stack spacing={3}>
          <HStack spacing={2}>
            <Icon as={FiMapPin} color="gray.400" />
            <Text color="gray.600">{location}</Text>
          </HStack>
          <HStack spacing={2}>
            <Icon as={FiGlobe} color="gray.400" />
            <Text color="gray.500">Peer data pending</Text>
          </HStack>
        </Stack>

        <Flex wrap="wrap" gap={2}>
          {tags.map((tag) => (
            <Badge key={`${title}-${tag}`} variant="subtle" colorScheme="blue" px={3} py={1} borderRadius="full">
              {tag}
            </Badge>
          ))}
        </Flex>

        <Text color="gray.500" mt="auto">
          Similar-organization recommendations will render here once peer matching data is available.
        </Text>
      </VStack>
    </SurfaceCard>
  );
}

/**
 * Renders the similar organizations tab with stitched filtering chrome and placeholder peers.
 * @param {{organizationDetail: {record: object|null, schema: object|null, locations: object[]}}} props
 * @returns {JSX.Element}
 */
export function OrganizationSimilarOrganizationsPanel({ organizationDetail }) {
  const header = buildOrganizationHeaderViewModel({
    record: organizationDetail?.record || null,
    schema: organizationDetail?.schema || null,
    locations: Array.isArray(organizationDetail?.locations) ? organizationDetail.locations : []
  });
  const overview = buildOrganizationOverviewViewModel({
    record: organizationDetail?.record || null,
    schema: organizationDetail?.schema || null,
    locations: Array.isArray(organizationDetail?.locations) ? organizationDetail.locations : []
  });
  const tags = overview.expertiseTags.slice(0, 2);

  return (
    <Stack spacing={6}>
      <Box>
        <Heading size="lg" color={BRAND_BLUE}>
          Similar Organizations
        </Heading>
        <Text mt={2} color="gray.500">
          Filter controls are in place; peer matching will populate in a later pass.
        </Text>
      </Box>

      <SurfaceCard>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 5 }} spacing={4}>
          <Box>
            <Text mb={2} fontWeight="semibold" color="gray.700">Location</Text>
            <Select bg="white" isDisabled defaultValue="within-25">
              <option value="within-25">Within 25 miles</option>
            </Select>
          </Box>
          <Box>
            <Text mb={2} fontWeight="semibold" color="gray.700">Region</Text>
            <Input placeholder={header.hqLabel} isDisabled bg="white" />
          </Box>
          <Box>
            <Text mb={2} fontWeight="semibold" color="gray.700">Industry</Text>
            <Select bg="white" isDisabled defaultValue="industry">
              <option value="industry">{tags[0] || "Awaiting segmentation"}</option>
            </Select>
          </Box>
          <Box>
            <Text mb={2} fontWeight="semibold" color="gray.700">Focus</Text>
            <Select bg="white" isDisabled defaultValue="focus">
              <option value="focus">{tags[1] || "Awaiting segmentation"}</option>
            </Select>
          </Box>
          <Box>
            <Text mb={2} fontWeight="semibold" color="gray.700">Size</Text>
            <Select bg="white" isDisabled defaultValue="size">
              <option value="size">Unknown</option>
            </Select>
          </Box>
        </SimpleGrid>

        <Flex justify="end" gap={3} mt={5} pt={5} borderTopWidth="1px" borderColor={BORDER_COLOR}>
          <Button variant="ghost" isDisabled>Clear Filters</Button>
          <Button colorScheme="blue" bg={BRAND_BLUE} _hover={{ bg: BRAND_BLUE }} isDisabled>
            Apply Changes
          </Button>
        </Flex>
      </SurfaceCard>

      <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={5}>
        <SimilarOrganizationCard title="Regional Peer Placeholder" location={header.hqLabel} tags={tags.length ? tags : ["Awaiting data"]} />
        <SimilarOrganizationCard title="Industry Peer Placeholder" location="Location pending" tags={tags.length ? tags : ["Awaiting data"]} />
        <SimilarOrganizationCard title="Growth Peer Placeholder" location="Location pending" tags={tags.length ? tags : ["Awaiting data"]} />
      </SimpleGrid>
    </Stack>
  );
}

/**
 * Renders the locations tab using live organization locations plus neutral headcount fallbacks.
 * @param {{organizationDetail: {locations: object[]}}} props
 * @returns {JSX.Element}
 */
export function OrganizationLocationsPanel({ organizationDetail }) {
  const [query, setQuery] = useState("");
  const viewModel = buildOrganizationLocationsViewModel({
    locations: Array.isArray(organizationDetail?.locations) ? organizationDetail.locations : []
  });
  const filteredCards = viewModel.cards.filter((card) =>
    !query.trim() || card.heading.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Stack spacing={6}>
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        <SurfaceCard p={{ base: 4, md: 5 }}>
          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">
            Total Entities
          </Text>
          <Text mt={3} fontSize="3xl" fontWeight="bold" color={BRAND_BLUE}>
            {String(viewModel.summary.totalLocations).padStart(2, "0")}
          </Text>
        </SurfaceCard>
        <SurfaceCard p={{ base: 4, md: 5 }}>
          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">
            Global Headcount
          </Text>
          <Text mt={3} fontSize="3xl" fontWeight="bold" color={BRAND_BLUE}>
            {viewModel.summary.globalHeadcount}
          </Text>
        </SurfaceCard>
        <SurfaceCard p={{ base: 4, md: 5 }}>
          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">
            Timezones Covered
          </Text>
          <Text mt={3} fontSize="3xl" fontWeight="bold" color={BRAND_BLUE}>
            {String(viewModel.summary.timezoneCount).padStart(2, "0")}
          </Text>
        </SurfaceCard>
        <SurfaceCard p={{ base: 4, md: 5 }}>
          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">
            HQ Location
          </Text>
          <Text mt={3} fontSize="2xl" fontWeight="bold" color={BRAND_BLUE}>
            {viewModel.summary.hqLabel}
          </Text>
        </SurfaceCard>
      </SimpleGrid>

      <Flex align={{ base: "stretch", md: "end" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={4}>
        <Box>
          <Heading size="lg" color={BRAND_BLUE}>
            Global Locations
          </Heading>
          <Text mt={2} color="gray.500">
            Live offices render below. Headcount stays neutral until location metrics are connected.
          </Text>
        </Box>
        <HStack spacing={3}>
          <InputGroup maxW={{ base: "full", md: "260px" }}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="#718096" />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cities..."
              bg="white"
            />
          </InputGroup>
          <Button leftIcon={<FiFilter />} variant="outline" isDisabled>
            Filter
          </Button>
        </HStack>
      </Flex>

      {filteredCards.length ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
          {filteredCards.map((card) => (
            <SurfaceCard key={card.key} minH="100%">
              <VStack align="stretch" spacing={5} h="100%">
                <Flex justify="space-between" align="start" gap={3}>
                  <Heading size="md">{card.heading}</Heading>
                  <Badge colorScheme={card.badge === "HQ" ? "blue" : "gray"} variant="subtle" px={3} py={1} borderRadius="full">
                    {card.badge}
                  </Badge>
                </Flex>

                <HStack align="start" spacing={3}>
                  <Icon as={FiMapPin} color="gray.400" mt={1} />
                  <Text color="gray.600">{card.address}</Text>
                </HStack>

                <Flex mt="auto" pt={4} borderTopWidth="1px" borderColor={BORDER_COLOR} justify="space-between" align="center">
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                      Headcount
                    </Text>
                    <Text mt={1} fontWeight="semibold" color={BRAND_BLUE}>
                      {card.headcountLabel}
                    </Text>
                  </Box>
                  <Flex
                    boxSize="34px"
                    borderRadius="full"
                    bg={BRAND_BLUE}
                    color="white"
                    align="center"
                    justify="center"
                    fontSize="xs"
                    fontWeight="bold"
                  >
                    0
                  </Flex>
                </Flex>
              </VStack>
            </SurfaceCard>
          ))}
        </SimpleGrid>
      ) : (
        <SurfaceCard>
          <Text color="gray.600">No organization locations are available yet.</Text>
        </SurfaceCard>
      )}
    </Stack>
  );
}

/**
 * Renders the notes tab using clearly-labeled placeholder note cards.
 * @returns {JSX.Element}
 */
export function OrganizationNotesPanel() {
  return (
    <Stack spacing={5}>
      <Flex align={{ base: "stretch", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={4}>
        <Box>
          <Heading size="lg" color={BRAND_BLUE}>
            Internal Notes
          </Heading>
          <Text mt={2} color="gray.500">
            Confidential note storage is not wired yet, so this tab uses neutral placeholders only.
          </Text>
        </Box>
        <Button leftIcon={<FiCalendar />} colorScheme="blue" bg={BRAND_BLUE} _hover={{ bg: BRAND_BLUE }} isDisabled>
          New Note
        </Button>
      </Flex>

      {PLACEHOLDER_NOTES.map((note) => (
        <SurfaceCard key={note.title}>
          <Stack spacing={4}>
            <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={3}>
              <Box>
                <Heading size="sm">{note.title}</Heading>
                <Text mt={1} fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="blue.500">
                  {note.subtitle}
                </Text>
              </Box>
              <HStack spacing={2} color="gray.500">
                <Icon as={MdCalendarToday} />
                <Text>{note.timestamp}</Text>
              </HStack>
            </Flex>

            <Text color="gray.700" lineHeight="1.8">
              {note.body}
            </Text>

            <Flex wrap="wrap" gap={2} pt={3} borderTopWidth="1px" borderColor={BORDER_COLOR}>
              {note.tags.map((tag) => (
                <Badge key={`${note.title}-${tag}`} variant="subtle" colorScheme="blue" px={3} py={1} borderRadius="full">
                  {tag}
                </Badge>
              ))}
            </Flex>
          </Stack>
        </SurfaceCard>
      ))}
    </Stack>
  );
}
