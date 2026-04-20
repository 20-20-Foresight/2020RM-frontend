import { useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
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
  VStack
} from "@chakra-ui/react";
import {
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiGrid,
  FiHome,
  FiMail,
  FiMapPin,
  FiMoreVertical,
  FiSearch,
  FiUsers
} from "react-icons/fi";
import { MdCampaign, MdSchool, MdWorkOutline } from "react-icons/md";
import { buildPersonOverviewViewModel } from "../models/person-detail-view.mjs";

const BRAND_BLUE = "#0F4C81";
const BORDER_COLOR = "#D7DFEC";
const CARD_BG = "white";

const LIST_ROWS = [
  {
    title: "Q4 Enterprise Targets",
    subtitle: "248 contacts",
    type: "Sales Pipeline",
    status: "Active",
    dateCreated: "Oct 12, 2023",
    icon: MdCampaign,
    iconBg: "#E6F0FF",
    iconColor: BRAND_BLUE
  },
  {
    title: "Weekly Newsletter Opt-ins",
    subtitle: "1,820 contacts",
    type: "Marketing",
    status: "Active",
    dateCreated: "Sep 28, 2023",
    icon: FiMail,
    iconBg: "#E9F1FF",
    iconColor: "#1C4EA3"
  },
  {
    title: "Churn Risk Alerts",
    subtitle: "42 contacts",
    type: "Retention",
    status: "Archived",
    dateCreated: "Aug 15, 2023",
    icon: FiUsers,
    iconBg: "#FFE9E9",
    iconColor: "#A61B1B"
  },
  {
    title: "New Partner Prospecting",
    subtitle: "115 contacts",
    type: "Internal",
    status: "Draft",
    dateCreated: "Oct 30, 2023",
    icon: FiUsers,
    iconBg: "#EEF1FF",
    iconColor: "#2D4AA0"
  },
  {
    title: "Lead Scoring V2 Beta",
    subtitle: "520 contacts",
    type: "Sales Pipeline",
    status: "Active",
    dateCreated: "Nov 02, 2023",
    icon: FiGrid,
    iconBg: "#E6F0FF",
    iconColor: BRAND_BLUE
  }
];

const SIMILAR_CONTACTS = [
  {
    name: "Elena Rodriguez",
    title: "Chief Strategy Officer",
    company: "NexGen Systems",
    skills: ["Enterprise Sales", "Product Strategy", "FinTech"]
  },
  {
    name: "Marcus Chen",
    title: "VP of Engineering",
    company: "CloudScale AI",
    skills: ["Machine Learning", "Kubernetes", "Scale"]
  },
  {
    name: "David Park",
    title: "Director of Operations",
    company: "BlueChip Global",
    skills: ["Logistics", "M&A", "Change Mgmt"]
  },
  {
    name: "Sarah Jenkins",
    title: "Head of Talent",
    company: "Innovate Partners",
    skills: ["Recruiting", "HR Tech", "Compensation"]
  },
  {
    name: "Julian Voss",
    title: "Managing Director",
    company: "Voss Equity",
    skills: ["Asset Management", "LBO", "Valuation"]
  },
  {
    name: "Maya Gupta",
    title: "Principal Designer",
    company: "Creative Hub",
    skills: ["Product Design", "Branding", "UX"]
  },
  {
    name: "Robert Thorne",
    title: "VP of Supply Chain",
    company: "LogiWorld Inc.",
    skills: ["Optimization", "Procurement", "Global Ops"]
  }
];

