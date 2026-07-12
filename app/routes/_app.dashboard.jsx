import { redirect } from "@remix-run/node";
import { useState } from "react";
import {
  Badge, Box, Button, Checkbox, Divider, Flex,
  HStack, Heading, Icon, Tag, TagLabel, Text, VStack,
} from "@chakra-ui/react";
import { Link } from "@remix-run/react";
import { FiCheck, FiClock, FiExternalLink, FiFileText, FiMail, FiPhone, FiPlus } from "react-icons/fi";
import { MilestoneChevrons } from "../components/MilestoneChevrons";
import { TaskItem } from "../components/ui/molecules/TaskItem";
import { MeetingItem } from "../components/ui/molecules/MeetingItem";
import { MonthCalendar } from "../components/ui/molecules/MonthCalendar";
import { ES_MILESTONES, EM_MILESTONES } from "../models/services-mock-data.mjs";
import { loadSessionMeta } from "../models/session-meta.server";
import { getDefaultLandingPath } from "../models/navigation.mjs";

const TODAY_DATE = new Date(2026, 3, 30); // April 30, 2026

export async function loader({ request }) {
  const meta = await loadSessionMeta({ request });
  if (meta.redirectToLogout) {
    return redirect("/auth/app-logout");
  }
  const defaultLandingPath = getDefaultLandingPath(meta);

  if (defaultLandingPath !== "/dashboard") {
    return redirect(defaultLandingPath);
  }

  return null;
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_TASKS = [
  { id: "t-1", title: "Review CFO candidate presentation deck for Fallon Company", priority: "high",   dueDate: "2026-04-27", done: false },
  { id: "t-2", title: "Update Nexus Technologies CRM record with offer feedback",  priority: "high",   dueDate: "2026-04-28", done: false },
  { id: "t-3", title: "Draft follow-up note to Meridian Health contact",           priority: "medium", dueDate: "2026-05-02", done: false },
  { id: "t-4", title: "Prepare Q2 business development pipeline summary",          priority: "low",    dueDate: "2026-05-07", done: false },
  { id: "t-5", title: "Complete skills checklist for Pacific Ventures CMO search", priority: "medium", dueDate: "2026-04-29", done: true  },
];

const MOCK_DASHBOARD_JOBS = [
  {
    id: "es-001",
    title: "CFO Search",
    company: "The Fallon Company",
    type: "es",
    milestones: ES_MILESTONES,
    activePhaseIndex: 1,
    detailUrl: "/jobs/es/es-001",
    pendingItems: [
      { id: "pi-1", label: "Send RTI to VP Accounting for retainer invoicing",           type: "email",    emailTo: "accounting@2020ets.com", emailSubject: "RTI – CFO Search / Fallon Company", dueDate: "2026-04-25" },
      { id: "pi-2", label: "Draft Job Description for client review",                    type: "document", docLabel: "Create",                                                                   dueDate: "2026-05-01" },
      { id: "pi-3", label: "Send Job Research Request Form to Talent Intelligence team", type: "email",    emailTo: "research@2020ets.com",   emailSubject: "Job Research Request – CFO / Fallon", dueDate: "2026-04-29" },
    ],
  },
  {
    id: "es-004",
    title: "Chief Executive Officer",
    company: "Nexus Technologies",
    type: "es",
    milestones: ES_MILESTONES,
    activePhaseIndex: 6,
    detailUrl: "/jobs/es/es-004",
    pendingItems: [
      { id: "pi-4", label: "Document candidate counteroffer feedback in writing to client", type: "email",    emailTo: "rokafor@nexustech.io", emailSubject: "CEO Search – Candidate Counteroffer Update", dueDate: "2026-04-27" },
      { id: "pi-5", label: "Confirm candidate resignation date with hiring manager",        type: "call",     scheduled: true,                                                                              dueDate: "2026-05-02" },
      { id: "pi-6", label: "Compile fully executed offer term sheet",                       type: "document", docLabel: "Create",                                                                           dueDate: "2026-05-03" },
    ],
  },
  {
    id: "em-001",
    title: "James Whitfield",
    company: "EM Coaching Program",
    type: "em",
    milestones: EM_MILESTONES,
    activePhaseIndex: 2,
    detailUrl: "/jobs/em/em-001",
    pendingItems: [
      { id: "pi-7", label: "Monthly coaching review call — confirm agenda", type: "call",     scheduled: true,  dueDate: "2026-05-05" },
      { id: "pi-8", label: "Update active coaching session notes document", type: "document", docLabel: "Edit", dueDate: "2026-05-08" },
    ],
  },
];

const MEETINGS_TODAY = [
  { id: "mt-1", time: "9:00 AM",  title: "Candidate Call: Alexandra Grant",     type: "call",     duration: "30 min" },
  { id: "mt-2", time: "10:30 AM", title: "Client Check-in: The Fallon Company", type: "call",     duration: "45 min" },
  { id: "mt-3", time: "12:00 PM", title: "Team Standup",                         type: "internal", duration: "30 min" },
  { id: "mt-4", time: "2:00 PM",  title: "Search Review: Nexus CEO Offer",       type: "meeting",  duration: "60 min" },
  { id: "mt-5", time: "4:00 PM",  title: "Deep-Dive Debrief: Meridian Health",   type: "call",     duration: "30 min" },
];

// ── Sub-components ──────────────────────────────────────────────────────────────

const MILESTONE_CHECKBOX_SX = {
  ".chakra-checkbox__control": {
    width: "22px",
    height: "22px",
    borderRadius: "5px",
    borderWidth: "2px",
    borderColor: "gray.400",
    bg: "white",
  },
};

function MilestoneTodoItem({ item, isChecked, onCheck }) {
  const isOverdue = !isChecked && new Date(item.dueDate + "T00:00:00").getTime() < TODAY_DATE.getTime();
  const dueFmt = new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <HStack
      spacing={3}
      py={2.5}
      px={3}
      borderRadius="lg"
      bg={isChecked ? "gray.100" : "gray.50"}
      borderWidth="1px"
      borderColor="gray.200"
      opacity={isChecked ? 0.55 : 1}
      transition="opacity 0.15s"
    >
      <Checkbox
        size="lg"
        isChecked={isChecked}
        onChange={() => onCheck(item.id)}
        colorScheme="green"
        flexShrink={0}
        sx={MILESTONE_CHECKBOX_SX}
      />
      <Box flex={1} minW={0}>
        <Text
          fontSize="sm"
          color={isChecked ? "gray.500" : "gray.700"}
          textDecoration={isChecked ? "line-through" : "none"}
          noOfLines={1}
        >
          {item.label}
        </Text>
        <Text fontSize="xs" color={isOverdue ? "red.500" : "gray.400"} mt={0.5}>
          {isOverdue ? "Overdue: " : "Due: "}{dueFmt}
        </Text>
      </Box>
      {!isChecked && (
        <HStack spacing={2} flexShrink={0}>
          {item.type === "email" && (
            <Button
              as="a"
              href={`mailto:${item.emailTo}?subject=${encodeURIComponent(item.emailSubject || "")}`}
              size="xs"
              colorScheme="blue"
              variant="outline"
              leftIcon={<Icon as={FiMail} />}
            >
              Email
            </Button>
          )}
          {item.type === "document" && (
            <Button
              size="xs"
              colorScheme="purple"
              variant="outline"
              leftIcon={<Icon as={FiFileText} />}
            >
              {item.docLabel || "Edit"}
            </Button>
          )}
          {item.type === "call" && (
            <Tag size="sm" colorScheme={item.scheduled ? "green" : "orange"} borderRadius="full">
              <Icon as={FiPhone} mr={1} boxSize={3} />
              <TagLabel>{item.scheduled ? "Scheduled" : "To Schedule"}</TagLabel>
            </Tag>
          )}
        </HStack>
      )}
    </HStack>
  );
}

