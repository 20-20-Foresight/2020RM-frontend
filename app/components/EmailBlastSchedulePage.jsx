import React, { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  HStack,
  IconButton,
  Select,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiArrowLeft, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { StatusPill, EMAIL_BLAST_STATUS_TONES } from "./ui/atoms/StatusPill";
import { WeekCalendarGrid } from "./ui/organisms/WeekCalendarGrid";
import { SendChunkScheduler } from "./ui/organisms/SendChunkScheduler";
import { ChunkRecipientsTable } from "./ui/organisms/ChunkRecipientsTable";
import { ExclusionRulesEditor } from "./ui/organisms/ExclusionRulesEditor";
import { EmailComposerPanel } from "./ui/organisms/EmailComposerPanel";
import { MOCK_ALL_SERVICES } from "../models/services-mock-data.mjs";
import {
  buildEmailTemplatePreview,
  buildEmptyEmailSnippetDocument,
  buildEmptyEmailTemplateDocument,
} from "../models/email-template-document.mjs";
import {
  CANNED_AUDIENCE_LISTS,
  CHUNK_STATUSES,
  CHUNK_STATUS_COLORS,
  COOLDOWN_OPTIONS,
  EMAIL_BLAST_STATUSES,
  MOCK_EMAIL_BLAST_REQUESTS,
  MOCK_EMAIL_EXCLUSION_LISTS,
  MOCK_EMAIL_FOOTER_SNIPPETS,
  MOCK_EMAIL_HEADER_SNIPPETS,
  MOCK_EMAIL_STARTER_TEMPLATES,
  MOCK_SEND_CHUNKS,
  SAMPLE_COMPOSE_HTML,
  SPLIT_DIMENSIONS,
  buildDesignFromBodyHtml,
  statusIndex,
} from "../models/email-blast-mock-data.mjs";

const HOUR_RANGE = [7, 19];
const VERIFIER_OPTIONS = ["Ashley B.", "Nupur K.", "Brigitte S."];
const PENDING_STATUSES = new Set(["pending-approval", "approved"]);
const REVIEW_TABS = ["Summary", "Recipients", "Exclusions", "Compose Email", "Preview Email", "Schedule"];
const SUMMARY_TAB_INDEX = 0;

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function toUtcMidnight(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(a, b) {
  return Math.round((toUtcMidnight(b) - toUtcMidnight(a)) / 86400000);
}

function formatWeekRangeLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function getService(serviceId) {
  return MOCK_ALL_SERVICES.find((entry) => entry.id === serviceId) || null;
}

function getServiceLabel(serviceId) {
  const service = getService(serviceId);
  return service ? `${service.title} — ${service.subtitle}` : serviceId;
}

function getAudienceLabel(request) {
  if (request.audienceSource.type === "canned") {
    const list = CANNED_AUDIENCE_LISTS.find((entry) => entry.id === request.audienceSource.cannedListId);
    return list?.label || "Canned list";
  }
  return "Custom query";
}

/**
 * Status label as Research sees it on this page — "Pending Approval" is a
 * recruiter/approval-workflow concept; once a request lands here it's simply
 * awaiting scheduling. Only overrides the display label on this page, not
 * the underlying status or its label anywhere else (the wizard, the
 * Outreach tab, etc. still say "Pending Approval").
 * @param {string} statusKey
 * @returns {string}
 */
function getStatusLabelForSchedulePage(statusKey) {
  if (statusKey === "pending-approval") {
    return "Awaiting Scheduling";
  }
  return EMAIL_BLAST_STATUSES[statusIndex(statusKey)].label;
}

function describeQueryFilters(filters) {
  return SPLIT_DIMENSIONS.map((dimension) => {
    const values = filters?.[dimension.key] || [];
    if (!values.length) return null;
    const labels = values.map((value) => dimension.options.find((option) => option.key === value)?.label || value);
    return { label: dimension.label, values: labels };
  }).filter(Boolean);
}

/**
 * A request starts scheduling as one whole-audience chunk — Research splits
 * it from there. Only synthesized when nothing's been split/confirmed yet.
 * @param {{estimatedAudienceSize: number}} request
 * @param {Array<object>} existingChunks
 * @returns {Array<object>}
 */
function buildInitialChunks(request, existingChunks) {
  if (existingChunks.length) {
    return existingChunks;
  }
  return [
    {
      label: "All Recipients",
      estimatedSize: request.estimatedAudienceSize,
      order: 0,
      status: "scheduled",
      scheduledAt: null,
    },
  ];
}

function buildRequestPreview(request) {
  const template = buildEmptyEmailTemplateDocument({ key: "email-blast-review" });
  template.draft.subject = request.email.subject;
  template.draft.html = request.email.bodyHtml || SAMPLE_COMPOSE_HTML;
  template.slots.header.snippetKey = request.email.headerSnippetId ? "header" : "";
  template.slots.footer.snippetKey = request.email.footerSnippetId ? "footer" : "";

  const headerSnippetMock = MOCK_EMAIL_HEADER_SNIPPETS.find((entry) => entry.id === request.email.headerSnippetId);
  const footerSnippetMock = MOCK_EMAIL_FOOTER_SNIPPETS.find((entry) => entry.id === request.email.footerSnippetId);
  const snippetsByKey = {};
  if (headerSnippetMock) {
    const headerDoc = buildEmptyEmailSnippetDocument({ key: "header", snippetKind: "header" });
    headerDoc.draft.html = headerSnippetMock.html;
    snippetsByKey.header = headerDoc;
  }
  if (footerSnippetMock) {
    const footerDoc = buildEmptyEmailSnippetDocument({ key: "footer", snippetKind: "footer" });
    footerDoc.draft.html = footerSnippetMock.html;
    snippetsByKey.footer = footerDoc;
  }

  return buildEmailTemplatePreview({ template, snippetsByKey });
}

function formatChunkTime(scheduledAt) {
  if (!scheduledAt) return "Not scheduled";
  return new Date(scheduledAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Research-facing Schedule Email Blast page. Opens on a real week-at-a-glance
 * calendar (Outlook/Google-style) — chunks are color-coded scheduled/queued/
 * processing/completed (matching the yellow/purple/red scheme described for
 * the original Outlook calendar) and clickable, opening a near-full-width
 * review flyout with the recipient list, each person's send status, fully
 * editable exclusions (including excluding specific people) and compose
 * email, and the chunk-scheduling widget. All state is local/mock.
 */
export function EmailBlastSchedulePage() {
  const [requests, setRequests] = useState(MOCK_EMAIL_BLAST_REQUESTS);
  const [chunks, setChunks] = useState(MOCK_SEND_CHUNKS);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date("2026-07-08T00:00:00-05:00")));

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const [focusedChunkId, setFocusedChunkId] = useState(null);
  const [activeReviewTab, setActiveReviewTab] = useState(SUMMARY_TAB_INDEX);
  const [draftChunks, setDraftChunks] = useState([]);
  const [verifiedBy, setVerifiedBy] = useState("");

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const calendarEvents = useMemo(() => {
    return chunks
      .filter((chunk) => chunk.scheduledAt)
      .map((chunk) => {
        const scheduledDate = new Date(chunk.scheduledAt);
        const dayIndex = daysBetween(weekStart, scheduledDate);
        const request = requests.find((entry) => entry.id === chunk.requestId);
        return {
          id: chunk.id,
          dayIndex,
          startMinutes: scheduledDate.getHours() * 60 + scheduledDate.getMinutes(),
          label: chunk.label,
          sublabel: `~${chunk.estimatedSize.toLocaleString()} · ${request ? getServiceLabel(request.serviceId) : ""}`,
          color: CHUNK_STATUS_COLORS[chunk.status] || CHUNK_STATUS_COLORS.scheduled,
        };
      })
      .filter((event) => event.dayIndex >= 0 && event.dayIndex < 7);
  }, [chunks, requests, weekStart]);

  const pendingRequests = useMemo(() => requests.filter((request) => PENDING_STATUSES.has(request.status)), [requests]);
  const reviewingRequest = useMemo(
    () => requests.find((request) => request.id === reviewingRequestId) || null,
    [requests, reviewingRequestId]
  );
  const requestChunks = useMemo(
    () => (reviewingRequest ? chunks.filter((chunk) => chunk.requestId === reviewingRequest.id) : []),
    [chunks, reviewingRequest]
  );
  const focusedChunk = useMemo(
    () => requestChunks.find((chunk) => chunk.id === focusedChunkId) || requestChunks[0] || null,
    [requestChunks, focusedChunkId]
  );
  const preview = useMemo(() => (reviewingRequest ? buildRequestPreview(reviewingRequest) : null), [reviewingRequest]);

  function updateRequest(requestId, patch) {
    setRequests((current) => current.map((request) => (request.id === requestId ? { ...request, ...patch } : request)));
  }

  function updateReviewingExclusions(patch) {
    if (!reviewingRequest) return;
    updateRequest(reviewingRequest.id, { exclusions: { ...reviewingRequest.exclusions, ...patch } });
  }

  function updateReviewingEmail(patch) {
    if (!reviewingRequest) return;
    updateRequest(reviewingRequest.id, { email: { ...reviewingRequest.email, ...patch } });
  }

  function openDrawer() {
    setIsDrawerOpen(true);
    setReviewingRequestId(null);
    setFocusedChunkId(null);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setReviewingRequestId(null);
    setFocusedChunkId(null);
  }

  function backToList() {
    setReviewingRequestId(null);
    setFocusedChunkId(null);
  }

  function openRequestReview(requestId, chunkId = null) {
    const request = requests.find((entry) => entry.id === requestId);
    const relatedChunks = chunks.filter((chunk) => chunk.requestId === requestId);
    const resolvedChunk = relatedChunks.find((chunk) => chunk.id === chunkId) || relatedChunks[0] || null;

    setReviewingRequestId(requestId);
    setFocusedChunkId(resolvedChunk?.id || null);
    setVerifiedBy("");
    setDraftChunks(buildInitialChunks(request, relatedChunks));
    setActiveReviewTab(SUMMARY_TAB_INDEX);
    setIsDrawerOpen(true);
  }

  function handleCalendarEventClick(chunkId) {
    const chunk = chunks.find((entry) => entry.id === chunkId);
    if (!chunk) return;
    openRequestReview(chunk.requestId, chunk.id);
  }

  function handleFreezeSnapshot() {
    updateRequest(reviewingRequestId, {
      snapshotFrozenAt: new Date().toISOString(),
      status: reviewingRequest.status === "pending-approval" ? "approved" : reviewingRequest.status,
    });
  }

  const canConfirmSchedule =
    reviewingRequest &&
    Boolean(reviewingRequest.snapshotFrozenAt) &&
    Boolean(verifiedBy) &&
    draftChunks.length > 0 &&
    draftChunks.every((chunk) => chunk.scheduledAt);

  function handleConfirmSchedule() {
    if (!canConfirmSchedule) return;
    const finalized = draftChunks.map((chunk, index) => ({
      ...chunk,
      id: chunk.id || `chunk-${reviewingRequest.id}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      requestId: reviewingRequest.id,
      status: chunk.status || "scheduled",
    }));

    setChunks((current) => [...current.filter((chunk) => chunk.requestId !== reviewingRequest.id), ...finalized]);
    updateRequest(reviewingRequest.id, { status: "scheduled" });
    closeDrawer();
  }

  return (
    <Flex direction="column" h="calc(100vh - 250px)" minH="480px">
      <Flex justify="space-between" align="flex-start" mb={3} flexWrap="wrap" gap={3} flexShrink={0}>
        <Box>
          <Heading size="lg" mb={1}>Email Blast Manager</Heading>
          <Text color="gray.600">See exactly when each chunk of a blast goes out this week.</Text>
        </Box>
        <HStack spacing={4} flexWrap="wrap">
          <HStack spacing={2}>
            <IconButton
              aria-label="Previous week"
              icon={<FiChevronLeft />}
              size="sm"
              variant="outline"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
            />
            <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date("2026-07-08T00:00:00-05:00")))}>
              Today
            </Button>
            <IconButton
              aria-label="Next week"
              icon={<FiChevronRight />}
              size="sm"
              variant="outline"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
            />
            <Text fontSize="sm" color="gray.500" minW="170px">
              {formatWeekRangeLabel(weekStart)}
            </Text>
          </HStack>
          <Button colorScheme="blue" onClick={openDrawer}>
            Review Pending Blast Requests
            {pendingRequests.length ? ` (${pendingRequests.length})` : ""}
          </Button>
        </HStack>
      </Flex>

      <Box flex="1" minH={0}>
        <WeekCalendarGrid
          weekStart={weekStart}
          hourRange={HOUR_RANGE}
          events={calendarEvents}
          onEventClick={handleCalendarEventClick}
          height="100%"
        />
      </Box>

      <HStack spacing={5} mt={3} flexWrap="wrap" flexShrink={0}>
        {CHUNK_STATUSES.map((status) => (
          <HStack key={status.key} spacing={1.5}>
            <Box boxSize="10px" borderRadius="full" bg={CHUNK_STATUS_COLORS[status.key]} />
            <Text fontSize="xs" color="gray.500">{status.label}</Text>
          </HStack>
        ))}
      </HStack>

      <Drawer isOpen={isDrawerOpen} onClose={closeDrawer} placement="right">
        <DrawerOverlay />
        <DrawerContent maxW="95vw">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            {reviewingRequest ? (
              <HStack spacing={3}>
                <IconButton aria-label="Back to list" icon={<FiArrowLeft />} size="sm" variant="ghost" onClick={backToList} />
                <Box>
                  <Text fontSize="md">{getServiceLabel(reviewingRequest.serviceId)}</Text>
                  <HStack spacing={2}>
                    <StatusPill
                      label={getStatusLabelForSchedulePage(reviewingRequest.status)}
                      tone={EMAIL_BLAST_STATUS_TONES[reviewingRequest.status]}
                    />
                    <Text fontSize="xs" color="gray.500" fontWeight="normal">
                      Requested by {reviewingRequest.requestedBy}
                    </Text>
                  </HStack>
                </Box>
              </HStack>
            ) : (
              "Pending Blast Requests"
            )}
          </DrawerHeader>

          <DrawerBody py={5}>
            {!reviewingRequest ? (
              <VStack align="stretch" spacing={2} maxW="640px">
                {pendingRequests.length ? (
                  pendingRequests.map((request) => (
                    <Box
                      key={request.id}
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      p={3}
                      cursor="pointer"
                      onClick={() => openRequestReview(request.id)}
                      _hover={{ borderColor: "blue.300" }}
                    >
                      <HStack justify="space-between" mb={1}>
                        <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                          {getServiceLabel(request.serviceId)}
                        </Text>
                        <StatusPill
                          label={getStatusLabelForSchedulePage(request.status)}
                          tone={EMAIL_BLAST_STATUS_TONES[request.status]}
                        />
                      </HStack>
                      <HStack justify="space-between" fontSize="xs" color="gray.500">
                        <Text>{request.requestedBy} · {getAudienceLabel(request)}</Text>
                        <Text fontVariantNumeric="tabular-nums">~{request.estimatedAudienceSize.toLocaleString()}</Text>
                      </HStack>
                    </Box>
                  ))
                ) : (
                  <Text color="gray.500" fontSize="sm">Nothing waiting on Research right now.</Text>
                )}
              </VStack>
            ) : (
              <Tabs index={activeReviewTab} onChange={setActiveReviewTab}>
                <TabList>
                  {REVIEW_TABS.map((label) => (
                    <Tab key={label} fontSize="sm">{label}</Tab>
                  ))}
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={5} maxW="900px">
                      <HStack justify="space-between" align="flex-start">
                        <Box>
                          <Heading size="md" mb={1}>{reviewingRequest.email.subject}</Heading>
                          <Text color="gray.600" fontSize="sm">{getServiceLabel(reviewingRequest.serviceId)}</Text>
                        </Box>
                        <StatusPill
                          label={getStatusLabelForSchedulePage(reviewingRequest.status)}
                          tone={EMAIL_BLAST_STATUS_TONES[reviewingRequest.status]}
                        />
                      </HStack>

                      {(() => {
                        const recipients = requestChunks.length
                          ? requestChunks.reduce((sum, chunk) => sum + chunk.estimatedSize, 0)
                          : reviewingRequest.estimatedAudienceSize;
                        const delivered = Math.round(recipients * 0.96);
                        const opened = Math.round(recipients * 0.37);
                        const clicked = Math.round(recipients * 0.08);
                        return (
                          <SimpleGrid columns={4} spacing={4}>
                            {[
                              { label: "Recipients", value: recipients },
                              { label: "Delivered", value: delivered },
                              { label: "Opened", value: opened },
                              { label: "Clicked", value: clicked },
                            ].map((stat) => (
                              <Box key={stat.label} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4} textAlign="center">
                                <Text fontSize="2xl" fontWeight="bold" fontVariantNumeric="tabular-nums">{stat.value.toLocaleString()}</Text>
                                <Text fontSize="xs" color="gray.500">{stat.label}</Text>
                              </Box>
                            ))}
                          </SimpleGrid>
                        );
                      })()}

                      {requestChunks.length ? (
                        <Box>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="0.06em" mb={2}>
                            Chunks
                          </Text>
                          <VStack align="stretch" spacing={2}>
                            {requestChunks.map((chunk) => (
                              <HStack key={chunk.id} justify="space-between" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
                                <Text fontSize="sm">{chunk.label}</Text>
                                <Text fontSize="xs" color="gray.500">{formatChunkTime(chunk.scheduledAt)}</Text>
                                <Text fontSize="xs" fontVariantNumeric="tabular-nums" color="gray.500">~{chunk.estimatedSize.toLocaleString()}</Text>
                                <StatusPill
                                  label={CHUNK_STATUSES.find((s) => s.key === chunk.status)?.label || chunk.status}
                                  tone={chunk.status === "completed" ? "positive" : chunk.status === "processing" ? "info" : chunk.status === "queued" ? "pending" : "neutral"}
                                />
                              </HStack>
                            ))}
                          </VStack>
                        </Box>
                      ) : null}
                    </VStack>
                  </TabPanel>

                  <TabPanel px={0}>
                    {requestChunks.length ? (
                      <VStack align="stretch" spacing={4}>
                        {requestChunks.length > 1 ? (
                          <Select
                            size="sm"
                            maxW="360px"
                            value={focusedChunk?.id || ""}
                            onChange={(event) => setFocusedChunkId(event.target.value)}
                          >
                            {requestChunks.map((chunk) => (
                              <option key={chunk.id} value={chunk.id}>
                                {chunk.label} — {formatChunkTime(chunk.scheduledAt)}
                              </option>
                            ))}
                          </Select>
                        ) : null}
                        {focusedChunk ? (
                          <ChunkRecipientsTable
                            chunk={focusedChunk}
                            excludedPeople={reviewingRequest.exclusions.excludedPeople || []}
                            onExcludedPeopleChange={(people) => updateReviewingExclusions({ excludedPeople: people })}
                          />
                        ) : null}
                      </VStack>
                    ) : (
                      <VStack align="stretch" spacing={3} maxW="640px">
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                          {getAudienceLabel(reviewingRequest)}
                        </Text>
                        {reviewingRequest.audienceSource.type === "canned" ? (
                          <Text fontSize="sm" color="gray.500">
                            {CANNED_AUDIENCE_LISTS.find((l) => l.id === reviewingRequest.audienceSource.cannedListId)?.summary}
                          </Text>
                        ) : (
                          describeQueryFilters(reviewingRequest.audienceSource.filters).map((group) => (
                            <Box key={group.label}>
                              <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase">{group.label}</Text>
                              <HStack flexWrap="wrap" spacing={2} mt={1}>
                                {group.values.map((value) => (
                                  <Tag key={value} size="sm">{value}</Tag>
                                ))}
                              </HStack>
                            </Box>
                          ))
                        )}
                        <Text fontSize="sm" fontWeight="bold" fontVariantNumeric="tabular-nums">
                          ~{reviewingRequest.estimatedAudienceSize.toLocaleString()} people
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          No chunks scheduled yet — the recipient-by-recipient view appears once this request has been split
                          into chunks in the Schedule tab.
                        </Text>
                      </VStack>
                    )}
                  </TabPanel>

                  <TabPanel px={0}>
                    <Box>
                      <ExclusionRulesEditor
                        cooldownOptions={COOLDOWN_OPTIONS}
                        cooldownHours={reviewingRequest.exclusions.cooldownHours}
                        onCooldownHoursChange={(hours) => updateReviewingExclusions({ cooldownHours: hours })}
                        excludePersonalEmails={reviewingRequest.exclusions.excludePersonalEmails}
                        onExcludePersonalEmailsChange={(value) => updateReviewingExclusions({ excludePersonalEmails: value })}
                        excludeWorkEmails={reviewingRequest.exclusions.excludeWorkEmails}
                        onExcludeWorkEmailsChange={(value) => updateReviewingExclusions({ excludeWorkEmails: value })}
                        permanentExcludes={reviewingRequest.exclusions.permanentExcludes}
                        onPermanentExcludesChange={(excludes) => updateReviewingExclusions({ permanentExcludes: excludes })}
                        excludedPeople={reviewingRequest.exclusions.excludedPeople || []}
                        onExcludedPeopleChange={(people) => updateReviewingExclusions({ excludedPeople: people })}
                        exclusionLists={MOCK_EMAIL_EXCLUSION_LISTS}
                        selectedExclusionListIds={reviewingRequest.exclusions.exclusionListIds || []}
                        onSelectedExclusionListIdsChange={(ids) => updateReviewingExclusions({ exclusionListIds: ids })}
                      />
                    </Box>
                  </TabPanel>

                  <TabPanel px={0}>
                    <EmailComposerPanel
                      starterTemplates={MOCK_EMAIL_STARTER_TEMPLATES}
                      selectedStarterTemplateId={reviewingRequest.email.starterTemplateId || ""}
                      onSelectStarterTemplate={(templateId) => {
                        const template = MOCK_EMAIL_STARTER_TEMPLATES.find((entry) => entry.id === templateId);
                        updateReviewingEmail({
                          starterTemplateId: templateId,
                          ...(template ? { subject: template.subject, previewText: template.previewText } : {}),
                        });
                      }}
                      subject={reviewingRequest.email.subject}
                      onSubjectChange={(subject) => updateReviewingEmail({ subject })}
                      previewText={reviewingRequest.email.previewText}
                      onPreviewTextChange={(previewText) => updateReviewingEmail({ previewText })}
                      headerSnippets={MOCK_EMAIL_HEADER_SNIPPETS}
                      footerSnippets={MOCK_EMAIL_FOOTER_SNIPPETS}
                      headerSnippetId={reviewingRequest.email.headerSnippetId}
                      onHeaderSnippetChange={(id) => updateReviewingEmail({ headerSnippetId: id })}
                      footerSnippetId={reviewingRequest.email.footerSnippetId}
                      onFooterSnippetChange={(id) => updateReviewingEmail({ footerSnippetId: id })}
                      initialDesign={buildDesignFromBodyHtml(reviewingRequest.email.bodyHtml)}
                    />
                  </TabPanel>

                  <TabPanel px={0}>
                    <Box maxW="680px" mx="auto" w="full" borderWidth="1px" borderColor="gray.200" borderRadius="lg" boxShadow="md" bg="white" overflow="hidden">
                      <Box px={6} py={5} borderBottomWidth="1px" borderColor="gray.100">
                        <VStack align="stretch" spacing={0.5} fontSize="sm" color="gray.600" mb={3}>
                          <HStack spacing={2}>
                            <Text fontWeight="semibold" color="gray.500" minW="42px">From:</Text>
                            <Text>rpeck@2020foresight.com</Text>
                          </HStack>
                          <HStack spacing={2}>
                            <Text fontWeight="semibold" color="gray.500" minW="42px">To:</Text>
                            <Text>receiver@company.com</Text>
                          </HStack>
                        </VStack>
                        <Heading size="md" lineHeight="short">{preview?.subject}</Heading>
                      </Box>
                      <Box px={6} py={5}>
                        <Box dangerouslySetInnerHTML={{ __html: preview?.html || "" }} />
                      </Box>
                    </Box>
                  </TabPanel>

                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={5} maxW="900px">
                      <Box>
                        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="0.06em" mb={2}>
                          Point-in-time snapshot
                        </Text>
                        {reviewingRequest.snapshotFrozenAt ? (
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.600">
                              Frozen at ~{reviewingRequest.estimatedAudienceSize.toLocaleString()} people
                            </Text>
                            <Badge colorScheme="green" variant="subtle">
                              {new Date(reviewingRequest.snapshotFrozenAt).toLocaleString(undefined, {
                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                              })}
                            </Badge>
                          </HStack>
                        ) : (
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">Not frozen yet — the query is still live.</Text>
                            <Button size="sm" onClick={handleFreezeSnapshot}>Freeze snapshot</Button>
                          </HStack>
                        )}
                      </Box>

                      <Divider />

                      <Box>
                        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="0.06em" mb={2}>
                          Split into chunks
                        </Text>
                        <SendChunkScheduler
                          chunks={draftChunks}
                          onChunksChange={setDraftChunks}
                          weekDays={weekDays}
                          hourRange={HOUR_RANGE}
                        />
                      </Box>

                      <Divider />

                      <Box>
                        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="0.06em" mb={2}>
                          Two-person check
                        </Text>
                        <Text fontSize="sm" color="gray.500" mb={2}>
                          Requested by {reviewingRequest.requestedBy}. A second person verifies before this is queued.
                        </Text>
                        <Select placeholder="Select verifier" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} maxW="260px">
                          {VERIFIER_OPTIONS.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </Select>
                      </Box>

                      <Button colorScheme="blue" alignSelf="flex-end" isDisabled={!canConfirmSchedule} onClick={handleConfirmSchedule}>
                        Confirm schedule
                      </Button>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}