const PLACEHOLDER_NOTES = [
  {
    author: "Marcus Thorne",
    role: "Regional Director of Operations",
    timestamp: "Oct 24, 2023 • 09:14 AM",
    paragraphs: [
      "Completed the Q3 Strategic Alignment session with the local leadership team. The organization is showing strong resilience in the face of supply chain fluctuations, but a few key risks remain in the logistical pipeline.",
      "Next steps involve a full audit of the Northern hub by mid-November. I've flagged this for the compliance team to monitor."
    ],
    bullets: [
      "Finalized the vendor consolidation roadmap for 2024.",
      "Identified a 12% discrepancy in inventory reporting at the Northern hub.",
      "Approved the \"Efficiency First\" internal initiative."
    ],
    tags: ["Operations", "Strategy"]
  },
  {
    author: "Elena Rodriguez",
    role: "Lead Client Strategist",
    timestamp: "Oct 21, 2023 • 02:45 PM",
    paragraphs: [
      "High-level briefing regarding the Global Expansion Phase II. Client indicated a preference for localized marketing structures over the previous centralized model.",
      "They expressed concern about the current SLA response times in the APAC region. We need to prioritize the hiring of three additional support engineers by EOY to meet these expectations."
    ],
    bullets: [],
    tags: ["Client-Facing", "Expansion"]
  },
  {
    author: "Dr. Simon Kalu",
    role: "Chief Compliance Officer",
    timestamp: "Oct 18, 2023 • 11:30 AM",
    paragraphs: [
      "Routine Risk Assessment Update. The organization's data privacy protocols have been updated to align with the latest regional regulations (v4.2).",
      "All employees are required to complete the updated Cybersecurity Awareness training module by the end of this month. Initial engagement rates are currently at 64%."
    ],
    bullets: [],
    tags: ["Compliance", "Risk-Mgt"]
  }
];

/**
 * Renders one shared white surface card used across the contact detail tabs.
 * @param {{
 *   children?: import("react").ReactNode,
 *   p?: object|number|string,
 *   minH?: string|number
 * }} props
 * @returns {JSX.Element}
 */
function SurfaceCard({ children = null, p = { base: 5, md: 6 }, minH = "auto" }) {
  return (
    <Box
      bg={CARD_BG}
      borderWidth="1px"
      borderColor={BORDER_COLOR}
      borderRadius="20px"
      shadow="sm"
      p={p}
      minH={minH}
    >
      {children}
    </Box>
  );
}

/**
 * Returns the badge color scheme for one list status.
 * @param {string} status
 * @returns {"green"|"blue"|"gray"}
 */
function getListStatusColorScheme(status) {
  if (status === "Active") {
    return "green";
  }

  if (status === "Draft") {
    return "blue";
  }

  return "gray";
}

/**
 * Renders the overview tab that mirrors the stitched contact summary layout.
 * @param {{
 *   personDetail: {
 *     record: object|null,
 *     schema: object|null,
 *     locations: object[]
 *   }
 * }} props
 * @returns {JSX.Element}
 */
