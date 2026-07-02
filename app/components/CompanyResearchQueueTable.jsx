import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Drawer,
  Skeleton,
  SkeletonText,
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

const DETAIL_POLL_INTERVAL_MS = 60_000;

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
  const displayStatus =
    item.processingStage === "RocketReach"
      ? "RocketReach"
      : item.companyResearchStatus || item.processingStage || item.queueStatus;
  const colorScheme =
    item.requestKind === "manual"
      ? "orange"
      : displayStatus && /failed|verification/i.test(displayStatus)
        ? "red"
        : item.completedAt
          ? "green"
          : "blue";

  return (
    <Badge colorScheme={colorScheme} variant="subtle" fontSize="xs">
      {displayStatus}
    </Badge>
  );
}

const DATA_PROVIDER_LABELS = Object.freeze({
  website: "Website",
  linkedin: "LinkedIn",
  salesnav: "Sales Navigator",
});

function BadgeList({ labels = [] }) {
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

function getOriginLabels(item) {
  const labels = [
    item?.originLabel || null,
    item?.originContextLabel || null,
  ].filter(Boolean);
  return labels.length ? labels : Array.isArray(item?.originLabels) ? item.originLabels : [];
}

function formatDataProviders(providers = []) {
  return (Array.isArray(providers) ? providers : [])
    .map((provider) => DATA_PROVIDER_LABELS[String(provider || "").trim().toLowerCase()] || provider)
    .filter(Boolean);
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

function DetailValuePlaceholder({ lines = 1, width = "60%" }) {
  if (lines > 1) {
    return <SkeletonText noOfLines={lines} spacing="2" skeletonHeight="10px" width="100%" />;
  }
  return <Skeleton height="14px" width={width} />;
}

function formatInlineValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "—";
}

function renderLinkOrText(value, label = value) {
  if (typeof value !== "string" || !value.trim()) {
    return "—";
  }
  return (
    <Link href={value} isExternal fontSize="sm" color="blue.600">
      {label || value}
    </Link>
  );
}

function formatUploadError(error) {
  if (!error || typeof error !== "object") {
    return "—";
  }

  const parts = [
    error.message,
    error.code ? `code=${error.code}` : null,
    error.status != null ? `status=${String(error.status)}` : null,
    error.requestId ? `requestId=${error.requestId}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : "Upload failed";
}

function formatRocketReachSummary(summary) {
  if (!summary || typeof summary !== "object") {
    return "—";
  }

  const parts = [
    `requests=${String(summary.queueRequestCount ?? 0)}`,
    `success=${String(summary.successCount ?? 0)}`,
    `failed=${String(summary.failedCount ?? 0)}`,
    `active=${String(summary.activeCount ?? ((summary.pendingCount ?? 0) + (summary.startedCount ?? 0)))}`,
    (summary.skippedCount ?? 0) > 0 ? `skipped=${String(summary.skippedCount)}` : null,
    summary.settled === true ? "settled" : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : "—";
}

function ScraperFailureList({ failures = [] }) {
  if (!failures.length) {
    return (
      <Text fontSize="sm" color="gray.800">
        —
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {failures.map((failure, index) => (
        <Box key={`${failure.source || "failure"}-${index}`} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={2}>
          <Text fontSize="sm" color="gray.800">
            {[failure.source, failure.message].filter(Boolean).join(": ") || "Scraper failure"}
          </Text>
        </Box>
      ))}
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

function canRerunItem(item) {
  if (!item) return false;
  if (item.completedAt) return true;
  const status = String(
    item.companyResearchStatus || item.queueStatus || ""
  ).toLowerCase();
  return status.includes("failed");
}

function toTimestamp(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function shouldRefreshDetail(summaryItem, detailItem) {
  if (!summaryItem?.id) {
    return false;
  }
  if (!detailItem) {
    return true;
  }

  const summaryUpdatedAt = Math.max(
    toTimestamp(summaryItem.updatedAt),
    toTimestamp(summaryItem.completedAt),
    toTimestamp(summaryItem.createdAt)
  );
  const detailUpdatedAt = Math.max(
    toTimestamp(detailItem.updatedAt),
    toTimestamp(detailItem.completedAt),
    toTimestamp(detailItem.createdAt)
  );

  return (
    summaryUpdatedAt > detailUpdatedAt ||
    summaryItem.companyResearchStatus !== detailItem.companyResearchStatus ||
    summaryItem.processingStage !== detailItem.processingStage ||
    summaryItem.queueStatus !== detailItem.queueStatus
  );
}

function mergeSelectedItem(summaryItem, detailItem) {
  if (!summaryItem) {
    return detailItem || null;
  }
  if (!detailItem) {
    return summaryItem;
  }

  return {
    ...detailItem,
    ...summaryItem,
    failureReason: detailItem.failureReason ?? summaryItem.failureReason,
    statusHistory: Array.isArray(detailItem.statusHistory)
      ? detailItem.statusHistory
      : [],
    meta: {
      ...(summaryItem.meta || {}),
      ...(detailItem.meta || {}),
    },
  };
}

function CompanyResearchQueueItemDrawer({
  item,
  isLoadingDetail = false,
  detailError = "",
  isOpen,
  onClose,
  onRerunRequest,
}) {
  const updatedLabel = formatDate(item?.completedAt || item?.updatedAt || item?.createdAt);
  const meta = item?.meta || {};
  const showDetailPlaceholder = isLoadingDetail && !detailError;

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
              <DetailRow label="Request Origin">
                <BadgeList labels={getOriginLabels(item)} />
              </DetailRow>
              <DetailRow label="Data Providers">
                <Text fontSize="sm" color="gray.800">
                  {item.dataProviders?.length
                    ? formatDataProviders(item.dataProviders).join(", ")
                    : "—"}
                </Text>
              </DetailRow>
              <DetailRow label="Reason">{item.reason || "—"}</DetailRow>
              <DetailRow label="Notes">{getDisplayNotes(item)}</DetailRow>
              <DetailRow label="Failure Reason">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="70%" />
                ) : (
                  item.failureReason || "—"
                )}
              </DetailRow>
              <DetailRow label="Processing Stage">{item.processingStage || "—"}</DetailRow>
              <DetailRow label="Backend Report">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="50%" />
                ) : (
                  renderLinkOrText(meta.reportUrl, "Open uploaded report")
                )}
              </DetailRow>
              <DetailRow label="Local Report Path">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="80%" />
                ) : (
                  formatInlineValue(meta.localReportPath)
                )}
              </DetailRow>
              <DetailRow label="Report Upload Error">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder lines={2} />
                ) : (
                  formatUploadError(meta.reportUploadError)
                )}
              </DetailRow>
              <DetailRow label="Organization UUID">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="65%" />
                ) : (
                  formatInlineValue(meta.organizationUUID)
                )}
              </DetailRow>
              <DetailRow label="Backend Request URL">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="55%" />
                ) : (
                  renderLinkOrText(meta.requestUrl, "Open Salesforce request")
                )}
              </DetailRow>
              <DetailRow label="SharePoint Tracking ID">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="55%" />
                ) : (
                  formatInlineValue(meta.sharepointTrackingId)
                )}
              </DetailRow>
              <DetailRow label="RocketReach Summary">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder lines={2} />
                ) : (
                  formatRocketReachSummary(meta.rocketReachSummary)
                )}
              </DetailRow>
              <DetailRow label="Scraper Failures">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder lines={2} />
                ) : (
                  <ScraperFailureList failures={meta.scraperFailures} />
                )}
              </DetailRow>
              <DetailRow label="History">
                {showDetailPlaceholder ? (
                  <VStack align="stretch" spacing={3} width="100%">
                    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={3}>
                      <DetailValuePlaceholder lines={2} />
                    </Box>
                    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={3}>
                      <DetailValuePlaceholder lines={2} />
                    </Box>
                  </VStack>
                ) : (
                  <HistoryList items={Array.isArray(item.statusHistory) ? item.statusHistory : []} />
                )}
              </DetailRow>
              {detailError ? (
                <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={3}>
                  <Text fontSize="sm" color="red.700">
                    {detailError}
                  </Text>
                </Box>
              ) : null}
              <DetailRow label="Updated">{updatedLabel}</DetailRow>
              <DetailRow label="Created">{formatDate(item.createdAt)}</DetailRow>
              <DetailRow label="Salesforce Request ID">{item.salesforceRequestId || "—"}</DetailRow>
              <DetailRow label="Queue Request ID">
                {item.queueRequestId != null ? String(item.queueRequestId) : "—"}
              </DetailRow>
              <DetailRow label="Queued Salesforce Request ID">
                {item.queuedSalesforceRequestId || "—"}
              </DetailRow>
              {canRerunItem(item) && typeof onRerunRequest === "function" ? (
                <Button
                  colorScheme="blue"
                  onClick={() => {
                    onClose();
                    onRerunRequest(item);
                  }}
                >
                  Rerun Company Research
                </Button>
              ) : null}
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
  onRerunRequest,
}) {
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [detailById, setDetailById] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const rows = useMemo(() => items, [items]);
  const selectedSummaryItem = useMemo(
    () => rows.find((item) => item?.id === selectedItemId) || null,
    [rows, selectedItemId]
  );
  const selectedDetailItem =
    selectedItemId != null ? detailById[String(selectedItemId)] || null : null;
  const selectedItem = useMemo(
    () => mergeSelectedItem(selectedSummaryItem, selectedDetailItem),
    [selectedDetailItem, selectedSummaryItem]
  );
  const selectedSummaryItemRefreshKey = useMemo(() => {
    if (!selectedSummaryItem?.id) {
      return "";
    }

    return JSON.stringify({
      id: selectedSummaryItem.id,
      queueStatus: selectedSummaryItem.queueStatus || "",
      companyResearchStatus: selectedSummaryItem.companyResearchStatus || "",
      processingStage: selectedSummaryItem.processingStage || "",
      createdAt: selectedSummaryItem.createdAt || "",
      updatedAt: selectedSummaryItem.updatedAt || "",
      completedAt: selectedSummaryItem.completedAt || "",
    });
  }, [selectedSummaryItem]);

  useEffect(() => {
    if (!selectedSummaryItem?.id) {
      setDetailLoading(false);
      setDetailError("");
      return;
    }
    const cachedDetail = detailById[String(selectedSummaryItem.id)] || null;
    if (!shouldRefreshDetail(selectedSummaryItem, cachedDetail)) {
      setDetailLoading(false);
      setDetailError("");
      return;
    }

    let isActive = true;
    setDetailLoading(true);
    setDetailError("");

    async function loadDetail() {
      try {
        const response = await fetch(
          `/api/rest/company-research/items/${selectedSummaryItem.id}`,
          {
            headers: { accept: "application/json" },
          }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load Company Research detail.");
        }
        if (!isActive) {
          return;
        }
        if (payload?.item) {
          setDetailById((current) => ({
            ...current,
            [String(selectedSummaryItem.id)]: payload.item,
          }));
        }
      } catch (loadError) {
        if (!isActive) {
          return;
        }
        setDetailError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load Company Research detail."
        );
      } finally {
        if (isActive) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDetail();
      }
    }, DETAIL_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [selectedSummaryItem, selectedSummaryItemRefreshKey]);

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
                Request Origin
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
                      onClick={() => setSelectedItemId(item.id)}
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
                  <BadgeList labels={getOriginLabels(item)} />
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
        isLoadingDetail={Boolean(selectedSummaryItem) && detailLoading}
        detailError={detailError}
        isOpen={Boolean(selectedItemId)}
        onClose={() => setSelectedItemId(null)}
        onRerunRequest={onRerunRequest}
      />
    </>
  );
}