function DashboardJobCard({ job }) {
  const isEs = job.type === "es";
  const [checkedIds, setCheckedIds] = useState(new Set());

  function handleCheck(id) {
    setCheckedIds((prev) => new Set([...prev, id]));
  }

  const allDone = job.pendingItems.every((item) => checkedIds.has(item.id));

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" shadow="sm" overflow="hidden">
      <Box px={4} pt={4} pb={3}>
        <Flex justify="space-between" align="center" mb={2}>
          <HStack spacing={2} flex={1} minW={0}>
            <Text fontWeight="bold" color="gray.900" fontSize="sm" noOfLines={1}>
              {job.title}
            </Text>
            <Badge
              colorScheme={isEs ? "blue" : "red"}
              fontSize="2xs"
              borderRadius="full"
              px={2}
              variant="outline"
              flexShrink={0}
            >
              {isEs ? "ES" : "EM"}
            </Badge>
          </HStack>
          <HStack spacing={2} flexShrink={0}>
            <Text fontSize="xs" color="gray.500">{job.company}</Text>
            <Link to={job.detailUrl}>
              <Icon as={FiExternalLink} color="gray.400" boxSize={3.5} />
            </Link>
          </HStack>
        </Flex>
        <MilestoneChevrons milestones={job.milestones} activeIndex={job.activePhaseIndex} size="sm" />
      </Box>

      <Box borderTopWidth="1px" borderColor="gray.100" px={4} py={3}>
        <Text
          fontSize="xs"
          fontWeight="bold"
          color={allDone ? "green.500" : "gray.400"}
          textTransform="uppercase"
          letterSpacing="0.06em"
          mb={2}
        >
          {allDone ? "All Action Items Complete" : "My Action Items"}
        </Text>
        <VStack spacing={2} align="stretch">
          {job.pendingItems.map((item) => (
            <MilestoneTodoItem
              key={item.id}
              item={item}
              isChecked={checkedIds.has(item.id)}
              onCheck={handleCheck}
            />
          ))}
        </VStack>
      </Box>
    </Box>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tasks, setTasks] = useState(MOCK_TASKS);

  function handleToggleTask(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  const todayLabel = TODAY_DATE.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Flex gap={6} align="flex-start" direction={{ base: "column", xl: "row" }}>

      {/* ── Left column: Tasks + Jobs (70%) ──────────────── */}
      <VStack flex={{ xl: 7 }} w={{ base: "full", xl: "auto" }} align="stretch" spacing={6}>

        <Box>
          <HStack justify="space-between" mb={3}>
            <Heading size="sm" color="gray.800">My Tasks</Heading>
            <Button size="xs" leftIcon={<Icon as={FiPlus} />} colorScheme="red" variant="outline">
              Add Task
            </Button>
          </HStack>
          <VStack spacing={2} align="stretch">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onToggle={handleToggleTask} todayDate={TODAY_DATE} />
            ))}
          </VStack>
        </Box>

        <Divider />

        <Box>
          <Heading size="sm" color="gray.800" mb={3}>My Jobs</Heading>
          <VStack spacing={4} align="stretch">
            {MOCK_DASHBOARD_JOBS.map((job) => (
              <DashboardJobCard key={job.id} job={job} />
            ))}
          </VStack>
        </Box>
      </VStack>

      {/* ── Right column: Calendar + Schedule (30%) ──────── */}
      <Box
        flex={{ xl: 3 }}
        w={{ base: "full", xl: "auto" }}
        position={{ xl: "sticky" }}
        top={{ xl: "24px" }}
      >
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={5} shadow="sm">
          <MonthCalendar
            year={2026}
            month={3}
            today={TODAY_DATE}
            eventDays={[7, 10, 14, 16, 21, 28, 30]}
          />

          <Divider my={4} />

          <Box>
            <HStack mb={1}>
              <Icon as={FiClock} color="gray.500" boxSize={4} />
              <Text fontWeight="bold" fontSize="sm" color="gray.700">Today's Schedule</Text>
            </HStack>
            <Text fontSize="xs" color="gray.400" mb={3}>{todayLabel}</Text>
            <VStack spacing={2} align="stretch">
              {MEETINGS_TODAY.map((meeting) => (
                <MeetingItem key={meeting.id} meeting={meeting} />
              ))}
            </VStack>
          </Box>
        </Box>
      </Box>

    </Flex>
  );
}
