import React from "react";
import { Badge, Button, HStack, Text, Tooltip, VStack } from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";
import { FilterableDataTable } from "./FilterableDataTable";

const sampleFeeds = [
  {
    id: "feed-1",
    name: "Preqin - Data Centers - 05/06/2026",
    source: "Preqin",
    priority: 10,
    status: "Complete",
    latestRefresh: "May 6, 12:05 PM",
    description: "US data center investors",
    active: true,
  },
  {
    id: "feed-2",
    name: "Biscred - Student Housing - 05/06/2026",
    source: "Biscred",
    priority: 9,
    status: "Running",
    latestRefresh: "May 6, 11:42 AM",
    description: "National keyword search",
    active: true,
  },
  {
    id: "feed-3",
    name: "RevenueBase - PropTech - 05/05/2026",
    source: "RevenueBase",
    priority: 7,
    status: "Failed",
    latestRefresh: "May 5, 9:18 AM",
    description: "US and Canada",
    active: false,
  },
];

function StatusCell({ row }) {
  if (row.status === "Failed") {
    return (
      <Tooltip label="Sample failure for Storybook" hasArrow>
        <Badge colorScheme="red" variant="subtle" fontSize="xs">
          Failed
        </Badge>
      </Tooltip>
    );
  }

  if (row.status === "Running") {
    return (
      <Badge colorScheme="blue" variant="subtle" fontSize="xs">
        Running
      </Badge>
    );
  }

  return (
    <Badge colorScheme="green" variant="subtle" fontSize="xs">
      Complete
    </Badge>
  );
}

const columns = [
  {
    key: "name",
    label: "Search Name",
    width: "36%",
    filter: {
      type: "text",
      getValue: (row) => `${row.name} ${row.description || ""}`,
    },
    renderCell: (row) => (
      <VStack align="start" spacing={0.5}>
        <Text fontSize="sm" fontWeight="medium" color="blue.600">
          {row.name}
        </Text>
        <Text fontSize="xs" color="gray.400">
          {row.description}
        </Text>
      </VStack>
    ),
  },
  {
    key: "type",
    label: "Type",
    width: "16%",
    filter: {
      type: "select",
      options: ["Preqin", "Biscred", "RevenueBase"],
      getValue: (row) => row.source,
    },
    renderCell: (row) => <Badge variant="subtle">{row.source}</Badge>,
  },
  {
    key: "priority",
    label: "Priority",
    width: "10%",
    filter: {
      type: "text",
      getValue: (row) => String(row.priority),
    },
    renderCell: (row) => (
      <Text fontSize="sm" fontWeight="semibold">
        {row.priority}
      </Text>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "14%",
    filter: {
      type: "select",
      options: ["Complete", "Running", "Failed"],
      getValue: (row) => row.status,
    },
    renderCell: (row) => <StatusCell row={row} />,
  },
  {
    key: "latestRefresh",
    label: "Latest Refresh",
    width: "16%",
    filter: {
      type: "text",
      getValue: (row) => row.latestRefresh,
    },
    renderCell: (row) => <Text fontSize="xs">{row.latestRefresh}</Text>,
  },
  {
    key: "actions",
    label: "Actions",
    width: "8%",
    align: "right",
    filter: {
      type: "none",
    },
    renderCell: () => (
      <Button size="sm" leftIcon={<EditIcon />} variant="outline" colorScheme="blue">
        Edit
      </Button>
    ),
  },
];

const sections = [
  {
    key: "active",
    title: "Active Feeds",
    description: "Ordered by priority, highest first.",
    rows: sampleFeeds.filter((row) => row.active),
    emptyText: "No active feeds match the current filter.",
  },
  {
    key: "inactive",
    title: "Inactive Feeds",
    description: "Paused feeds stay available here for review and reactivation.",
    rows: sampleFeeds.filter((row) => !row.active),
    emptyText: "No inactive feeds match the current filter.",
  },
];

export default {
  title: "Organisms/FilterableDataTable",
  component: FilterableDataTable,
};

export function FeedsExample() {
  return (
    <HStack align="start" w="100%">
      <FilterableDataTable
        columns={columns}
        sections={sections}
        getRowKey={(row) => row.id}
        getRowProps={(row) => ({
          opacity: row.active ? 1 : 0.65,
        })}
      />
    </HStack>
  );
}
