import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
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
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { Link, useParams } from "@remix-run/react";
import { useState } from "react";
import { FiChevronLeft, FiExternalLink, FiFile, FiMail, FiPhone, FiSettings } from "react-icons/fi";
import { MdAdd } from "react-icons/md";
import { ToastRichTextEditor } from "../components/ToastRichTextEditor";
import { MilestoneChevrons } from "../components/MilestoneChevrons";
import {
  ES_MILESTONE_PHASES,
  ES_MILESTONES,
  MOCK_ES_CANDIDATES,
  MOCK_ES_DOCUMENTS,
  MOCK_ES_SERVICES,
  MOCK_OUTREACH_CAMPAIGNS,
} from "../models/services-mock-data.mjs";

const BRAND_BLUE = "#0F4C81";
const BRAND_RED = "#D72638";
const BORDER_COLOR = "#D7DFEC";
const PAGE_BG = "#F8FAFC";
const GREEN_DONE = "#276749";

const STAGE_COLORS = {
  "Deep Dive": "purple",
  Screened: "blue",
  Proposed: "orange",
  Contacted: "gray",
};

const STATUS_COLORS = { active: "green", placed: "blue", lost: "red" };

const FILE_TYPE_LABELS = {
  pdf:   { label: "PDF",   bg: "#FFF0F0", color: "#C0392B" },
  word:  { label: "DOCX",  bg: "#EFF6FF", color: "#1D4ED8" },
  excel: { label: "XLSX",  bg: "#F0FFF4", color: "#166534" },
  ppt:   { label: "PPTX",  bg: "#FFF8F0", color: "#C2410C" },
};

const CANDIDATE_LISTS = [
  { id: "all",    label: "All Candidates" },
  { id: "pot-1",  label: "Potentials — Round 1" },
  { id: "li-mar", label: "LinkedIn List — March 2026" },
  { id: "src-q1", label: "Sourced Contacts — Q1" },
];

const JOB_START = new Date("2026-03-31");
const TODAY_STR = "2026-04-24";
const TODAY = new Date(TODAY_STR);

function dayNumToDate(dayNum) {
  const d = new Date(JOB_START);
  d.setDate(d.getDate() + dayNum - 1);
  return d.toISOString().split("T")[0];
}

function parseTargetDate(target) {
  const m = target.match(/Day\s*(\d+)/i);
  if (!m) return null;
  return dayNumToDate(parseInt(m[1], 10));
}

function isOverdue(targetDate, status) {
  if (!targetDate || status === "Completed") return false;
  return new Date(targetDate) < TODAY;
}

const ASSIGNEE_MAP = { Recruiter: "Adam Zillig" };
function resolveAssignee(role) {
  return ASSIGNEE_MAP[role] || role;
}

// ── shared sub-components ──────────────────────────────────────────────────────

function FieldRow({ label, value, children }) {
  return (
    <Flex py={2.5} borderBottomWidth="1px" borderColor="gray.100" gap={4} align="flex-start">
      <Text fontSize="sm" color="gray.500" fontWeight="medium" w="180px" flexShrink={0}>
        {label}
      </Text>
      {children ?? (
        <Text fontSize="sm" color={value ? "gray.800" : "gray.300"}>
          {value || "—"}
        </Text>
      )}
    </Flex>
  );
}

function FieldItem({ label, value, children }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.400" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.06em" mb={1}>
        {label}
      </Text>
      {children ?? (
        <Text fontSize="sm" color={value ? "gray.800" : "gray.300"} fontWeight="medium">
          {value || "—"}
        </Text>
      )}
    </Box>
  );
}

function SectionBox({ title, children }) {
  return (
    <Box bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" overflow="hidden" shadow="sm">
      <Box px={5} py={3} borderBottomWidth="1px" borderColor={BORDER_COLOR} bg={PAGE_BG}>
        <Text fontWeight="bold" fontSize="sm" color="gray.700">{title}</Text>
      </Box>
      <Box px={5} py={3}>{children}</Box>
    </Box>
  );
}

// ── Milestones Tab ─────────────────────────────────────────────────────────────

