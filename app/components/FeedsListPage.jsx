import React from "react";
import { EditIcon } from "@chakra-ui/icons";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { Link } from "@remix-run/react";
import { MdAdd, MdArrowDropDown, MdCheck, MdError, MdRefresh, MdWarning } from "react-icons/md";
import { FilterableDataTable } from "./ui/organisms/FilterableDataTable";
import { FEED_SOURCE_KEYS, getFeedSourceColor, getFeedSourceLabel } from "../models/feed-sources.mjs";

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function normalizePriority(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sortFeeds(feeds) {
  return [...feeds].sort((a, b) => {
    const priorityDiff = normalizePriority(b.priority) - normalizePriority(a.priority);
    if (priorityDiff !== 0) return priorityDiff;

    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

function RunStatusBadge({ status, lastError }) {
  if (!status) {
    return (
      <Badge colorScheme="gray" variant="subtle" fontSize="xs">
        Never run
      </Badge>
    );
  }

  if (status === "running") {
    return (
      <HStack spacing={1.5}>
        <Spinner size="xs" color="blue.500" thickness="2px" />
        <Badge colorScheme="blue" variant="subtle" fontSize="xs">
          Running
        </Badge>
      </HStack>
    );
  }

  if (status === "complete") {
    return (
      <HStack spacing={1.5}>
        <Icon as={MdCheck} color="green.500" boxSize={3.5} />
        <Badge colorScheme="green" variant="subtle" fontSize="xs">
          Complete
        </Badge>
      </HStack>
    );
  }

  if (status === "failed") {
    return (
      <Tooltip label={lastError || "Run failed"} hasArrow maxW="300px">
        <HStack spacing={1.5} cursor="help">
          <Icon as={MdWarning} color="red.500" boxSize={3.5} />
          <Badge colorScheme="red" variant="subtle" fontSize="xs">
            Failed
          </Badge>
        </HStack>
      </Tooltip>
    );
  }

  return (
    <Badge colorScheme="gray" variant="subtle" fontSize="xs">
      {status}
    </Badge>
  );
}

function getFeedStatusLabel(feed) {
  return feed.last_run_status || "Never run";
}

function getLatestRefreshText(feed) {
  return feed.last_run_completed_at ? formatDate(feed.last_run_completed_at) || "" : "";
}

function buildFeedTableColumns() {
  return [
    {
      key: "name",
      label: "Search Name",
      width: "38%",
      filter: {
        type: "text",
        getValue: (feed) => `${feed.name || ""} ${feed.description || ""}`,
      },
      renderCell: (feed, section) => (
        <VStack align="start" spacing={0.5}>
          <Link to={`/settings/feeds/${feed.id}`}>
            <Text
              fontWeight="medium"
              fontSize="sm"
              color={section.key === "inactive" ? "gray.600" : "blue.600"}
              _hover={{ color: "blue.700", textDecoration: "underline" }}
            >
              {feed.name}
            </Text>
          </Link>
          {feed.description ? (
            <Text fontSize="xs" color="gray.400" noOfLines={1}>
              {feed.description}
            </Text>
          ) : null}
        </VStack>
      ),
    },
    {
      key: "type",
      label: "Type",
      width: "16%",
      filter: {
        type: "select",
        options: FEED_SOURCE_KEYS.map((source) => getFeedSourceLabel(source)),
        getValue: (feed) => getFeedSourceLabel(feed.source),
      },
      renderCell: (feed) => (
        <Badge colorScheme={getFeedSourceColor(feed.source)} variant="subtle" fontSize="xs">
          {getFeedSourceLabel(feed.source)}
        </Badge>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      width: "10%",
      filter: {
        type: "text",
        getValue: (feed) => String(normalizePriority(feed.priority)),
      },
      renderCell: (feed) => (
        <Text fontSize="sm" color="gray.800" fontWeight="semibold">
          {normalizePriority(feed.priority)}
        </Text>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "16%",
      filter: {
        type: "select",
        options: ["Never run", "running", "complete", "failed"],
        getValue: (feed) => getFeedStatusLabel(feed),
      },
      renderCell: (feed) => (
        <RunStatusBadge status={feed.last_run_status} lastError={feed.last_error} />
      ),
    },
    {
      key: "latestRefresh",
      label: "Latest Refresh",
      width: "15%",
      filter: {
        type: "text",
        getValue: (feed) => getLatestRefreshText(feed),
      },
      renderCell: (feed) =>
        feed.last_run_completed_at ? (
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.700">
              {formatDate(feed.last_run_completed_at)}
            </Text>
            {feed.last_queued_count != null ? (
              <Text fontSize="xs" color="gray.400">
                {feed.last_queued_count} queued
              </Text>
            ) : null}
          </VStack>
        ) : (
          <Text fontSize="xs" color="gray.400">
            —
          </Text>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "5%",
      align: "right",
      filter: {
        type: "none",
      },
      renderCell: (feed) => (
        <Button
          as={Link}
          to={`/settings/feeds/${feed.id}`}
          size="sm"
          leftIcon={<EditIcon />}
          variant="outline"
          colorScheme="blue"
        >
          Edit
        </Button>
      ),
    },
  ];
}

function NewFeedMenu() {
  return (
    <Menu>
      <MenuButton
        as={Button}
        colorScheme="blue"
        leftIcon={<MdAdd />}
        rightIcon={<MdArrowDropDown />}
        size="sm"
      >
        New Feed
      </MenuButton>
      <MenuList>
        {FEED_SOURCE_KEYS.map((source) => (
          <MenuItem
            key={source}
            as={Link}
            to={`/settings/feeds/new?source=${source}`}
            fontSize="sm"
          >
            <HStack spacing={2}>
              <Badge colorScheme={getFeedSourceColor(source)} fontSize="xs">
                {getFeedSourceLabel(source)}
              </Badge>
              <Text>feed</Text>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}

/**
 * @param {{
 *   feeds: object[],
 *   stats: {total: number, enabled: number, running: number, failed: number},
 *   error: string|null
 * }} props
 */
export function FeedsListPage({ feeds, stats, error }) {
  const columns = React.useMemo(() => buildFeedTableColumns(), []);
  const activeFeeds = React.useMemo(
    () => sortFeeds(feeds.filter((feed) => feed.enabled !== false)),
    [feeds]
  );
  const inactiveFeeds = React.useMemo(
    () => sortFeeds(feeds.filter((feed) => feed.enabled === false)),
    [feeds]
  );

  const sections = React.useMemo(
    () => [
      {
        key: "active",
        title: "Active Feeds",
        description: "Ordered by priority, highest first.",
        rows: activeFeeds,
        emptyText: "No active feeds match the current filters.",
      },
      {
        key: "inactive",
        title: "Inactive Feeds",
        description: "Paused feeds stay available here for review and reactivation.",
        rows: inactiveFeeds,
        emptyText: "No inactive feeds match the current filters.",
      },
    ],
    [activeFeeds, inactiveFeeds]
  );

  return (
    <VStack align="stretch" spacing={0}>
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Flex justify="space-between" align="center" gap={4} wrap="wrap">
          <Box>
            <Heading size="md">Research Feeds</Heading>
            <Text color="gray.600" mt={1} fontSize="sm">
              Custom lists from external sources that feed the research queue.
            </Text>
          </Box>
          <NewFeedMenu />
        </Flex>
      </Box>

      <VStack align="stretch" spacing={4} px={{ base: 4, md: 6 }} py={5}>
        {error ? (
          <Box
            bg="red.50"
            borderWidth="1px"
            borderColor="red.200"
            borderRadius="xl"
            px={4}
            py={3}
          >
            <HStack spacing={2}>
              <Icon as={MdError} color="red.500" />
              <Text fontSize="sm" color="red.700">
                {error}
              </Text>
            </HStack>
          </Box>
        ) : null}

        {stats.total === 0 && !error ? (
          <Box
            textAlign="center"
            py={16}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
          >
            <Icon as={MdRefresh} boxSize={10} color="gray.300" mb={3} />
            <Heading size="sm" color="gray.500" mb={2}>
              No research feeds configured
            </Heading>
            <Text fontSize="sm" color="gray.400" mb={4}>
              Add a feed to preview source results and queue company research.
            </Text>
            <NewFeedMenu />
          </Box>
        ) : null}

        {stats.total > 0 ? (
          <FilterableDataTable
            columns={columns}
            sections={sections}
            getRowKey={(feed) => feed.id}
            getRowProps={(_, section) => ({
              opacity: section.key === "inactive" ? 0.65 : 1,
            })}
          />
        ) : null}
      </VStack>
    </VStack>
  );
}
