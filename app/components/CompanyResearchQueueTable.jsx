import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  HStack,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  SimpleGrid,
} from "@chakra-ui/react";
import { FiCalendar, FiRefreshCw, FiSettings } from "react-icons/fi";

const DETAIL_POLL_INTERVAL_MS = 60_000;
const OVERVIEW_REPORT_TYPE = "overview";
const REQUEST_DRAWER_TABS = Object.freeze([
  { key: OVERVIEW_REPORT_TYPE, label: "Overview" },
  { key: "salesforceSaveDecisions", label: "Salesforce Save Decisions" },
  { key: "companyResearchAudit", label: "CompanyResearch Audit" },
  { key: "mergeExplained", label: "Merge Explained" },
]);

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

function decodeHtmlEntities(value) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  return value
    .replace(/&#(\d+);/g, (_match, code) => {
      const parsed = Number.parseInt(code, 10);
      return Number.isInteger(parsed) ? String.fromCharCode(parsed) : _match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isInteger(parsed) ? String.fromCharCode(parsed) : _match;
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function normalizeHtmlContent(value) {
  const decoded = decodeHtmlEntities(value);
  return decoded.trim() || "";
}

function injectExternalTargets(html) {
  const normalized = normalizeHtmlContent(html);
  if (!normalized) {
    return "";
  }
  return normalized.replace(/<a\b(?![^>]*\btarget=)/gi, '<a target="_blank" rel="noreferrer" ');
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

function buildOrganizationPath(organizationUUID) {
  if (typeof organizationUUID !== "string" || !organizationUUID.trim()) {
    return null;
  }
  return `/organization/${organizationUUID.trim()}`;
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

function buildDetailCacheKey(itemId, reportType = OVERVIEW_REPORT_TYPE) {
  if (itemId == null) {
    return "";
  }
  return `${String(itemId)}:${reportType || OVERVIEW_REPORT_TYPE}`;
}

function buildDetailRequestPath(itemId, reportType = OVERVIEW_REPORT_TYPE) {
  const params = new URLSearchParams();
  params.set("reportType", reportType || OVERVIEW_REPORT_TYPE);
  return `/api/rest/company-research/items/${itemId}?${params.toString()}`;
}

function getVisibleRequestDrawerTabs(item) {
  if (!item?.completedAt) {
    return REQUEST_DRAWER_TABS.slice(0, 1);
  }
  return REQUEST_DRAWER_TABS;
}

function ReportDataTable({ columns = [], rows = [], emptyText = "No data available." }) {
  if (!rows.length) {
    return (
      <Text fontSize="sm" color="gray.500">
        {emptyText}
      </Text>
    );
  }

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" overflow="hidden">
      <Table size="sm">
        <Thead bg="gray.50">
          <Tr>
            {columns.map((column) => (
              <Th key={column.key}>{column.label}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, index) => (
            <Tr key={row.id || row.salesforceId || row.referenceId || `${index}`}>
              {columns.map((column) => {
                const rendered = typeof column.render === "function"
                  ? column.render(row)
                  : row?.[column.key];
                return (
                  <Td key={column.key} verticalAlign="top">
                    {typeof rendered === "string" || typeof rendered === "number" ? (
                      <Text fontSize="sm" color="gray.800">
                        {rendered || "—"}
                      </Text>
                    ) : (
                      rendered || (
                        <Text fontSize="sm" color="gray.500">
                          —
                        </Text>
                      )
                    )}
                  </Td>
                );
              })}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
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

function DatePill({ label, value }) {
  return (
    <VStack align="start" spacing={0} minW="8rem">
      <Text
        fontSize="10px"
        fontWeight="semibold"
        color="gray.500"
        textTransform="uppercase"
        letterSpacing="0.08em"
      >
        {label}
      </Text>
      <Text fontSize="sm" color="gray.800">
        {formatDate(value)}
      </Text>
    </VStack>
  );
}

function OverviewHeader({ item, onClose, onRerunRequest }) {
  const showRerun = canRerunItem(item);
  return (
    <Box borderBottomWidth="1px" borderColor="gray.200" px={6} py={5} pr={16}>
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="start" spacing={4} flexWrap="wrap">
          <Text fontSize="2xl" fontWeight="semibold" color="gray.900">
            {item?.companyName || "Company Request"}
          </Text>
          <VStack align="end" spacing={2}>
            <StatusBadge item={item} />
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiSettings />}
                variant="ghost"
                size="sm"
                aria-label="Company Research actions"
              />
              <MenuList>
                <MenuItem
                  isDisabled={!showRerun}
                  onClick={() => {
                    if (!showRerun || typeof onRerunRequest !== "function") {
                      return;
                    }
                    onClose?.();
                    onRerunRequest(item);
                  }}
                >
                  Rerun Company Research
                </MenuItem>
              </MenuList>
            </Menu>
          </VStack>
        </HStack>
        <HStack spacing={6} flexWrap="wrap">
          <DatePill label="Created" value={item?.createdAt} />
          <DatePill label="Updated" value={item?.updatedAt || item?.completedAt || item?.createdAt} />
          {item?.completedAt ? <DatePill label="Completed" value={item.completedAt} /> : null}
        </HStack>
      </VStack>
    </Box>
  );
}

function OverviewLeftColumn({
  item,
  meta,
  showDetailPlaceholder,
}) {
  const organizationPath = buildOrganizationPath(meta.organizationUUID);

  return (
    <VStack align="stretch" spacing={5}>
      <DetailRow label="Company Name">{item?.companyName || "—"}</DetailRow>
      <DetailRow label="Organization Record">
        {showDetailPlaceholder ? (
          <DetailValuePlaceholder width="55%" />
        ) : organizationPath ? (
          <Link
            href={organizationPath}
            target="_blank"
            rel="noreferrer"
            fontSize="sm"
            color="blue.600"
          >
            {meta.organizationUUID}
          </Link>
        ) : (
          "—"
        )}
      </DetailRow>
      <DetailRow label="LinkedIn">
        {showDetailPlaceholder ? (
          <DetailValuePlaceholder width="70%" />
        ) : (
          renderLinkOrText(item?.linkedInUrl)
        )}
      </DetailRow>
      <DetailRow label="Website">
        {showDetailPlaceholder ? (
          <DetailValuePlaceholder width="70%" />
        ) : (
          renderLinkOrText(item?.website)
        )}
      </DetailRow>
      <DetailRow label="Request Origin">
        <BadgeList labels={getOriginLabels(item)} />
      </DetailRow>
      <DetailRow label="Reason">{item?.reason || "—"}</DetailRow>
      <DetailRow label="Notes">{getDisplayNotes(item)}</DetailRow>
      <DetailRow label="Report Link">
        {showDetailPlaceholder ? (
          <DetailValuePlaceholder width="50%" />
        ) : (
          renderLinkOrText(meta.reportUrl, "Open uploaded report")
        )}
      </DetailRow>
      <Accordion allowToggle defaultIndex={[]}>
        <AccordionItem borderWidth="1px" borderColor="gray.200" borderRadius="lg">
          <AccordionButton px={4} py={3}>
            <HStack flex="1" justify="space-between" textAlign="left">
              <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                Triage
              </Text>
              <AccordionIcon />
            </HStack>
          </AccordionButton>
          <AccordionPanel px={4} pb={4}>
            <VStack align="stretch" spacing={4}>
              <DetailRow label="RocketReach Summary">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder lines={2} />
                ) : (
                  formatRocketReachSummary(meta.rocketReachSummary)
                )}
              </DetailRow>
              <DetailRow label="SharePoint Tracking ID">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="45%" />
                ) : (
                  formatInlineValue(meta.sharepointTrackingId)
                )}
              </DetailRow>
              <DetailRow label="Report Upload Error">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder lines={2} />
                ) : (
                  formatUploadError(meta.reportUploadError)
                )}
              </DetailRow>
              <DetailRow label="Queue Request ID">
                {item?.queueRequestId != null ? String(item.queueRequestId) : "—"}
              </DetailRow>
              <DetailRow label="Salesforce Request ID">{item?.salesforceRequestId || "—"}</DetailRow>
              <DetailRow label="Queued Salesforce Request ID">
                {item?.queuedSalesforceRequestId || "—"}
              </DetailRow>
              <DetailRow label="Local Report Path">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="75%" />
                ) : (
                  formatInlineValue(meta.localReportPath)
                )}
              </DetailRow>
              <DetailRow label="Data Providers">
                <Text fontSize="sm" color="gray.800">
                  {item?.dataProviders?.length
                    ? formatDataProviders(item.dataProviders).join(", ")
                    : "—"}
                </Text>
              </DetailRow>
              <DetailRow label="Backend Request URL">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder width="65%" />
                ) : (
                  renderLinkOrText(meta.requestUrl, "Open Salesforce request")
                )}
              </DetailRow>
              <DetailRow label="Scraper Failures">
                {showDetailPlaceholder ? (
                  <DetailValuePlaceholder lines={2} />
                ) : (
                  <ScraperFailureList failures={meta.scraperFailures || []} />
                )}
              </DetailRow>
            </VStack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </VStack>
  );
}