export function PersonOverviewPanel({ personDetail }) {
  const overview = buildPersonOverviewViewModel({
    record: personDetail?.record || null,
    schema: personDetail?.schema || null,
    locations: Array.isArray(personDetail?.locations) ? personDetail.locations : []
  });

  return (
    <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 2.25fr) minmax(320px, 1fr)" }} gap={6}>
      <GridItem>
        <Stack spacing={6}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <SurfaceCard>
              <HStack spacing={3} mb={3}>
                <Icon as={FiBriefcase} color={BRAND_BLUE} />
                <Heading size="md">Office Location</Heading>
              </HStack>
              <Text color="gray.700">{overview.officeLocationLabel}</Text>
            </SurfaceCard>

            <SurfaceCard>
              <HStack spacing={3} mb={3}>
                <Icon as={FiHome} color={BRAND_BLUE} />
                <Heading size="md">Home Location</Heading>
              </HStack>
              <Text color="gray.700">{overview.homeLocationLabel}</Text>
            </SurfaceCard>
          </SimpleGrid>

          <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 1.75fr) minmax(220px, 0.75fr)" }} gap={4}>
            <SurfaceCard>
              <Heading size="lg" color="gray.900">
                {overview.title}
              </Heading>
              <HStack mt={4} spacing={3} flexWrap="wrap">
                <Badge
                  px={3}
                  py={1.5}
                  borderRadius="full"
                  colorScheme="blue"
                  variant="subtle"
                  textTransform="none"
                >
                  {overview.levelLabel}
                </Badge>
                <Text color="gray.600">Tenure: {overview.tenureLabel}</Text>
              </HStack>
            </SurfaceCard>

            <SurfaceCard>
              <Text
                fontSize="xs"
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing="0.08em"
                color="gray.500"
                textAlign="center"
              >
                Annual Compensation
              </Text>
              <Text mt={4} fontSize="3xl" fontWeight="semibold" color="gray.900" textAlign="center">
                {overview.compensationLabel}
              </Text>
            </SurfaceCard>
          </Grid>

          <SurfaceCard p={0}>
            <Box px={{ base: 5, md: 6 }} py={5} borderBottomWidth="1px" borderColor={BORDER_COLOR}>
              <Heading size="md">Professional Summary</Heading>
            </Box>
            <Box px={{ base: 5, md: 6 }} py={5}>
              <Text color="gray.700" fontSize="lg" lineHeight="1.9">
                {overview.summary}
              </Text>
            </Box>
          </SurfaceCard>

          <SurfaceCard p={0}>
            <Flex
              align="center"
              justify="space-between"
              px={{ base: 5, md: 6 }}
              py={5}
              borderBottomWidth="1px"
              borderColor={BORDER_COLOR}
            >
              <Heading size="md">Work History</Heading>
              <Icon as={MdWorkOutline} color="gray.400" />
            </Flex>
            <Stack px={{ base: 5, md: 6 }} py={5} spacing={6}>
              {overview.workHistory.map((entry, index) => (
                <HStack key={`${entry.title}-${entry.subtitle}-${index}`} align="stretch" spacing={4}>
                  <VStack spacing={0} minW="20px">
                    <Box
                      boxSize="14px"
                      borderRadius="full"
                      bg={index === 0 ? BRAND_BLUE : "gray.300"}
                      borderWidth="4px"
                      borderColor={index === 0 ? "#DCE9FF" : "white"}
                    />
                    {index < overview.workHistory.length - 1 ? (
                      <Box flex="1" w="1px" bg="gray.200" mt={1} />
                    ) : null}
                  </VStack>
                  <Box pb={1}>
                    <Text fontSize="lg" fontWeight="semibold" color="gray.900">
                      {entry.title}
                    </Text>
                    <Text mt={1} color="gray.500" fontWeight="medium">
                      {entry.subtitle}
                    </Text>
                    <Text mt={3} color="gray.700">
                      {entry.description}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </Stack>
          </SurfaceCard>

          <SurfaceCard p={0}>
            <Box px={{ base: 5, md: 6 }} py={5} borderBottomWidth="1px" borderColor={BORDER_COLOR}>
              <Heading size="md">Education</Heading>
            </Box>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} px={{ base: 5, md: 6 }} py={5}>
              {overview.education.map((entry, index) => (
                <HStack
                  key={`${entry.degree}-${entry.institution}-${index}`}
                  spacing={4}
                  align="flex-start"
                >
                  <Flex
                    boxSize="52px"
                    borderRadius="lg"
                    bg="#E6EEFF"
                    color={BRAND_BLUE}
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <Icon as={MdSchool} boxSize={6} />
                  </Flex>
                  <Box>
                    <Text fontWeight="semibold" color="gray.900">
                      {entry.degree}
                    </Text>
                    <Text mt={1} color="#5A6B8C" fontSize="lg">
                      {entry.institution}
                    </Text>
                    <Text mt={1} color="gray.500">
                      {entry.subtitle}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </SimpleGrid>
          </SurfaceCard>
        </Stack>
      </GridItem>

      <GridItem>
        <Stack spacing={6}>
          <SurfaceCard p={0}>
            <Box px={{ base: 5, md: 6 }} py={5} borderBottomWidth="1px" borderColor={BORDER_COLOR}>
              <Heading size="md">Expertise &amp; Skills</Heading>
            </Box>
            <Flex px={{ base: 5, md: 6 }} py={5} wrap="wrap" gap={3}>
              {overview.expertiseTags.map((tag) => (
                <Badge
                  key={tag}
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg="#EEF3FF"
                  color="#123D86"
                  textTransform="none"
                  fontSize="sm"
                  fontWeight="medium"
                >
                  {tag}
                </Badge>
              ))}
            </Flex>
          </SurfaceCard>

          <SurfaceCard p={0}>
            <Box px={{ base: 5, md: 6 }} py={5} borderBottomWidth="1px" borderColor={BORDER_COLOR}>
              <Heading size="md">Contact Strength</Heading>
            </Box>
            <Box px={{ base: 5, md: 6 }} py={5}>
              <Flex justify="space-between" align="center">
                <Text fontSize="5xl" lineHeight="1" fontWeight="bold" color={BRAND_BLUE}>
                  {overview.contactStrengthScore}%
                </Text>
                <Badge
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  colorScheme={overview.contactStrengthScore >= 70 ? "green" : "blue"}
                  variant="subtle"
                  textTransform="none"
                >
                  {overview.affinityLabel}
                </Badge>
              </Flex>

              <Box mt={5} bg="#E7EEF8" borderRadius="full" h="10px" overflow="hidden">
                <Box
                  h="100%"
                  borderRadius="full"
                  bg={BRAND_BLUE}
                  width={`${overview.contactStrengthScore}%`}
                />
              </Box>

              <Stack mt={5} spacing={3}>
                {overview.strengthChecks.map((check) => (
                  <HStack key={check.label} spacing={3} align="flex-start">
                    <Icon
                      as={FiCheckCircle}
                      color={check.isPositive ? BRAND_BLUE : "gray.300"}
                      mt={1}
                    />
                    <Text color={check.isPositive ? "gray.700" : "gray.500"}>
                      {check.label}
                    </Text>
                  </HStack>
                ))}
              </Stack>

              <Box mt={6} p={4} borderRadius="lg" bg="#EEF3FF" color="#5A6B8C">
                <Text fontStyle="italic">{overview.insight}</Text>
              </Box>
            </Box>
          </SurfaceCard>
        </Stack>
      </GridItem>
    </Grid>
  );
}

/**
 * Renders the lists tab using placeholder membership data.
 * @returns {JSX.Element}
 */
export function PersonListsPanel() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const filteredRows = LIST_ROWS.filter((row) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      [row.title, row.subtitle, row.type, row.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesType = typeFilter === "All Types" || row.type === typeFilter;
    const matchesStatus = statusFilter === "All Statuses" || row.status === statusFilter;

    return matchesQuery && matchesType && matchesStatus;
  });

  return (
    <Stack spacing={6}>
      <SurfaceCard>
        <Grid templateColumns={{ base: "1fr", lg: "repeat(4, minmax(0, 1fr))" }} gap={4}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
              Title
            </Text>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="#718096" />
              </InputLeftElement>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search lists..."
                bg="#F5F8FE"
              />
            </InputGroup>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
              Type
            </Text>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} bg="#F5F8FE">
              <option>All Types</option>
              <option>Sales Pipeline</option>
              <option>Marketing</option>
              <option>Retention</option>
              <option>Internal</option>
            </Select>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
              Status
            </Text>
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              bg="#F5F8FE"
            >
              <option>All Statuses</option>
              <option>Active</option>
              <option>Archived</option>
              <option>Draft</option>
            </Select>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
              Date Range
            </Text>
            <Input placeholder="Select dates" bg="#F5F8FE" readOnly />
          </Box>
        </Grid>
      </SurfaceCard>

      <SurfaceCard p={0}>
        <TableContainer>
          <Table variant="unstyled">
            <Thead bg="#EEF4FF">
              <Tr>
                <Th px={{ base: 5, md: 6 }} py={4} color="gray.600" fontSize="xs">
                  List Title
                </Th>
                <Th px={{ base: 5, md: 4 }} py={4} color="gray.600" fontSize="xs">
                  List Type
                </Th>
                <Th px={{ base: 5, md: 4 }} py={4} color="gray.600" fontSize="xs">
                  Status
                </Th>
                <Th px={{ base: 5, md: 4 }} py={4} color="gray.600" fontSize="xs">
                  Date Created
                </Th>
                <Th px={{ base: 5, md: 6 }} py={4} color="gray.600" fontSize="xs" textAlign="right">
                  Actions
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredRows.map((row, index) => (
                <Tr key={`${row.title}-${index}`} borderTopWidth="1px" borderColor={BORDER_COLOR}>
                  <Td px={{ base: 5, md: 6 }} py={5}>
                    <HStack spacing={4}>
                      <Flex
                        boxSize="40px"
                        borderRadius="lg"
                        bg={row.iconBg}
                        color={row.iconColor}
                        align="center"
                        justify="center"
                        flexShrink={0}
                      >
                        <Icon as={row.icon} boxSize={5} />
                      </Flex>
                      <Box>
                        <Text fontSize="2xl" fontWeight="medium" color="gray.900" lineHeight="1.1">
                          {row.title}
                        </Text>
                        <Text mt={1} color="gray.600">
                          {row.subtitle}
                        </Text>
                      </Box>
                    </HStack>
                  </Td>
                  <Td px={{ base: 5, md: 4 }} py={5} color="gray.800">
                    {row.type}
                  </Td>
                  <Td px={{ base: 5, md: 4 }} py={5}>
                    <Badge
                      px={3}
                      py={1.5}
                      borderRadius="full"
                      colorScheme={getListStatusColorScheme(row.status)}
                      variant="subtle"
                      textTransform="none"
                    >
                      {row.status}
                    </Badge>
                  </Td>
                  <Td px={{ base: 5, md: 4 }} py={5} color="gray.800">
                    {row.dateCreated}
                  </Td>
                  <Td px={{ base: 5, md: 6 }} py={5} textAlign="right">
                    <IconButton
                      aria-label={`List actions for ${row.title}`}
                      icon={<FiMoreVertical />}
                      variant="ghost"
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        <Flex
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
          gap={4}
          direction={{ base: "column", md: "row" }}
          px={{ base: 5, md: 6 }}
          py={5}
          borderTopWidth="1px"
          borderColor={BORDER_COLOR}
        >
          <Text color="gray.700">Showing 1 to {filteredRows.length} of 24 results</Text>
          <HStack spacing={2}>
            <Button variant="outline" isDisabled>
              Previous
            </Button>
            <Button colorScheme="blue">1</Button>
            <Button variant="ghost">2</Button>
            <Button variant="ghost">3</Button>
            <Button variant="outline">Next</Button>
          </HStack>
        </Flex>
      </SurfaceCard>
    </Stack>
  );
}

/**
 * Renders the similar-contacts tab using stitched placeholder cards.
 * @returns {JSX.Element}
 */
export function PersonSimilarContactsPanel() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredContacts = SIMILAR_CONTACTS.filter((contact) => {
    if (!normalizedQuery) {
      return true;
    }

    return [contact.name, contact.title, contact.company, ...contact.skills]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <Stack spacing={6}>
      <Flex
        align={{ base: "stretch", lg: "center" }}
        justify="space-between"
        gap={4}
        direction={{ base: "column", lg: "row" }}
      >
        <InputGroup maxW={{ base: "full", lg: "minmax(0, 540px)" }} flex="1">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="#718096" />
          </InputLeftElement>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search similar contacts by name, role, or skill..."
            bg="white"
            borderColor={BORDER_COLOR}
            h="56px"
          />
        </InputGroup>

        <HStack spacing={3} flexWrap="wrap">
          <Button leftIcon={<FiFilter />} variant="outline">
            Filter
          </Button>
          <Button leftIcon={<FiGrid />} variant="outline">
            Sort by Match
          </Button>
          <Box h="24px" w="1px" bg={BORDER_COLOR} display={{ base: "none", md: "block" }} />
          <Button colorScheme="blue">Export List</Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing={6}>
        {filteredContacts.map((contact) => (
          <SurfaceCard key={`${contact.name}-${contact.company}`} p={{ base: 5, md: 6 }} minH="240px">
            <HStack spacing={4} align="flex-start">
              <Avatar
                name={contact.name}
                boxSize="64px"
                borderRadius="20px"
                bg="#E6EEFF"
                color={BRAND_BLUE}
              />
              <Box>
                <Text fontSize="2xl" fontWeight="medium" color="gray.900" lineHeight="1.1">
                  {contact.name}
                </Text>
                <Text mt={1} color="gray.700" fontSize="xl">
                  {contact.title}
                </Text>
                <Text mt={1} color={BRAND_BLUE} fontSize="2xl" letterSpacing="0.08em" textTransform="uppercase">
                  {contact.company}
                </Text>
              </Box>
            </HStack>

            <Box mt={10}>
              <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                Matching Skills
              </Text>
              <Flex mt={4} wrap="wrap" gap={3}>
                {contact.skills.map((skill) => (
                  <Badge
                    key={`${contact.name}-${skill}`}
                    px={3}
                    py={2}
                    borderRadius="full"
                    bg="#EEF3FF"
                    color="#123D86"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    {skill}
                  </Badge>
                ))}
              </Flex>
            </Box>
          </SurfaceCard>
        ))}
      </SimpleGrid>

      <HStack justify="center" spacing={4} pt={2}>
        <IconButton aria-label="Previous page" icon={<FiChevronLeft />} variant="outline" />
        <Button colorScheme="blue">1</Button>
        <Button variant="outline">2</Button>
        <Button variant="outline">3</Button>
        <IconButton aria-label="Next page" icon={<FiChevronRight />} variant="outline" />
      </HStack>
    </Stack>
  );
}

/**
 * Renders the notes tab using stitched placeholder cards.
 * @returns {JSX.Element}
 */
export function PersonNotesPanel() {
  return (
    <Stack spacing={6}>
      <Flex
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={4}
        direction={{ base: "column", md: "row" }}
      >
        <Box>
          <Heading color="#102F66">Internal Notes</Heading>
          <Text mt={2} color="gray.600">
            Confidential operational logs and stakeholder updates
          </Text>
        </Box>
        <Button colorScheme="blue" leftIcon={<FiCalendar />}>
          New Note
        </Button>
      </Flex>

      {PLACEHOLDER_NOTES.map((note, index) => (
        <SurfaceCard key={`${note.author}-${index}`}>
          <Flex
            align={{ base: "flex-start", lg: "center" }}
            justify="space-between"
            gap={4}
            direction={{ base: "column", lg: "row" }}
          >
            <HStack spacing={4}>
              <Avatar
                name={note.author}
                boxSize="48px"
                bg="#D9E7FF"
                color={BRAND_BLUE}
              />
              <Box>
                <Text fontSize="2xl" fontWeight="medium" color="gray.900">
                  {note.author}
                </Text>
                <Text mt={1} color={BRAND_BLUE} textTransform="uppercase" letterSpacing="0.08em">
                  {note.role}
                </Text>
              </Box>
            </HStack>

            <HStack spacing={3} color="gray.600">
              <Icon as={FiCalendar} />
              <Text>{note.timestamp}</Text>
            </HStack>
          </Flex>

          <Stack mt={6} spacing={4} color="gray.800">
            {note.paragraphs.map((paragraph) => (
              <Text key={paragraph} fontSize="xl" lineHeight="1.8">
                {paragraph}
              </Text>
            ))}
            {note.bullets.length ? (
              <Box pl={6}>
                {note.bullets.map((bullet) => (
                  <Text key={bullet} as="div" fontSize="xl" lineHeight="1.8">
                    • {bullet}
                  </Text>
                ))}
              </Box>
            ) : null}
          </Stack>

          <HStack mt={6} spacing={3} pt={4} borderTopWidth="1px" borderColor={BORDER_COLOR} flexWrap="wrap">
            {note.tags.map((tag) => (
              <Badge
                key={`${note.author}-${tag}`}
                px={3}
                py={1.5}
                borderRadius="full"
                bg="#EEF3FF"
                color="#123D86"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                {tag}
              </Badge>
            ))}
          </HStack>
        </SurfaceCard>
      ))}

      <Button alignSelf="center" variant="ghost" color={BRAND_BLUE}>
        Load Archived Notes
      </Button>
    </Stack>
  );
}
