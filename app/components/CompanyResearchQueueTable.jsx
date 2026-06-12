import React, { useMemo, useState } from "react";
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
  HStack,
  Link,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { FiCalendar, FiRefreshCw } from "react-icons/fi";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function DateStack({ item }) {
  return (
    <VStack align="end" spacing={1}>
      <HStack spacing={1} justify="flex-end">
        <FiRefreshCw size={12} />
        <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
          {formatDate(item.completedAt || item.updatedAt || item.createdAt)}
        </Text>
      </HStack>
      <HStack spacing={1} justify="flex-end">
        <FiCalendar size={12} />
        <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
          {formatDate(item.createdAt)}
        </Text>
      </HStack>
    </VStack>
  );
}

function StatusBadge({ item }) {
  const colorScheme =
    item.requestKind === "manual"
      ? "orange"
      : item.companyResearchStatus && /failed|verification/i.test(item.companyResearchStatus)
        ? "red"
        : item.completedAt
          ? "green"
          : "blue";

  return (
    <Badge colorScheme={colorScheme} variant="subtle" fontSize="xs">
      {item.companyResearchStatus || item.processingStage || item.queueStatus}
    </Badge>
  );
}

function SourceBadges({ labels = [] }) {
  if (!labels.length) {
    return (
      <Text fontSize="xs" color="gray.400">
        —
      </Text>
    );
  }

  return (
    <HStack spacing={1} flexWrap="wrap">
      {labels.map((label) => (
        <Badge key={label} colorScheme="gray" variant="subtle" fontSize="xs">
          {label}
        </Badge>
      ))}
    </HStack>
  );
}

function CompanySubline({ item }) {
  const hasWebsite = Boolean(item.website);
  const hasLinkedIn = Boolean(item.linkedInUrl);

  if (!hasWebsite && !hasLinkedIn) {
    return (
      <Text fontSize="xs" color="gray.500">
        No URL
      </Text>
    );
  }

  return (
    <HStack spacing={1.5} wrap="wrap">
      {hasWebsite ? (
        <Link href={item.website} isExternal fontSize="xs" color="gray.500">
          {item.website}
        </Link>
      ) : null}
      {hasWebsite && hasLinkedIn ? (
        <Text fontSize="xs" color="gray.400">
          |
        </Text>
      ) : null}
      {hasLinkedIn ? (
        <Link href={item.linkedInUrl} isExternal fontSize="xs" color="gray.500">
          {item.linkedInUrl}
        </Link>
      ) : null}
    </HStack>
  );
}

function DetailRow({ label, children }) {
  return (
    <VStack align="start" spacing={1}>
      <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
        {label}
      </Text>
      {typeof children === "string" ? (
        <Text fontSize="sm" color="gray.800">
          {children || "—"}
        </Text>
      ) : (
        children
      )}
    </VStack>
  );
}