function MilestonesTab({ service }) {
  const active = service.activePhaseIndex;

  // Order: active first, then upcoming (ascending), completed at bottom
  const upcoming = ES_MILESTONE_PHASES.slice(active + 1);
  const done = ES_MILESTONE_PHASES.slice(0, active);
  const ordered = [
    ES_MILESTONE_PHASES[active],
    ...upcoming,
    ...done,
  ];

  return (
    <VStack align="stretch" spacing={3}>
      {ordered.map((phase) => {
        const phaseIdx = ES_MILESTONE_PHASES.indexOf(phase);
        const isDone = phaseIdx < active;
        const isActive = phaseIdx === active;

        const completedCount = phase.tasks.filter((t) => t.status === "Completed").length;
        const overdueCount = phase.tasks.filter((t) => {
          const d = parseTargetDate(t.target);
          return isOverdue(d, t.status);
        }).length;

        const borderColor = isDone ? "#276749" : isActive ? BRAND_RED : BORDER_COLOR;
        const headerBg = isDone ? "#F0FFF4" : isActive ? "#FFF5F5" : PAGE_BG;

        return (
          <Box
            key={phase.key}
            bg="white"
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="xl"
            overflow="hidden"
            shadow="sm"
          >
            <Flex px={5} py={3} bg={headerBg} align="center" justify="space-between" flexWrap="wrap" gap={2}>
              <HStack spacing={3}>
                <Badge
                  colorScheme={isDone ? "green" : isActive ? "red" : "gray"}
                  borderRadius="full"
                  px={2}
                >
                  Phase {phaseIdx + 1}
                </Badge>
                <Text fontWeight="bold" fontSize="sm" color="gray.800">{phase.label}</Text>
              </HStack>
              <HStack spacing={2}>
                {overdueCount > 0 && !isDone && (
                  <Badge colorScheme="red" variant="solid" fontSize="xs" borderRadius="full" px={2}>
                    {overdueCount} overdue
                  </Badge>
                )}
                <Text fontSize="xs" color="gray.500">{completedCount}/{phase.tasks.length} complete</Text>
                {isDone && <Badge colorScheme="green" variant="subtle">Done</Badge>}
                {isActive && <Badge colorScheme="red" variant="subtle">In Progress</Badge>}
              </HStack>
            </Flex>

            <Text fontSize="xs" color="gray.400" px={5} pt={2} pb={1}>{phase.description}</Text>

            <Box overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th color="gray.400" fontSize="xs">Task</Th>
                    <Th color="gray.400" fontSize="xs" whiteSpace="nowrap">Target Date</Th>
                    <Th color="gray.400" fontSize="xs">Assigned To</Th>
                    <Th color="gray.400" fontSize="xs">Status</Th>
                    <Th color="gray.400" fontSize="xs" whiteSpace="nowrap">Completed</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {phase.tasks.map((task) => {
                    const targetDate = parseTargetDate(task.target);
                    const overdue = isOverdue(targetDate, task.status);
                    return (
                      <Tr key={task.id} _hover={{ bg: "gray.50" }} bg={overdue ? "#FFF8F8" : undefined}>
                        <Td maxW="380px">
                          <Text fontSize="xs" color="gray.700" whiteSpace="normal">{task.task}</Text>
                        </Td>
                        <Td whiteSpace="nowrap">
                          <VStack align="start" spacing={0}>
                            <Text fontSize="xs" color={overdue ? "red.600" : "gray.600"} fontWeight={overdue ? "semibold" : "normal"}>
                              {targetDate || task.target}
                            </Text>
                            {overdue && (
                              <Text fontSize="9px" color="red.500" textTransform="uppercase" letterSpacing="0.05em">
                                Overdue
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td>
                          <Text fontSize="xs" color="gray.700">{resolveAssignee(task.assignedTo)}</Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={task.status === "Completed" ? "green" : overdue ? "red" : "gray"}
                            variant="subtle"
                            fontSize="xs"
                          >
                            {task.status || (overdue ? "Overdue" : "Pending")}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="xs" color="gray.500">{task.completedDate || "—"}</Text>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>
        );
      })}
    </VStack>
  );
}

// ── Details Tab ────────────────────────────────────────────────────────────────

function DetailsTab({ service }) {
  const isPlaced = service.status === "placed";
  const businessLabel = service.businessType === "new" ? "New Business" : "Existing Business";

  return (
    <VStack align="stretch" spacing={4}>
      <SectionBox title="Basics">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5} py={1}>
          <FieldItem label="Engagement Type" value={businessLabel} />
          <FieldItem label="Recruiter" value={service.recruiter} />
          <FieldItem label="Originator" value={service.originator} />
          <FieldItem label="Client Manager" value={service.clientManager} />
          <FieldItem label="Executive Sponsor" value={service.executiveSponsor} />
          <FieldItem label="Parent Lead" value="—" />
        </SimpleGrid>
      </SectionBox>

      <SectionBox title="Client Details">
        <FieldRow label="Company Name" value={service.company?.name} />
        <FieldRow label="Primary Client Contact">
          {service.primaryContact ? (
            <HStack spacing={4} flexWrap="wrap">
              <Text fontSize="sm" fontWeight="medium" color="gray.800">{service.primaryContact.name}</Text>
              <HStack spacing={1}>
                <Icon as={FiMail} color="gray.400" boxSize={3.5} />
                <ChakraLink href={`mailto:${service.primaryContact.email}`} fontSize="sm" color={BRAND_BLUE}>
                  {service.primaryContact.email}
                </ChakraLink>
              </HStack>
              <HStack spacing={1}>
                <Icon as={FiPhone} color="gray.400" boxSize={3.5} />
                <Text fontSize="sm" color="gray.700">{service.primaryContact.phone}</Text>
              </HStack>
            </HStack>
          ) : <Text fontSize="sm" color="gray.300">—</Text>}
        </FieldRow>
        <FieldRow label="Secondary Client Contact">
          {service.secondaryContact ? (
            <HStack spacing={4} flexWrap="wrap">
              <Text fontSize="sm" fontWeight="medium" color="gray.800">{service.secondaryContact.name}</Text>
              <HStack spacing={1}>
                <Icon as={FiMail} color="gray.400" boxSize={3.5} />
                <ChakraLink href={`mailto:${service.secondaryContact.email}`} fontSize="sm" color={BRAND_BLUE}>
                  {service.secondaryContact.email}
                </ChakraLink>
              </HStack>
              <HStack spacing={1}>
                <Icon as={FiPhone} color="gray.400" boxSize={3.5} />
                <Text fontSize="sm" color="gray.700">{service.secondaryContact.phone}</Text>
              </HStack>
            </HStack>
          ) : <Text fontSize="sm" color="gray.300">—</Text>}
        </FieldRow>
        <FieldRow label="Bill To Address" value={`${service.company?.city}, ${service.company?.state}`} />
      </SectionBox>

      <SectionBox title="Agreement">
        <FieldRow
          label="Target Compensation"
          value={service.targetCompLow
            ? `$${(service.targetCompLow / 1000).toFixed(0)}k – $${(service.targetCompHigh / 1000).toFixed(0)}k`
            : "—"}
        />
        <FieldRow label="Target Bonus" value={service.targetBonus || "—"} />
        <FieldRow label="Fee % to Client" value={service.feePct ? `${service.feePct}%` : "—"} />
        <FieldRow label="Flat Fee" value={service.flatFee ? `$${service.flatFee.toLocaleString()}` : "—"} />
        <FieldRow label="Show Name / Title on Invoice" value="Yes" />
      </SectionBox>

      <SectionBox title="Service Timeline">
        <FieldRow label="Lost Reason" value="—" />
        <FieldRow label="Job Close Date" value="—" />
        <FieldRow label="Re-Opened Date" value="—" />
        <FieldRow label="Original Job Close Date" value="—" />
      </SectionBox>

      {isPlaced && service.placement && (
        <SectionBox title="Placement Details">
          <FieldRow label="Date of Agreement Execution" value={service.placement.dateOfAgreementExecution || "—"} />
          <FieldRow label="Base Salary" value={`$${service.placement.baseSalary.toLocaleString()}`} />
          <FieldRow label="Start Date (agreed)" value={service.placement.startDate} />
          <FieldRow label="Actual Start Date" value={service.placement.actualStartDate || "—"} />
          <FieldRow label="Completed Search Email" value="Sent" />
          <FieldRow label="Annual Bonus Target" value={`$${service.placement.annualBonusAmount.toLocaleString()}`} />
          <FieldRow label="Guaranteed Bonus" value={service.placement.guaranteedBonus ? "Yes" : "No"} />
        </SectionBox>
      )}

      <RelatedOpportunity />
    </VStack>
  );
}

// ── Candidates Tab ─────────────────────────────────────────────────────────────

function CandidatesTab() {
  const [selectedList, setSelectedList] = useState("all");

  const topCandidates = MOCK_ES_CANDIDATES.filter((c) =>
    ["Deep Dive", "Screened"].includes(c.stage)
  );

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Text fontWeight="bold" fontSize="sm" color="gray.700" mb={3}>Top Candidates</Text>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
          {topCandidates.map((c) => (
            <Box
              key={c.id}
              bg="white"
              borderWidth="1px"
              borderColor={BORDER_COLOR}
              borderRadius="lg"
              px={4}
              py={3}
              shadow="sm"
            >
              <HStack justify="space-between" mb={1}>
                <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>{c.name}</Text>
                <IconButton
                  aria-label="Open candidate in new window"
                  icon={<FiExternalLink />}
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  onClick={() => window.open("#", "_blank", "noreferrer")}
                />
              </HStack>
              <Text fontSize="xs" color="gray.500" noOfLines={1} mb={2}>{c.title}</Text>
              <Badge colorScheme={STAGE_COLORS[c.stage] || "gray"} fontSize="xs" borderRadius="full" px={2}>
                {c.stage}
              </Badge>
              {c.nextStep && (
                <Text fontSize="xs" color="gray.500" mt={2} noOfLines={1}>{c.nextStep}</Text>
              )}
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <Divider />

      <Box>
        <Flex justify="space-between" align="center" mb={3} flexWrap="wrap" gap={3}>
          <Select
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            w="auto"
            maxW="280px"
            bg="white"
            borderColor="gray.200"
            fontWeight="semibold"
            fontSize="sm"
          >
            {CANDIDATE_LISTS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
          <HStack spacing={2}>
            <Button size="sm" leftIcon={<Icon as={MdAdd} />} colorScheme="blue" variant="outline">
              Add Candidate
            </Button>
            <Button size="sm" leftIcon={<Icon as={MdAdd} />} variant="ghost">
              New List
            </Button>
          </HStack>
        </Flex>

        <Box bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" overflow="hidden" shadow="sm">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr bg={PAGE_BG}>
                <Th fontSize="xs">Candidate</Th>
                <Th fontSize="xs">Title</Th>
                <Th fontSize="xs">Location</Th>
                <Th fontSize="xs">Stage</Th>
                <Th fontSize="xs">Status</Th>
                <Th fontSize="xs">Next Step</Th>
                <Th fontSize="xs" />
              </Tr>
            </Thead>
            <Tbody>
              {MOCK_ES_CANDIDATES.map((c) => (
                <Tr key={c.id} _hover={{ bg: "gray.50" }}>
                  <Td fontWeight="medium" fontSize="sm">{c.name}</Td>
                  <Td fontSize="sm" color="gray.600">{c.title}</Td>
                  <Td fontSize="sm" color="gray.500">{c.location}</Td>
                  <Td>
                    <Badge colorScheme={STAGE_COLORS[c.stage] || "gray"} fontSize="xs" borderRadius="full" px={2}>
                      {c.stage}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={c.status === "Interested" ? "green" : c.status === "Not Interested" ? "red" : "gray"}
                      variant="subtle"
                      fontSize="xs"
                    >
                      {c.status}
                    </Badge>
                  </Td>
                  <Td fontSize="xs" color="gray.500" maxW="200px">
                    <Text noOfLines={1}>{c.nextStep || "—"}</Text>
                  </Td>
                  <Td>
                    <IconButton
                      aria-label="View candidate"
                      icon={<FiExternalLink />}
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={() => window.open("#", "_blank", "noreferrer")}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </VStack>
  );
}

// ── Outreach Tab ───────────────────────────────────────────────────────────────

function OutreachTab() {
  return (
    <VStack align="stretch" spacing={4}>
      <Flex justify="space-between" align="center">
        <Text fontWeight="bold" fontSize="sm" color="gray.700">Campaigns</Text>
        <Menu>
          <MenuButton as={IconButton} icon={<FiSettings />} variant="outline" size="sm" aria-label="Outreach options" />
          <MenuList>
            <MenuItem>Clone Campaign</MenuItem>
            <MenuItem>View Results</MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {MOCK_OUTREACH_CAMPAIGNS.map((camp) => (
        <Box key={camp.id} bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" px={5} py={4} shadow="sm">
          <HStack justify="space-between" mb={3}>
            <Box>
              <Text fontWeight="semibold" color="gray.800">{camp.name}</Text>
              <Text fontSize="xs" color="gray.400">Sent {camp.sentDate}</Text>
            </Box>
          </HStack>
          <SimpleGrid columns={5} spacing={4}>
            {[
              { label: "Recipients", value: camp.recipients },
              { label: "Opens", value: camp.opens },
              { label: "Clicks", value: camp.clicks },
              { label: "Replies", value: camp.replies },
              { label: "Interested", value: camp.interested },
            ].map(({ label, value }) => (
              <Box key={label} textAlign="center">
                <Text fontSize="xl" fontWeight="bold" color={BRAND_BLUE}>{value}</Text>
                <Text fontSize="xs" color="gray.500">{label}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </VStack>
  );
}

// ── Job Description Tab ────────────────────────────────────────────────────────

const FAKE_JD_HTML = `
<h1>Chief Financial Officer</h1>
<h2>The Fallon Company — Boston, MA</h2>

<h3>About the Company</h3>
<p>The Fallon Company is a leading real estate development and management firm headquartered in Boston, Massachusetts. With over 30 years of experience, Fallon has developed more than 7 million square feet of office, residential, and mixed-use space across New England, known for complex urban infill projects that transform neighborhoods.</p>

<h3>Position Overview</h3>
<p>The Chief Financial Officer will serve as a key member of the executive leadership team, reporting directly to the CEO. The CFO will be responsible for all financial functions including strategic planning, financial reporting, treasury management, risk management, and investor relations.</p>

<h3>Key Responsibilities</h3>
<ul>
<li>Lead the financial strategy and long-range planning process in collaboration with the CEO and Board</li>
<li>Oversee all financial reporting, budgeting, forecasting, and analysis for the company and its asset portfolio</li>
<li>Manage relationships with lenders, investors, and financial institutions</li>
<li>Direct treasury operations including capital allocation, debt management, and cash flow planning</li>
<li>Ensure compliance with all financial regulations, tax obligations, and accounting standards</li>
<li>Lead and develop a high-performing finance and accounting team of 12 professionals</li>
<li>Evaluate and execute strategic transactions including acquisitions, dispositions, and joint ventures</li>
</ul>

<h3>Qualifications</h3>
<ul>
<li>15+ years of progressive financial leadership, with at least 5 years as CFO or equivalent</li>
<li>Experience in real estate development, investment management, or related industry strongly preferred</li>
<li>Deep expertise in real estate finance including construction lending, permanent financing, and equity structures</li>
<li>CPA certification required; MBA preferred</li>
<li>Exceptional communication skills with the ability to present complex financial information to diverse audiences</li>
</ul>

<h3>Compensation</h3>
<p>Target base salary <strong>$250,000 – $320,000</strong> annually, with performance bonus potential of 25% of base. Comprehensive benefits package included.</p>
`;

function JobDescriptionTab() {
  const [value, setValue] = useState(FAKE_JD_HTML);
  return (
    <Box>
      <ToastRichTextEditor value={value} onChange={setValue} height="520px" />
    </Box>
  );
}

// ── Documents Tab ──────────────────────────────────────────────────────────────

function DocumentsTab() {
  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="sm" color="gray.500" mb={1}>
        Files stored in SharePoint. Generate any missing documents below.
      </Text>

      <Box bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" overflow="hidden" shadow="sm">
        <Table size="sm" variant="simple">
          <Thead>
            <Tr bg={PAGE_BG}>
              <Th fontSize="xs">Type</Th>
              <Th fontSize="xs">File Name</Th>
              <Th fontSize="xs">Category</Th>
              <Th fontSize="xs" whiteSpace="nowrap">Last Updated</Th>
              <Th fontSize="xs" />
            </Tr>
          </Thead>
          <Tbody>
            {MOCK_ES_DOCUMENTS.map((doc) => {
              const ft = FILE_TYPE_LABELS[doc.fileType] || FILE_TYPE_LABELS.pdf;
              return (
                <Tr key={doc.id} _hover={{ bg: "gray.50" }}>
                  <Td>
                    {doc.exists ? (
                      <Box
                        display="inline-block"
                        px={2}
                        py={0.5}
                        borderRadius="md"
                        bg={ft.bg}
                        color={ft.color}
                        fontSize="10px"
                        fontWeight="bold"
                        letterSpacing="0.04em"
                        minW="42px"
                        textAlign="center"
                      >
                        {ft.label}
                      </Box>
                    ) : (
                      <Box
                        display="inline-block"
                        px={2}
                        py={0.5}
                        borderRadius="md"
                        bg="gray.100"
                        color="gray.400"
                        fontSize="10px"
                        fontWeight="bold"
                        letterSpacing="0.04em"
                        minW="42px"
                        textAlign="center"
                      >
                        —
                      </Box>
                    )}
                  </Td>
                  <Td>
                    {doc.exists ? (
                      <HStack spacing={2}>
                        <Icon as={FiFile} color="gray.400" boxSize={3.5} />
                        <ChakraLink
                          href={doc.href}
                          isExternal
                          fontSize="sm"
                          color={BRAND_BLUE}
                          fontWeight="medium"
                          _hover={{ textDecoration: "underline" }}
                          onClick={(e) => e.preventDefault()}
                        >
                          {doc.filename}
                        </ChakraLink>
                      </HStack>
                    ) : (
                      <Text fontSize="sm" color="gray.400" fontStyle="italic">Not yet generated</Text>
                    )}
                  </Td>
                  <Td>
                    <Text fontSize="xs" color="gray.500">{doc.category}</Text>
                  </Td>
                  <Td whiteSpace="nowrap">
                    <Text fontSize="xs" color="gray.500">{doc.updatedAt || "—"}</Text>
                  </Td>
                  <Td>
                    {doc.exists ? (
                      <IconButton
                        aria-label="Open file"
                        icon={<FiExternalLink />}
                        size="xs"
                        variant="ghost"
                        colorScheme="blue"
                        onClick={() => window.open(doc.href, "_blank", "noreferrer")}
                      />
                    ) : (
                      <Button size="xs" colorScheme="blue" variant="outline" px={3}>
                        Generate
                      </Button>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </VStack>
  );
}

// ── Client Hub Tab ─────────────────────────────────────────────────────────────

function ClientHubTab() {
  return (
    <VStack align="stretch" spacing={4}>
      <Box bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" px={5} py={4} shadow="sm">
        <Flex justify="space-between" align="center" mb={4}>
          <Box>
            <Text fontWeight="bold" color="gray.800">Client Hub</Text>
            <Text fontSize="sm" color="gray.500" mt={1}>SharePoint portal for client collaboration</Text>
          </Box>
          <Button
            leftIcon={<Icon as={FiExternalLink} />}
            colorScheme="blue"
            size="sm"
            variant="outline"
            onClick={() => window.open("#", "_blank", "noreferrer")}
          >
            Open Hub
          </Button>
        </Flex>
        <Divider mb={4} />
        <Text fontWeight="semibold" fontSize="sm" color="gray.700" mb={3}>Invite to Hub</Text>
        <HStack>
          <Box flex={1} h="38px" borderWidth="1px" borderColor="gray.200" borderRadius="md" px={3} display="flex" alignItems="center" bg="gray.50">
            <Text fontSize="sm" color="gray.400">Email address...</Text>
          </Box>
          <Button colorScheme="blue" size="sm">Invite</Button>
        </HStack>
      </Box>

      <Box bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" px={5} py={4} shadow="sm">
        <Text fontWeight="semibold" fontSize="sm" color="gray.700" mb={3}>Hub Members</Text>
        {["Adam Zillig (azillig@fallon.com)", "Lisa Park (lpark@fallon.com)"].map((person) => (
          <HStack key={person} py={2} borderBottomWidth="1px" borderColor="gray.100" justify="space-between">
            <Text fontSize="sm" color="gray.700">{person}</Text>
            <Badge colorScheme="green" variant="subtle" fontSize="xs">Active</Badge>
          </HStack>
        ))}
      </Box>
    </VStack>
  );
}

// ── Related Opportunity (bottom of page) ───────────────────────────────────────

function RelatedOpportunity() {
  return (
    <Box bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" px={5} py={4} shadow="sm">
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontWeight="bold" fontSize="sm" color="gray.700">Related Opportunity</Text>
        <IconButton
          aria-label="Open opportunity"
          icon={<FiExternalLink />}
          size="sm"
          variant="ghost"
          colorScheme="blue"
          onClick={() => window.open("#", "_blank", "noreferrer")}
        />
      </Flex>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <FieldItem label="Opportunity" value="CFO — The Fallon Company" />
        <FieldItem label="Stage" value="Proposal / Price Quote" />
        <FieldItem label="Amount" value="$105,600" />
        <FieldItem label="Close Date" value="2026-06-30" />
      </SimpleGrid>
    </Box>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EsJobDetailPage() {
  const { jobId } = useParams();
  const service = MOCK_ES_SERVICES.find((s) => s.id === jobId) || MOCK_ES_SERVICES[0];

  const tabs = ["Milestones", "Details", "Candidates", "Outreach", "Job Description", "Documents", "Client Hub"];

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor={BORDER_COLOR}
      borderRadius="24px"
      overflow="hidden"
      shadow="sm"
    >
      <Box px={{ base: 5, md: 8 }} pt={6} pb={0}>
        <Box
          as={Link}
          to="/jobs/all-es-jobs"
            display="inline-flex"
            alignItems="center"
            gap={1}
            fontSize="sm"
            color="gray.500"
            _hover={{ color: BRAND_BLUE, textDecoration: "none" }}
            mb={4}
          >
            <Icon as={FiChevronLeft} boxSize={4} />
            ES Services
          </Box>

          <Flex align="flex-start" justify="space-between" gap={4}>
            <Box flex={1} minW={0}>
              <Flex align="center" gap={2} mb={1} flexWrap="wrap">
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.400">
                  Executive Search
                </Text>
                <Badge colorScheme={STATUS_COLORS[service.status] || "gray"} borderRadius="full" px={2} fontSize="xs">
                  {service.statusLabel}
                </Badge>
              </Flex>

              <Heading as="h1" size="xl" color="gray.900" lineHeight="shorter" mb={1}>
                {service.title}
              </Heading>

              <HStack spacing={4} flexWrap="wrap">
                <Text fontSize="md" color="gray.600" fontWeight="medium">{service.subtitle}</Text>
                <Text fontSize="sm" color="gray.400">{service.location}</Text>
              </HStack>

              <Box mt={5} mb={4}>
                <MilestoneChevrons milestones={ES_MILESTONES} activeIndex={service.activePhaseIndex} size="lg" />
              </Box>
            </Box>

            <Menu>
              <MenuButton
                as={IconButton}
                aria-label="Service options"
                icon={<FiSettings />}
                variant="outline"
                colorScheme="gray"
                borderColor={BORDER_COLOR}
                alignSelf="flex-start"
                flexShrink={0}
              />
              <MenuList>
                <MenuItem onClick={() => window.open("#", "_blank", "noreferrer")}>
                  View in Power Center
                </MenuItem>
                <MenuItem>Create Client Hub</MenuItem>
                <MenuItem>Clone Service</MenuItem>
                <MenuItem color="red.500">Close Service</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Box>

        <Box bg={PAGE_BG} borderTopWidth="1px" borderColor={BORDER_COLOR}>
          <Tabs variant="unstyled" isLazy>
            <TabList px={{ base: 3, md: 6 }} overflowX="auto" whiteSpace="nowrap">
              {tabs.map((label) => (
                <Tab
                  key={label}
                  px={3}
                  py={4}
                  fontSize="sm"
                  fontWeight="semibold"
                  color="gray.500"
                  borderBottomWidth="3px"
                  borderColor="transparent"
                  _selected={{ color: BRAND_BLUE, borderColor: BRAND_BLUE, fontWeight: "bold" }}
                  _hover={{ color: "gray.800" }}
                >
                  {label}
                </Tab>
              ))}
            </TabList>

            <Box bg="white" px={{ base: 4, md: 6 }} py={6}>
              <TabPanels>
                <TabPanel p={0}><MilestonesTab service={service} /></TabPanel>
                <TabPanel p={0}><DetailsTab service={service} /></TabPanel>
                <TabPanel p={0}><CandidatesTab /></TabPanel>
                <TabPanel p={0}><OutreachTab /></TabPanel>
                <TabPanel p={0}><JobDescriptionTab /></TabPanel>
                <TabPanel p={0}><DocumentsTab /></TabPanel>
                <TabPanel p={0}><ClientHubTab /></TabPanel>
              </TabPanels>
            </Box>
          </Tabs>
        </Box>
    </Box>
  );
}