function OverviewRightColumn({
  item,
  showDetailPlaceholder,
  detailError,
}) {
  const failureReasonHtml = injectExternalTargets(item?.failureReason);
  return (
    <VStack align="stretch" spacing={5}>
      {!showDetailPlaceholder && failureReasonHtml ? (
        <DetailRow label="Failure Reason">
          <Box
            fontSize="sm"
            color="gray.800"
            sx={{
              a: { color: "blue.600", textDecoration: "underline" },
            }}
            dangerouslySetInnerHTML={{ __html: failureReasonHtml }}
          />
        </DetailRow>
      ) : null}
      {showDetailPlaceholder ? (
        <DetailRow label="Failure Reason">
          <DetailValuePlaceholder lines={2} />
        </DetailRow>
      ) : null}
      <DetailRow label="Status">
        {showDetailPlaceholder ? (
          <DetailValuePlaceholder lines={3} />
        ) : item?.statusText ? (
          <Box
            fontSize="sm"
            color="gray.800"
            sx={{
              a: { color: "blue.600", textDecoration: "underline" },
            }}
            dangerouslySetInnerHTML={{ __html: item.statusText }}
          />
        ) : (
          "—"
        )}
      </DetailRow>
      <DetailRow label="Workflow">
        <Text fontSize="sm" color="gray.700">
          {item?.processingStage || "—"}
        </Text>
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
          <HistoryList items={Array.isArray(item?.statusHistory) ? item.statusHistory : []} />
        )}
      </DetailRow>
      {detailError ? (
        <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={3}>
          <Text fontSize="sm" color="red.700">
            {detailError}
          </Text>
        </Box>
      ) : null}
    </VStack>
  );
}

