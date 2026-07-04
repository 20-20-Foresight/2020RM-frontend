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
import { FiChevronLeft, FiExternalLink, FiFile, FiMail, FiPhone, FiSettings } from "react-icons/fi";
import { MilestoneChevrons } from "../components/MilestoneChevrons";
import {
  EM_MILESTONES,
  MOCK_EM_DOCUMENTS,
  MOCK_EM_SERVICES,
  MOCK_OUTREACH_CAMPAIGNS,
} from "../models/services-mock-data.mjs";

const BRAND_BLUE = "#0F4C81";
const BRAND_RED = "#D72638";
const BORDER_COLOR = "#D7DFEC";
const PAGE_BG = "#F8FAFC";

const STATUS_COLORS = { active: "green", placed: "blue", lost: "red" };

const FILE_TYPE_LABELS = {
  pdf:   { label: "PDF",   bg: "#FFF0F0", color: "#C0392B" },
  word:  { label: "DOCX",  bg: "#EFF6FF", color: "#1D4ED8" },
  excel: { label: "XLSX",  bg: "#F0FFF4", color: "#166534" },
};

const EM_MILESTONE_PHASES = [
  {
    key: "intake",
    label: "Intake & Assessment",
    description: "Understanding the executive's goals, history, and transition requirements",
    tasks: [
      { id: "in-1", task: "Complete intake interview with executive candidate", target: "Day 1", assignedTo: "Primary Consultant", status: "Completed", completedDate: "2025-09-02" },
      { id: "in-2", task: "Administer Achiever assessment", target: "Day 2", assignedTo: "Researcher", status: "Completed", completedDate: "2025-09-04" },
      { id: "in-3", task: "Review resume, LinkedIn profile, and work history", target: "Day 2", assignedTo: "Primary Consultant", status: "Completed", completedDate: "2025-09-04" },
      { id: "in-4", task: "Identify target industries, roles, and compensation range", target: "Day 3", assignedTo: "Primary Consultant", status: "Completed", completedDate: "2025-09-05" },
    ],
  },
  {
    key: "program",
    label: "Program Setup",
    description: "Establishing agreements, schedule, and success metrics",
    tasks: [
      { id: "pg-1", task: "Execute program agreement and RTI", target: "Day 1", assignedTo: "Recruiter", status: "Completed", completedDate: "2025-09-02" },
      { id: "pg-2", task: "Create Salesforce EM Job Record and link to Opportunity", target: "Day 1", assignedTo: "Recruiter", status: "Completed", completedDate: "2025-09-02" },
      { id: "pg-3", task: "Schedule recurring monthly check-in calls", target: "Day 3", assignedTo: "Primary Consultant", status: "Completed", completedDate: "2025-09-05" },
      { id: "pg-4", task: "Draft personal marketing document (bio, value proposition)", target: "Day 5", assignedTo: "Primary Consultant", status: "Completed", completedDate: "2025-09-10" },
    ],
  },
  {
    key: "coaching",
    label: "Active Coaching",
    description: "Ongoing executive coaching sessions and skill development",
    tasks: [
      { id: "co-1", task: "Conduct monthly coaching session — career positioning", target: "Recurring", assignedTo: "Primary Consultant", status: "Completed", completedDate: "2026-04-01" },
      { id: "co-2", task: "Update and refine resume and LinkedIn profile", target: "Monthly", assignedTo: "Primary Consultant", status: "Completed", completedDate: "2026-04-10" },
      { id: "co-3", task: "Develop and rehearse executive value proposition narrative", target: "Monthly", assignedTo: "Primary Consultant", status: null, completedDate: null },
      { id: "co-4", task: "Conduct mock interview preparation session", target: "As needed", assignedTo: "Primary Consultant", status: null, completedDate: null },
      { id: "co-5", task: "Review compensation negotiation strategy", target: "Monthly", assignedTo: "Primary Consultant", status: null, completedDate: null },
    ],
  },
  {
    key: "outreach",
    label: "Client Outreach",
    description: "Connecting the executive with target organizations and decision-makers",
    tasks: [
      { id: "ou-1", task: "Build target company list (50+ organizations)", target: "Week 2", assignedTo: "Researcher", status: null, completedDate: null },
      { id: "ou-2", task: "Draft and send introduction emails to target contacts", target: "Recurring", assignedTo: "Recruiter", status: null, completedDate: null },
      { id: "ou-3", task: "Facilitate warm introductions from 20/20 network", target: "Recurring", assignedTo: "Originator", status: null, completedDate: null },
      { id: "ou-4", task: "Track and document all outreach activity in Salesforce", target: "Ongoing", assignedTo: "Recruiter", status: null, completedDate: null },
    ],
  },
  {
    key: "placement",
    label: "Placement",
    description: "Supporting offer negotiation and placement close-out",
    tasks: [
      { id: "pl-1", task: "Advise executive on offer evaluation and negotiation", target: "Upon offer", assignedTo: "Primary Consultant", status: null, completedDate: null },
      { id: "pl-2", task: "Issue RTI to VP Accounting for Success Fee billing", target: "Upon placement", assignedTo: "Recruiter", status: null, completedDate: null },
      { id: "pl-3", task: "Mark job as Placed in Salesforce; close the service record", target: "Upon placement", assignedTo: "Recruiter", status: null, completedDate: null },
    ],
  },
  {
    key: "onboarding",
    label: "Onboarding Support",
    description: "Coaching and support through the first 90 days of the new role",
    tasks: [
      { id: "ob-1", task: "Develop 30-60-90 day onboarding plan with executive", target: "Week before start", assignedTo: "Primary Consultant", status: null, completedDate: null },
      { id: "ob-2", task: "Conduct 30-day check-in call", target: "Day 30 post-start", assignedTo: "Primary Consultant", status: null, completedDate: null },
      { id: "ob-3", task: "Conduct 60-day check-in call", target: "Day 60 post-start", assignedTo: "Primary Consultant", status: null, completedDate: null },
      { id: "ob-4", task: "Conduct 90-day check-in call and final evaluation", target: "Day 90 post-start", assignedTo: "Primary Consultant", status: null, completedDate: null },
    ],
  },
  {
    key: "closeout",
    label: "Close Out",
    description: "Program close-out and relationship maintenance",
    tasks: [
      { id: "cl-1", task: "Draft completed placement announcement for 20/20 network", target: "Within 2 weeks of start", assignedTo: "Recruiter", status: null, completedDate: null },
      { id: "cl-2", task: "Archive all program documents in SharePoint", target: "Within 30 days of close", assignedTo: "Researcher", status: null, completedDate: null },
      { id: "cl-3", task: "Schedule annual anniversary check-in call", target: "1 year post-placement", assignedTo: "Primary Consultant", status: null, completedDate: null },
    ],
  },
];