function HistoryList({ items = [] }) {
  if (!items.length) {
    return (
      <Text fontSize="sm" color="gray.500">
        No history recorded.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={3}>
      {items.map((entry, index) => (
        <Box
          key={entry.id || `${entry.createdAt || "history"}-${index}`}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="lg"
          p={3}
        >
          <HStack justify="space-between" align="start" spacing={3}>
            <VStack align="start" spacing={1} flex="1">
              <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                {entry.message || entry.status || "History event"}
              </Text>
              {entry.source ? (
                <Text fontSize="xs" color="gray.500">
                  {entry.source}
                </Text>
              ) : null}
            </VStack>
            <Badge colorScheme="gray" variant="subtle" fontSize="xs">
              {entry.status || "—"}
            </Badge>
          </HStack>
          <Text mt={2} fontSize="xs" color="gray.500">
            {formatDate(entry.createdAt)}
          </Text>
        </Box>
      ))}
    </VStack>
  );
}

function getDisplayNotes(item) {
  return item?.notes || item?.reason || "—";
}

function CompanyResearchQueueItemDrawer({ item, isOpen, onClose }) {
  const updatedLabel = formatDate(item?.completedAt || item?.updatedAt || item?.createdAt);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          {item?.companyName || "Company Request"}
        </DrawerHeader>
        <DrawerBody py={5}>
          {item ? (
            <VStack align="stretch" spacing={5}>
              <DetailRow label="Status">
                <StatusBadge item={item} />
              </DetailRow>
              <DetailRow label="Links">
                <CompanySubline item={item} />
              </DetailRow>
              <DetailRow label="Sources">
                <SourceBadges labels={item.sourceLabels} />
              </DetailRow>
              <DetailRow label="Additional Sources">
                <Text fontSize="sm" color="gray.800">
                  {item.requestedSources?.length ? item.requestedSources.join(", ") : "—"}
                </Text>
              </DetailRow>
              <DetailRow label="Reason">{item.reason || "—"}</DetailRow>
              <DetailRow label="Notes">{getDisplayNotes(item)}</DetailRow>
              <DetailRow label="Failure Reason">{item.failureReason || "—"}</DetailRow>
              <DetailRow label="Processing Stage">{item.processingStage || "—"}</DetailRow>
              <DetailRow label="History">
                <HistoryList items={Array.isArray(item.statusHistory) ? item.statusHistory : []} />
              </DetailRow>
              <DetailRow label="Updated">{updatedLabel}</DetailRow>
              <DetailRow label="Created">{formatDate(item.createdAt)}</DetailRow>
              <DetailRow label="Salesforce Request ID">{item.salesforceRequestId || "—"}</DetailRow>
              <DetailRow label="Queue Request ID">
                {item.queueRequestId != null ? String(item.queueRequestId) : "—"}
              </DetailRow>
              <DetailRow label="Queued Salesforce Request ID">
                {item.queuedSalesforceRequestId || "—"}
              </DetailRow>
            </VStack>
          ) : null}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export function CompanyResearchQueueTable({
  items = [],
  emptyText = "No items.",
  section = "processing",
}) {
  const [selectedItem, setSelectedItem] = useState(null);

  const rows = useMemo(() => items, [items]);

  if (!rows.length) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={5} bg="white">
        <Text fontSize="sm" color="gray.500">
          {emptyText}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Box borderWidth="1px" borderRadius="lg" overflow="hidden" bg="white">
        <Table size="sm" sx={{ tableLayout: "fixed", width: "100%" }}>
          <Thead bg="gray.50">
            <Tr>
              <Th w={{ base: "auto", md: "34%" }}>Company</Th>
              <Th w={{ base: "8rem", md: "9rem" }}>Status</Th>
              <Th display={{ base: "none", md: "table-cell" }} w="16%">
                Sources
              </Th>
              <Th display={{ base: "none", lg: "table-cell" }} w="18rem">
                Reason
              </Th>
              <Th w="15rem" textAlign="right">
                Dates
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((item) => (
              <Tr key={item.id || `${section}-${item.referenceId}-${item.companyName}`}>
                <Td>
                  <VStack align="start" spacing={0.5}>
                    <Button
                      variant="link"
                      color="gray.900"
                      fontWeight="semibold"
                      fontSize="sm"
                      justifyContent="flex-start"
                      height="auto"
                      minH="unset"
                      whiteSpace="normal"
                      textAlign="left"
                      onClick={() => setSelectedItem(item)}
                    >
                      {item.companyName || "Unnamed company"}
                    </Button>
                    <CompanySubline item={item} />
                  </VStack>
                </Td>
                <Td verticalAlign="top">
                  <StatusBadge item={item} />
                </Td>
                <Td display={{ base: "none", md: "table-cell" }} verticalAlign="top">
                  <SourceBadges labels={item.sourceLabels} />
                </Td>
                <Td display={{ base: "none", lg: "table-cell" }} verticalAlign="top">
                  <Text fontSize="sm" color="gray.700" noOfLines={2} maxW="18rem">
                    {getDisplayNotes(item)}
                  </Text>
                </Td>
                <Td verticalAlign="top" textAlign="right">
                  <DateStack item={item} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <CompanyResearchQueueItemDrawer
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
