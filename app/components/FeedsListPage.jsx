import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useToast
} from "@chakra-ui/react";
import { Form, Link, useNavigation } from "@remix-run/react";
import {
  MdAdd,
  MdArrowDropDown,
  MdCheck,
  MdEdit,
  MdError,
  MdSchedule,
  MdWarning
} from "react-icons/md";
import { getFeedSourceColor, getFeedSourceLabel, FEED_SOURCE_KEYS } from "../models/feed-sources.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(d);
}

function formatNextRun(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(d);
  if (diffDays === 0) return `Today (${formatted})`;
  if (diffDays === 1) return `Tomorrow (${formatted})`;
  if (diffDays < 0) return `Overdue (${formatted})`;
  return `In ${diffDays}d (${formatted})`;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Source group header
// ---------------------------------------------------------------------------

function SourceGroupHeader({ source, count, onNewFeed }) {
  const color = getFeedSourceColor(source);
  const label = getFeedSourceLabel(source);

  return (
    <Flex
      align="center"
      justify="space-between"
      px={4}
      py={2.5}
      bg={`${color}.50`}
      borderBottom="1px"
      borderColor={`${color}.100`}
    >
      <HStack spacing={2}>
        <Badge colorScheme={color} fontSize="sm" px={2.5} py={0.5} borderRadius="md">
          {label}
        </Badge>
        <Text fontSize="sm" color="gray.500">
          {count} {count === 1 ? "feed" : "feeds"}
        </Text>
      </HStack>
      <Button
        size="xs"
        leftIcon={<MdAdd />}
        colorScheme={color}
        variant="ghost"
        as={Link}
        to={`/settings/feeds/new?source=${source}`}
        _hover={{ bg: `${color}.100` }}
      >
        Add feed
      </Button>
    </Flex>
  );
}

// ---------------------------------------------------------------------------
// Feed row
// ---------------------------------------------------------------------------

function FeedRow({ feed, optimisticEnabled }) {
  const color = getFeedSourceColor(feed.source);
  const enabled = optimisticEnabled !== undefined ? optimisticEnabled : feed.enabled;

  return (
    <Tr
      _hover={{ bg: "gray.50" }}
      opacity={enabled ? 1 : 0.6}
      transition="opacity 0.2s"
    >
      <Td py={3}>
        <VStack align="start" spacing={0.5}>
          <Text
            fontWeight="medium"
            fontSize="sm"
            color={enabled ? "gray.900" : "gray.500"}
          >
            {feed.name}
          </Text>
          {feed.description && (
            <Text fontSize="xs" color="gray.400" noOfLines={1}>
              {feed.description}
            </Text>
          )}
        </VStack>
      </Td>
      <Td py={3}>
        <RunStatusBadge status={feed.last_run_status} lastError={feed.last_error} />
      </Td>
      <Td py={3}>
        {feed.last_run_completed_at ? (
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.700">
              {formatDate(feed.last_run_completed_at)}
            </Text>
            {feed.last_queued_count != null && (
              <Text fontSize="xs" color="gray.400">
                {feed.last_queued_count} queued
                {feed.last_result_count != null && ` / ${feed.last_result_count} found`}
              </Text>
            )}
          </VStack>
        ) : (
          <Text fontSize="xs" color="gray.400">
            —
          </Text>
        )}
      </Td>
      <Td py={3}>
        {feed.next_run_at ? (
          <HStack spacing={1}>
            <Icon as={MdSchedule} boxSize={3} color="gray.400" />
            <Text fontSize="xs" color="gray.600">
              {formatNextRun(feed.next_run_at)}
            </Text>
          </HStack>
        ) : (
          <Text fontSize="xs" color="gray.400">
            —
          </Text>
        )}
      </Td>
      <Td py={3}>
        <Badge colorScheme={color} variant="outline" fontSize="xs">
          Every {feed.interval_days}d
        </Badge>
      </Td>
      <Td py={3}>
        <Form method="post">
          <input type="hidden" name="_action" value="toggleEnabled" />
          <input type="hidden" name="feedId" value={feed.id} />
          <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
          <Switch
            colorScheme={color}
            isChecked={enabled}
            size="sm"
            onChange={(e) => e.currentTarget.form.requestSubmit()}
            cursor="pointer"
          />
        </Form>
      </Td>
      <Td py={3}>
        <IconButton
          as={Link}
          to={`/settings/feeds/${feed.id}`}
          icon={<MdEdit />}
          size="xs"
          variant="ghost"
          colorScheme="gray"
          aria-label="Edit feed"
        />
      </Td>
    </Tr>
  );
}

// ---------------------------------------------------------------------------
// Source section
// ---------------------------------------------------------------------------

function SourceSection({ source, feeds }) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      overflow="hidden"
      bg="white"
      boxShadow="sm"
    >
      <SourceGroupHeader source={source} count={feeds.length} />
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th
              py={2.5}
              color="gray.500"
              fontWeight="semibold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wider"
              w="35%"
            >
              Feed Name
            </Th>
            <Th
              py={2.5}
              color="gray.500"
              fontWeight="semibold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wider"
              w="12%"
            >
              Status
            </Th>
            <Th
              py={2.5}
              color="gray.500"
              fontWeight="semibold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wider"
              w="20%"
            >
              Last Run
            </Th>
            <Th
              py={2.5}
              color="gray.500"
              fontWeight="semibold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wider"
              w="16%"
            >
              Next Run
            </Th>
            <Th
              py={2.5}
              color="gray.500"
              fontWeight="semibold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wider"
              w="8%"
            >
              Schedule
            </Th>
            <Th
              py={2.5}
              color="gray.500"
              fontWeight="semibold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wider"
              w="5%"
            >
              On
            </Th>
            <Th w="4%" />
          </Tr>
        </Thead>
        <Tbody>
          {feeds.map((feed) => (
            <FeedRow key={feed.id} feed={feed} />
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------

function StatsBar({ stats }) {
  return (
    <HStack
      spacing={6}
      px={5}
      py={3}
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
    >
      <VStack spacing={0} align="start">
        <Text fontSize="xl" fontWeight="bold" color="gray.900" lineHeight="1">
          {stats.total}
        </Text>
        <Text fontSize="xs" color="gray.500">
          Total feeds
        </Text>
      </VStack>
      <Box w="1px" h="8" bg="gray.200" />
      <VStack spacing={0} align="start">
        <Text fontSize="xl" fontWeight="bold" color="green.600" lineHeight="1">
          {stats.enabled}
        </Text>
        <Text fontSize="xs" color="gray.500">
          Enabled
        </Text>
      </VStack>
      <Box w="1px" h="8" bg="gray.200" />
      {stats.running > 0 && (
        <>
          <VStack spacing={0} align="start">
            <HStack spacing={1.5}>
              <Spinner size="xs" color="blue.500" thickness="2px" />
              <Text fontSize="xl" fontWeight="bold" color="blue.600" lineHeight="1">
                {stats.running}
              </Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              Running now
            </Text>
          </VStack>
          <Box w="1px" h="8" bg="gray.200" />
        </>
      )}
      {stats.failed > 0 && (
        <VStack spacing={0} align="start">
          <HStack spacing={1.5}>
            <Icon as={MdError} color="red.500" boxSize={4} />
            <Text fontSize="xl" fontWeight="bold" color="red.600" lineHeight="1">
              {stats.failed}
            </Text>
          </HStack>
          <Text fontSize="xs" color="gray.500">
            {stats.failed === 1 ? "Feed failed" : "Feeds failed"}
          </Text>
        </VStack>
      )}
    </HStack>
  );
}

// ---------------------------------------------------------------------------
// New feed menu
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Renders the main feed management page.
 * @param {{
 *   feedsBySource: Record<string, object[]>,
 *   stats: {total: number, enabled: number, running: number, failed: number},
 *   error: string|null
 * }} props
 */
export function FeedsListPage({ feedsBySource, stats, error }) {
  const sourceOrder = FEED_SOURCE_KEYS.filter((s) => feedsBySource[s]?.length > 0);
  const otherSources = Object.keys(feedsBySource).filter((s) => !FEED_SOURCE_KEYS.includes(s));

  return (
    <VStack align="stretch" spacing={0}>
      {/* Page header */}
      <Box
        px={{ base: 4, md: 6 }}
        py={{ base: 4, md: 5 }}
        borderBottomWidth="1px"
        bg="white"
      >
        <Flex justify="space-between" align="center" gap={4} wrap="wrap">
          <Box>
            <Heading size="md">Search Feeds</Heading>
            <Text color="gray.600" mt={1} fontSize="sm">
              Automated data ingestion from external sources into the CRM pipeline.
            </Text>
          </Box>
          <NewFeedMenu />
        </Flex>
      </Box>

      {/* Content */}
      <VStack align="stretch" spacing={4} px={{ base: 4, md: 6 }} py={5}>
        {/* Stats */}
        {stats.total > 0 && <StatsBar stats={stats} />}

        {/* Error state */}
        {error && (
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
        )}

        {/* Empty state */}
        {stats.total === 0 && !error && (
          <Box
            textAlign="center"
            py={16}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            bg="white"
          >
            <Icon as={MdSchedule} boxSize={10} color="gray.300" mb={3} />
            <Heading size="sm" color="gray.500" mb={2}>
              No search feeds configured
            </Heading>
            <Text fontSize="sm" color="gray.400" mb={4}>
              Add a feed to start pulling contacts into your pipeline automatically.
            </Text>
            <NewFeedMenu />
          </Box>
        )}

        {/* Source sections */}
        {[...sourceOrder, ...otherSources].map((source) => {
          const feeds = feedsBySource[source];
          if (!feeds?.length) return null;
          return <SourceSection key={source} source={source} feeds={feeds} />;
        })}
      </VStack>
    </VStack>
  );
}