// ── shared sub-components ──────────────────────────────────────────────────────

function FieldRow({ label, value, children }) {
  return (
    <Flex py={2.5} borderBottomWidth="1px" borderColor="gray.100" gap={4} align="flex-start">
      <Text fontSize="sm" color="gray.500" fontWeight="medium" w="200px" flexShrink={0}>
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
  const upcoming = EM_MILESTONE_PHASES.slice(active + 1);
  const done = EM_MILESTONE_PHASES.slice(0, active);
  const ordered = [EM_MILESTONE_PHASES[active], ...upcoming, ...done];

  const totalTasks = EM_MILESTONE_PHASES.flatMap((p) => p.tasks).length;
  const completedTasks = EM_MILESTONE_PHASES.flatMap((p) => p.tasks).filter((t) => t.status === "Completed").length;

  return (
    <VStack align="stretch" spacing={3}>
      <HStack justify="space-between">
        <Text fontSize="sm" color="gray.500">
          {completedTasks} of {totalTasks} tasks completed
        </Text>
        <Badge colorScheme="red" borderRadius="full" px={3} py={1}>
          Phase {active + 1}: {EM_MILESTONES[active]?.label}
        </Badge>
      </HStack>

      {ordered.map((phase) => {
        const phaseIdx = EM_MILESTONE_PHASES.indexOf(phase);
        const isDone = phaseIdx < active;
        const isActive = phaseIdx === active;

        const completedCount = phase.tasks.filter((t) => t.status === "Completed").length;
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
                    <Th color="gray.400" fontSize="xs" whiteSpace="nowrap">Target</Th>
                    <Th color="gray.400" fontSize="xs">Assigned To</Th>
                    <Th color="gray.400" fontSize="xs">Status</Th>
                    <Th color="gray.400" fontSize="xs" whiteSpace="nowrap">Completed</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {phase.tasks.map((task) => (
                    <Tr key={task.id} _hover={{ bg: "gray.50" }}>
                      <Td maxW="380px">
                        <Text fontSize="xs" color="gray.700" whiteSpace="normal">{task.task}</Text>
                      </Td>
                      <Td whiteSpace="nowrap">
                        <Text fontSize="xs" color="gray.600">{task.target}</Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs" color="gray.700">{task.assignedTo}</Text>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={task.status === "Completed" ? "green" : "gray"}
                          variant="subtle"
                          fontSize="xs"
                        >
                          {task.status || "Pending"}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontSize="xs" color="gray.500">{task.completedDate || "—"}</Text>
                      </Td>
                    </Tr>
                  ))}
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

  return (
    <VStack align="stretch" spacing={4}>
      <SectionBox title="Basics">
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={5} py={1}>
          <FieldItem label="Status" value={service.statusLabel} />
          <FieldItem label="Program Level" value={service.programLevel} />
          <FieldItem label="Recruiter" value={service.recruiter} />
          <FieldItem label="Primary Consultant" value={service.primaryConsultant} />
          <FieldItem label="Secondary Consultant" value={service.secondaryConsultant} />
          <FieldItem label="Researcher" value={service.researcher} />
          <FieldItem label="Originator" value={service.originator} />
          <FieldItem label="Executive Sponsor" value={service.executiveSponsor} />
        </SimpleGrid>
      </SectionBox>

      <SectionBox title="Client Details">
        <FieldRow label="Anniversary Date" value={service.anniversaryDate} />
        <FieldRow label="Primary Contact">
          {service.primaryContact ? (
            <HStack spacing={4} flexWrap="wrap">
              <Text fontSize="sm" color="gray.800" fontWeight="medium">{service.primaryContact.name}</Text>
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
        <FieldRow label="Bill To Address" value={service.location} />
      </SectionBox>

      <SectionBox title="Program Agreement">
        <FieldRow label="Fee" value={service.program?.fee ? `$${service.program.fee.toLocaleString()}` : "—"} />
        <FieldRow label="Installment Frequency" value={service.program?.installmentFrequency} />
        <FieldRow label="Number of Installments" value={service.program?.numberOfInstallments?.toString()} />
        <FieldRow label="Installments Paid" value={service.program?.installmentsPaid?.toString()} />
        <FieldRow label="Amount Paid to Date" value={service.program?.amountPaid ? `$${service.program.amountPaid.toLocaleString()}` : "—"} />
        <FieldRow label="Notes" value={service.program?.notes} />
      </SectionBox>

      <SectionBox title="Success Fee">
        <FieldRow
          label="Sourced By"
          value={service.successFee?.sourcedBy === "2020" ? "20/20 (percentage)" : "Client (flat amount)"}
        />
        {service.successFee?.sourcedBy === "2020" ? (
          <FieldRow label="Percentage" value={service.successFee?.percentage ? `${service.successFee.percentage}%` : "—"} />
        ) : (
          <FieldRow label="Flat Amount" value={service.successFee?.flatAmount ? `$${service.successFee.flatAmount.toLocaleString()}` : "—"} />
        )}
        <FieldRow label="Notes" value={service.successFee?.notes} />
      </SectionBox>

      <SectionBox title="Service Timeline">
        <FieldRow label="Program Start Date" value={service.anniversaryDate || "—"} />
        <FieldRow label="Job Close Date" value="—" />
        <FieldRow label="Re-Opened Date" value="—" />
        <FieldRow label="Lost Reason" value="—" />
      </SectionBox>

      {isPlaced && service.placement && (
        <SectionBox title="Placement Details">
          <FieldRow label="Base Salary" value={`$${service.placement.baseSalary.toLocaleString()}`} />
          <FieldRow label="Annual Bonus Target" value={service.placement.annualBonusAmount ? `$${service.placement.annualBonusAmount.toLocaleString()}` : "—"} />
          <FieldRow label="Start Date (per contract)" value={service.placement.startDate} />
          <FieldRow label="Actual Start Date" value={service.placement.actualStartDate || "—"} />
          <FieldRow label="Guaranteed Bonus" value={service.placement.guaranteedBonus ? "Yes" : "No"} />
        </SectionBox>
      )}

      <RelatedOpportunity service={service} />
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
                <Text fontSize="xl" fontWeight="bold" color={BRAND_RED}>{value}</Text>
                <Text fontSize="xs" color="gray.500">{label}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </VStack>
  );
}

// ── Resumes Tab ────────────────────────────────────────────────────────────────

function ResumesTab() {
  const resumes = [
    { id: "r-1", name: "Resume — April 2026 (Current)", updatedAt: "2026-04-15" },
    { id: "r-2", name: "Resume — January 2026", updatedAt: "2026-01-08" },
    { id: "r-3", name: "Resume — October 2025", updatedAt: "2025-10-20" },
  ];

  return (
    <VStack align="stretch" spacing={4}>
      <Flex justify="space-between" align="center">
        <Text fontWeight="bold" fontSize="sm" color="gray.700">Resumes</Text>
        <Menu>
          <MenuButton as={IconButton} icon={<FiSettings />} variant="outline" size="sm" aria-label="Resume options" />
          <MenuList>
            <MenuItem>Create New Resume</MenuItem>
            <MenuItem>Duplicate Resume</MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {resumes.map((resume, idx) => (
        <Box
          key={resume.id}
          bg="white"
          borderWidth="1px"
          borderColor={idx === 0 ? BRAND_BLUE : BORDER_COLOR}
          borderRadius="xl"
          px={5}
          py={4}
          shadow="sm"
        >
          <Flex justify="space-between" align="center">
            <Box>
              <HStack spacing={2}>
                <Text fontWeight="semibold" fontSize="sm" color="gray.800">{resume.name}</Text>
                {idx === 0 && <Badge colorScheme="blue" fontSize="xs" borderRadius="full" px={2}>Current</Badge>}
              </HStack>
              <Text fontSize="xs" color="gray.400" mt={1}>Last updated {resume.updatedAt}</Text>
            </Box>
            <IconButton
              aria-label="View resume"
              icon={<FiExternalLink />}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              onClick={() => window.open("#", "_blank", "noreferrer")}
            />
          </Flex>

          {idx === 0 && (
            <Box
              mt={4}
              bg={PAGE_BG}
              borderWidth="1px"
              borderColor={BORDER_COLOR}
              borderRadius="lg"
              p={4}
              minH="200px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="sm" color="gray.400">Resume viewer — PDF preview loads here</Text>
            </Box>
          )}
        </Box>
      ))}
    </VStack>
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
            {MOCK_EM_DOCUMENTS.map((doc) => {
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

// ── Related Opportunity (bottom of page) ───────────────────────────────────────

function RelatedOpportunity({ service }) {
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
        <FieldItem label="Opportunity" value={`EM Program — ${service.title}`} />
        <FieldItem label="Stage" value="Closed Won" />
        <FieldItem label="Amount" value={service.program?.fee ? `$${service.program.fee.toLocaleString()}` : "$18,000"} />
        <FieldItem label="Close Date" value={service.anniversaryDate || "2025-09-30"} />
      </SimpleGrid>
    </Box>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EmJobDetailPage() {
  const { jobId } = useParams();
  const service = MOCK_EM_SERVICES.find((s) => s.id === jobId) || MOCK_EM_SERVICES[0];

  const tabs = ["Milestones", "Details", "Outreach", "Resumes", "Documents"];

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
          to="/jobs/all-em-jobs"
            display="inline-flex"
            alignItems="center"
            gap={1}
            fontSize="sm"
            color="gray.500"
            _hover={{ color: BRAND_RED, textDecoration: "none" }}
            mb={4}
          >
            <Icon as={FiChevronLeft} boxSize={4} />
            EM Services
          </Box>

          <Flex align="flex-start" justify="space-between" gap={4}>
            <Box flex={1} minW={0}>
              <Flex align="center" gap={2} mb={1} flexWrap="wrap">
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="0.08em"
                  color="gray.400"
                >
                  Executive Management
                </Text>
                <Badge
                  colorScheme={STATUS_COLORS[service.status] || "gray"}
                  borderRadius="full"
                  px={2}
                  fontSize="xs"
                >
                  {service.statusLabel}
                </Badge>
              </Flex>

              <Heading as="h1" size="xl" color="gray.900" lineHeight="shorter" mb={1}>
                {service.title}
              </Heading>

              <HStack spacing={4} flexWrap="wrap">
                <Text fontSize="md" color="gray.600" fontWeight="medium">{service.subtitle}</Text>
                <Text fontSize="sm" color="gray.400">{service.location}</Text>
                {service.programLevel && (
                  <Badge colorScheme="purple" variant="subtle" fontSize="xs" borderRadius="full" px={2}>
                    {service.programLevel}
                  </Badge>
                )}
              </HStack>

              <Box mt={5} mb={4}>
                <MilestoneChevrons
                  milestones={EM_MILESTONES}
                  activeIndex={service.activePhaseIndex}
                  size="lg"
                />
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
                <MenuItem icon={<Icon as={FiExternalLink} />}>View in Power Center</MenuItem>
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
                  _selected={{ color: BRAND_RED, borderColor: BRAND_RED, fontWeight: "bold" }}
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
                <TabPanel p={0}><OutreachTab /></TabPanel>
                <TabPanel p={0}><ResumesTab /></TabPanel>
                <TabPanel p={0}><DocumentsTab /></TabPanel>
              </TabPanels>
            </Box>
          </Tabs>
        </Box>
    </Box>
  );
}