function getDisplayNotes(item) {
  const decodedNotes = normalizeHtmlContent(item?.notes);
  if (decodedNotes) {
    return decodedNotes;
  }
  const decodedReason = normalizeHtmlContent(item?.reason);
  return decodedReason || "—";
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

function OverviewTabContent({
  item,
  isLoadingDetail = false,
  detailError = "",
  onClose,
  onRerunRequest,
}) {
  const meta = item?.meta || {};
  const showDetailPlaceholder = isLoadingDetail && !detailError;

  return (
    <VStack align="stretch" spacing={0}>
      <OverviewHeader item={item} onClose={onClose} onRerunRequest={onRerunRequest} />
      <Box px={6} py={5}>
        <SimpleGrid columns={{ base: 1, lg: 5 }} spacing={8}>
          <Box gridColumn={{ base: "auto", lg: "span 2" }}>
            <OverviewLeftColumn
              item={item}
              meta={meta}
              showDetailPlaceholder={showDetailPlaceholder}
            />
          </Box>
          <Box gridColumn={{ base: "auto", lg: "span 3" }}>
            <OverviewRightColumn
              item={item}
              showDetailPlaceholder={showDetailPlaceholder}
              detailError={detailError}
            />
          </Box>
        </SimpleGrid>
      </Box>
    </VStack>
  );
}

function LoadingTabContent() {
  return (
    <VStack align="stretch" spacing={3}>
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={3}>
        <DetailValuePlaceholder lines={3} />
      </Box>
      <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={3}>
        <DetailValuePlaceholder lines={4} />
      </Box>
    </VStack>
  );
}

function SalesforceSaveDecisionsTabContent({ report, detailError = "", isLoading = false }) {
  if (isLoading && !report) {
    return <LoadingTabContent />;
  }
  if (detailError) {
    return (
      <Text fontSize="sm" color="red.700">
        {detailError}
      </Text>
    );
  }
  if (!report?.hasData) {
    return (
      <Text fontSize="sm" color="gray.500">
        Salesforce save decisions are not available for this request.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      <DetailRow label="Org Decisions">
        <ReportDataTable
          rows={report.orgDecisions?.rows || []}
          emptyText="No organization save decisions were recorded."
          columns={[
            { key: "name", label: "Name" },
            { key: "status", label: "Status" },
            { key: "recordTypeName", label: "Record Type" },
            { key: "locationLabel", label: "Location" },
            {
              key: "recordLink",
              label: "Salesforce",
              render: (row) => renderLinkOrText(row.recordLink, row.salesforceId || "Open"),
            },
            { key: "reason", label: "Reason" },
          ]}
        />
      </DetailRow>
      <DetailRow label="Person Decisions">
        <ReportDataTable
          rows={report.personDecisions?.rows || []}
          emptyText="No person save decisions were recorded."
          columns={[
            { key: "name", label: "Name" },
            { key: "status", label: "Status" },
            { key: "accountName", label: "Organization" },
            { key: "title", label: "Title" },
            {
              key: "recordLink",
              label: "Salesforce",
              render: (row) => renderLinkOrText(row.recordLink, row.salesforceId || "Open"),
            },
            { key: "reason", label: "Reason" },
          ]}
        />
      </DetailRow>
      <DetailRow label="Duplicate Review">
        <ReportDataTable
          rows={report.duplicateReview?.rows || []}
          emptyText="No duplicate review entries were captured."
          columns={[
            { key: "duplicateType", label: "Type" },
            { key: "name", label: "Name" },
            { key: "status", label: "Status" },
            {
              key: "recordLink",
              label: "Salesforce",
              render: (row) => renderLinkOrText(row.recordLink, row.salesforceId || "Open"),
            },
            { key: "reason", label: "Reason" },
          ]}
        />
      </DetailRow>
    </VStack>
  );
}

function CompanyResearchAuditTabContent({ report, detailError = "", isLoading = false }) {
  if (isLoading && !report) {
    return <LoadingTabContent />;
  }
  if (detailError) {
    return (
      <Text fontSize="sm" color="red.700">
        {detailError}
      </Text>
    );
  }
  if (!report?.hasData) {
    return (
      <Text fontSize="sm" color="gray.500">
        CompanyResearch audit data is not available for this request.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      <DetailRow label="Scraped Data">
        <Text fontSize="sm" color="gray.700" mb={3}>
          Companies: {String(report.scraped?.companyCount || 0)} | Contacts: {String(report.scraped?.contactCount || 0)}
        </Text>
        <ReportDataTable
          rows={report.scraped?.companies || []}
          emptyText="No scraped companies were recorded."
          columns={[
            { key: "name", label: "Name" },
            { key: "source", label: "Source" },
            { key: "profileLink", label: "Profile" },
            { key: "contactCount", label: "Contacts" },
          ]}
        />
      </DetailRow>
      <DetailRow label="Identity Resolution">
        <Text fontSize="sm" color="gray.700" mb={3}>
          Initial candidates: {String(report.identityResolution?.initialCandidateCount || 0)} | Accepted: {String(report.identityResolution?.acceptedCandidateCount || 0)} | Selected primary: {report.identityResolution?.selectedPrimaryCompanyId || "—"}
        </Text>
        <ReportDataTable
          rows={report.identityResolution?.candidates || []}
          emptyText="No identity-resolution candidates were recorded."
          columns={[
            { key: "salesforceId", label: "Salesforce ID" },
            { key: "name", label: "Name" },
            { key: "status", label: "Status" },
            { key: "statusReason", label: "Reason" },
          ]}
        />
      </DetailRow>
      <DetailRow label="Recompose Organization">
        <Text fontSize="sm" color="gray.700" mb={3}>
          Organization: {report.recompose?.organization?.name || "—"} | Persons: {String(report.recompose?.personCount || 0)} | Relationships: {String(report.recompose?.relationshipCount || 0)}
        </Text>
        <ReportDataTable
          rows={report.recompose?.persons || []}
          emptyText="No mapped persons were recorded."
          columns={[
            { key: "name", label: "Name" },
            { key: "uuid", label: "UUID" },
            { key: "sources", label: "Sources" },
          ]}
        />
      </DetailRow>
    </VStack>
  );
}

function MergeExplainedTabContent({ report, detailError = "", isLoading = false }) {
  if (isLoading && !report) {
    return <LoadingTabContent />;
  }
  if (detailError) {
    return (
      <Text fontSize="sm" color="red.700">
        {detailError}
      </Text>
    );
  }
  if (!report?.hasData) {
    return (
      <Text fontSize="sm" color="gray.500">
        Merge audit data is not available for this request.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={5}>
      <Text fontSize="sm" color="gray.700">
        Source locations: {String(report.sourceLocationCount || 0)} | Final locations: {String(report.reducedLocationCount || 0)}
      </Text>
      <ReportDataTable
        rows={report.rows || []}
        emptyText="No merged locations were recorded."
        columns={[
          { key: "finalLocation", label: "Final Location" },
          {
            key: "mergedLocations",
            label: "Merged Locations",
            render: (row) => (
              <VStack align="start" spacing={1}>
                {(row.mergedLocations || []).map((location, index) => (
                  <Text key={`${location.location || "location"}-${index}`} fontSize="sm" color="gray.800">
                    {[location.location, location.sourceLabel].filter(Boolean).join(" | ")}
                  </Text>
                ))}
              </VStack>
            ),
          },
        ]}
      />
    </VStack>
  );
}

function CompanyResearchQueueItemDrawer({
  item,
  activeTab,
  availableTabs = [],
  isLoadingDetail = false,
  detailError = "",
  isOpen,
  onChangeTab,
  onClose,
  onRerunRequest,
  report = null,
}) {
  const tabIndex = Math.max(
    0,
    availableTabs.findIndex((tab) => tab.key === activeTab)
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="full">
      <DrawerOverlay />
      <DrawerContent maxW={{ base: "100vw", lg: "75vw" }}>
        <DrawerCloseButton zIndex={2} />
        <DrawerBody py={0} px={0}>
          <Tabs
            index={tabIndex}
            onChange={(index) => {
              const nextTab = availableTabs[index];
              if (nextTab && typeof onChangeTab === "function") {
                onChangeTab(nextTab.key);
              }
            }}
            isLazy
            variant="unstyled"
          >
            <TabList px={6} pt={4} overflowX="auto" whiteSpace="nowrap">
              {availableTabs.map((tab) => (
                <Tab
                  key={tab.key}
                  fontSize="sm"
                  fontWeight="semibold"
                  color="gray.600"
                  borderBottomWidth="2px"
                  borderBottomColor="transparent"
                  _selected={{ color: "blue.700", borderBottomColor: "blue.500" }}
                >
                  {tab.label}
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              <TabPanel px={6} py={5}>
                <OverviewTabContent
                  item={item}
                  isLoadingDetail={isLoadingDetail}
                  detailError={activeTab === OVERVIEW_REPORT_TYPE ? detailError : ""}
                  onClose={onClose}
                  onRerunRequest={onRerunRequest}
                />
              </TabPanel>
              {availableTabs.slice(1).map((tab) => (
                <TabPanel key={tab.key} px={6} py={5}>
                  {tab.key === "salesforceSaveDecisions" ? (
                    <SalesforceSaveDecisionsTabContent
                      report={activeTab === tab.key ? report : null}
                      detailError={activeTab === tab.key ? detailError : ""}
                      isLoading={activeTab === tab.key ? isLoadingDetail : false}
                    />
                  ) : null}
                  {tab.key === "companyResearchAudit" ? (
                    <CompanyResearchAuditTabContent
                      report={activeTab === tab.key ? report : null}
                      detailError={activeTab === tab.key ? detailError : ""}
                      isLoading={activeTab === tab.key ? isLoadingDetail : false}
                    />
                  ) : null}
                  {tab.key === "mergeExplained" ? (
                    <MergeExplainedTabContent
                      report={activeTab === tab.key ? report : null}
                      detailError={activeTab === tab.key ? detailError : ""}
                      isLoading={activeTab === tab.key ? isLoadingDetail : false}
                    />
                  ) : null}
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
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
  const [activeTab, setActiveTab] = useState(OVERVIEW_REPORT_TYPE);
  const [detailByKey, setDetailByKey] = useState({});
  const [detailLoadingKey, setDetailLoadingKey] = useState("");
  const [detailErrorByKey, setDetailErrorByKey] = useState({});

  const rows = useMemo(() => items, [items]);
  const selectedSummaryItem = useMemo(
    () => rows.find((item) => item?.id === selectedItemId) || null,
    [rows, selectedItemId]
  );
  const overviewDetailKey = selectedItemId != null
    ? buildDetailCacheKey(selectedItemId, OVERVIEW_REPORT_TYPE)
    : "";
  const activeDetailKey = selectedItemId != null
    ? buildDetailCacheKey(selectedItemId, activeTab)
    : "";
  const selectedOverviewDetailItem = overviewDetailKey
    ? detailByKey[overviewDetailKey] || null
    : null;
  const activeDetailItem = activeDetailKey ? detailByKey[activeDetailKey] || null : null;
  const selectedItem = useMemo(
    () => mergeSelectedItem(selectedSummaryItem, selectedOverviewDetailItem),
    [selectedOverviewDetailItem, selectedSummaryItem]
  );
  const visibleTabs = useMemo(
    () => getVisibleRequestDrawerTabs(selectedItem),
    [selectedItem]
  );
  const activeReport = activeTab === OVERVIEW_REPORT_TYPE
    ? null
    : activeDetailItem?.report || null;
  const activeDetailError = activeDetailKey
    ? detailErrorByKey[activeDetailKey] || ""
    : "";
  const isLoadingActiveDetail = activeDetailKey === detailLoadingKey;
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
    setActiveTab(OVERVIEW_REPORT_TYPE);
  }, [selectedItemId]);

  useEffect(() => {
    if (!selectedSummaryItem?.id) {
      setDetailLoadingKey("");
      return;
    }
    const reportType = activeTab || OVERVIEW_REPORT_TYPE;
    const detailKey = buildDetailCacheKey(selectedSummaryItem.id, reportType);
    const cachedDetail = detailByKey[detailKey] || null;
    const shouldPoll =
      reportType === OVERVIEW_REPORT_TYPE && !selectedSummaryItem.completedAt;
    const shouldLoadDetail = reportType === OVERVIEW_REPORT_TYPE
      ? shouldRefreshDetail(selectedSummaryItem, cachedDetail)
      : !cachedDetail;

    if (!shouldLoadDetail && !shouldPoll) {
      if (detailLoadingKey === detailKey) {
        setDetailLoadingKey("");
      }
      return;
    }

    let isActive = true;

    async function loadDetail() {
      if (isActive) {
        setDetailLoadingKey(detailKey);
        setDetailErrorByKey((current) => ({
          ...current,
          [detailKey]: "",
        }));
      }
      try {
        const response = await fetch(
          buildDetailRequestPath(selectedSummaryItem.id, reportType),
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
          setDetailByKey((current) => ({
            ...current,
            [detailKey]: payload.item,
          }));
        }
      } catch (loadError) {
        if (!isActive) {
          return;
        }
        setDetailErrorByKey((current) => ({
          ...current,
          [detailKey]:
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Company Research detail.",
        }));
      } finally {
        if (isActive) {
          setDetailLoadingKey((current) => (current === detailKey ? "" : current));
        }
      }
    }

    if (shouldLoadDetail) {
      loadDetail();
    }
    if (!shouldPoll) {
      return () => {
        isActive = false;
      };
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDetail();
      }
    }, DETAIL_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [
    activeTab,
    detailByKey,
    detailLoadingKey,
    selectedSummaryItem,
    selectedSummaryItemRefreshKey,
  ]);

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
        activeTab={activeTab}
        availableTabs={visibleTabs}
        isLoadingDetail={Boolean(selectedSummaryItem) && isLoadingActiveDetail}
        detailError={activeDetailError}
        isOpen={Boolean(selectedItemId)}
        onChangeTab={setActiveTab}
        onClose={() => setSelectedItemId(null)}
        onRerunRequest={onRerunRequest}
        report={activeReport}
      />
    </>
  );
}
