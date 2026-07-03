import React from "react";
import {
  Box,
  Button,
  Text,
  VStack,
} from "@chakra-ui/react";

const STATUS_STYLES = Object.freeze({
  pending: {
    borderColor: "blue.200",
    background: "blue.50",
    accent: "blue.700",
  },
  success: {
    borderColor: "green.200",
    background: "green.50",
    accent: "green.700",
  },
  failed: {
    borderColor: "red.200",
    background: "red.50",
    accent: "red.700",
  },
  partial_failed: {
    borderColor: "orange.200",
    background: "orange.50",
    accent: "orange.700",
  },
});

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.pending;
}

function formatCounts(counts = {}) {
  const pending = Number(counts.pending || 0);
  const success = Number(counts.success || 0);
  const failed = Number(counts.failed || 0);
  return `pending: ${pending}, success: ${success}, failed: ${failed}`;
}

function buildErrorLabel(count = 0) {
  if (count <= 1) {
    return "View error";
  }
  return `View ${count} errors`;
}

function QueueHistoryCard({ item, onJumpToError }) {
  const style = getStatusStyle(item?.status);
  const errorCount = Array.isArray(item?.triageErrorIds)
    ? item.triageErrorIds.length
    : 0;
  const hasMany = Number(item?.requestCount || 0) > 1;

  return (
    <Box
      borderWidth="1px"
      borderColor={style.borderColor}
      bg={style.background}
      borderRadius="lg"
      px={2}
      pt={1.5}
      pb={1}
      w="100%"
    >
      <VStack align="center" spacing={0.5} textAlign="center">
        <Text fontSize="xs" fontWeight="semibold" color={style.accent} noOfLines={2}>
          {item?.label || item?.queueName || "Queue Request"}
        </Text>
        <Text fontSize="xs" color="gray.800" lineHeight="1.35">
          {hasMany
            ? formatCounts(item?.counts)
            : item?.status || "pending"}
        </Text>
        <Text fontSize="10px" color="gray.600" lineHeight="1.2" mb={0}>
          {formatTime(item?.startedAt)} to {formatTime(item?.completedAt)}
        </Text>
        {errorCount > 0 ? (
          <Button
            size="xs"
            variant="ghost"
            colorScheme="orange"
            px={0}
            h="auto"
            minH="auto"
            mt={0.5}
            onClick={() => {
              if (typeof onJumpToError === "function") {
                onJumpToError(item?.triageErrorIds?.[0] || null);
              }
            }}
          >
            {buildErrorLabel(errorCount)}
          </Button>
        ) : null}
      </VStack>
    </Box>
  );
}

export function CompanyResearchQueueHistory({
  items = [],
  isLoading = false,
  errorMessage = "",
  onJumpToError,
}) {
  if (isLoading && !items.length) {
    return (
      <VStack spacing={2.5} align="center" width="100%">
        {Array.from({ length: 2 }).map((_, index) => (
          <Box
            key={`history-loading-${index + 1}`}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            px={2}
            pt={1.5}
            pb={1}
            bg="gray.50"
            w="75%"
            minW="16rem"
            maxW="22rem"
          >
            <VStack align="stretch" spacing={2}>
              <Box h="10px" bg="gray.200" borderRadius="sm" />
              <Box h="10px" bg="gray.100" borderRadius="sm" />
              <Box h="8px" bg="gray.100" borderRadius="sm" />
            </VStack>
          </Box>
        ))}
      </VStack>
    );
  }

  if (errorMessage) {
    return (
      <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={3}>
        <Text fontSize="sm" color="red.700">
          {errorMessage}
        </Text>
      </Box>
    );
  }

  if (!items.length) {
    return (
      <Text fontSize="sm" color="gray.500">
        No queue history recorded.
      </Text>
    );
  }

  return (
    <VStack spacing={2.5} align="center" width="100%">
      {items.map((item) => (
        <Box
          key={item?.key || item?.queueName || item?.label}
          w="75%"
          minW="16rem"
          maxW="22rem"
        >
          <QueueHistoryCard
            item={item}
            onJumpToError={onJumpToError}
          />
        </Box>
      ))}
    </VStack>
  );
}
