import React, { useEffect, useState } from "react";
import { useRevalidator } from "@remix-run/react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link,
  ListItem,
  Skeleton,
  SkeletonText,
  SimpleGrid,
  Spinner,
  Stack,
  Tooltip,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  UnorderedList,
  useToast,
  useDisclosure,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  MdAutoAwesome,
  MdAutorenew,
  MdBusiness,
  MdContentCopy,
  MdOpenInNew,
} from "react-icons/md";
import { buildOrganizationSegmentationViewModel } from "../models/organization-segmentation.mjs";
import { postResegmentationAction } from "../models/resegmentation-client.mjs";
import { buildSegmentationDocumentPath } from "../models/segmentation-document.mjs";

const BORDER_COLOR = "#D7DFEC";
const BRAND_BLUE = "#0F4C81";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readObjectField(value, ...keys) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  for (const key of keys) {
    if (key == null) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return value[key];
    }
  }

  return undefined;
}

function dedupeStrings(values = []) {
  const seen = new Set();
  const normalized = [];

  (Array.isArray(values) ? values : []).forEach((value) => {
    const text = readTrimmedString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(text);
  });

  return normalized;
}

function normalizeComparisonText(value) {
  return readTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeComparisonText(value) {
  return normalizeComparisonText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function computeTokenOverlap(leftValue, rightValue) {
  const leftTokens = new Set(tokenizeComparisonText(leftValue));
  const rightTokens = new Set(tokenizeComparisonText(rightValue));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlapCount = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlapCount += 1;
    }
  });

  return overlapCount / Math.max(1, Math.min(leftTokens.size, rightTokens.size));
}

function shouldAppendFollowUpQuestion({ assistantContent, followUpQuestion, userMessage }) {
  const normalizedFollowUp = readTrimmedString(followUpQuestion);
  if (!normalizedFollowUp) {
    return false;
  }

  const normalizedAssistant = readTrimmedString(assistantContent);
  if (
    normalizedAssistant &&
    normalizeComparisonText(normalizedAssistant).includes(
      normalizeComparisonText(normalizedFollowUp)
    )
  ) {
    return false;
  }

  if (computeTokenOverlap(normalizedFollowUp, userMessage) >= 0.8) {
    return false;
  }

  return true;
}

function renderChatMessageContent(content) {
  const text = readTrimmedString(content);
  if (!text) {
    return null;
  }

  const sections = text
    .split(/\n\s*\n/g)
    .map((section) => section.trim())
    .filter(Boolean);

  return (
    <Stack spacing={3}>
      {sections.map((section, sectionIndex) => {
        const lines = section
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));
        const allLinesAreBullets = lines.length > 0 && bulletLines.length === lines.length;

        if (allLinesAreBullets) {
          return (
            <UnorderedList
              key={`section-${sectionIndex}`}
              spacing={2}
              pl={5}
              color="inherit"
            >
              {bulletLines.map((line, lineIndex) => (
                <ListItem key={`bullet-${sectionIndex}-${lineIndex}`}>
                  <Text as="span" fontSize="sm" lineHeight="1.8">
                    {line.replace(/^[-*]\s+/, "")}
                  </Text>
                </ListItem>
              ))}
            </UnorderedList>
          );
        }

        return (
          <Text
            key={`section-${sectionIndex}`}
            fontSize="sm"
            lineHeight="1.8"
            whiteSpace="pre-wrap"
          >
            {section}
          </Text>
        );
      })}
    </Stack>
  );
}

function renderQuotedReasonText(content) {
  const text = readTrimmedString(content);
  if (!text) {
    return null;
  }

  return text.split(/(".*?")/g).filter(Boolean).map((part, index) => {
    if (/^".*"$/.test(part)) {
      return (
        <Text as="strong" key={`reason-quote-${index}`} fontWeight="semibold">
          {part}
        </Text>
      );
    }

    return <span key={`reason-text-${index}`}>{part}</span>;
  });
}

const LABEL_HIGHLIGHT_HINTS = {
  Development: [
    "real estate developer",
    "real estate construction",
    "developer",
    "development",
    "construction",
    "redevelopment",
    "entitlements",
  ],
  "Real Estate": ["real estate company", "real estate"],
  "Real Estate Investment Company": [
    "real estate investment firm",
    "developer",
    "operator",
  ],
  "RE Residential": ["student housing", "multifamily", "resident experience"],
  Residential: ["student housing", "resident experience", "multifamily"],
  "Multi-Family": ["multifamily"],
  "Mixed-Use": ["mixed use", "mixed-use"],
};

function buildEvidenceHighlightPatterns(itemValue, evidence) {
  const patterns = [];
  const pushPattern = (value) => {
    const normalized = readTrimmedString(value);
    if (!normalized) {
      return;
    }
    if (!patterns.some((pattern) => pattern.toLowerCase() === normalized.toLowerCase())) {
      patterns.push(normalized);
    }
  };

  (LABEL_HIGHLIGHT_HINTS[readTrimmedString(itemValue) || ""] || []).forEach(pushPattern);
  pushPattern(readTrimmedString(itemValue));

  const evidenceText = readTrimmedString(evidence) || "";
  const quotedMatches = evidenceText.match(/"([^"]+)"/g) || [];
  quotedMatches
    .map((entry) => entry.replace(/^"|"$/g, ""))
    .forEach((quoted) => {
      const lowered = quoted.toLowerCase();
      patterns.forEach((pattern) => {
        if (lowered.includes(pattern.toLowerCase())) {
          pushPattern(pattern);
        }
      });
    });

  return patterns.sort((left, right) => right.length - left.length);
}

function renderHighlightedEvidenceText(evidence, itemValue) {
  const text = readTrimmedString(evidence);
  if (!text) {
    return null;
  }

  const patterns = buildEvidenceHighlightPatterns(itemValue, text);
  if (!patterns.length) {
    return text;
  }

  const regex = new RegExp(`(${patterns.map((pattern) => pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");

  return text.split(regex).filter(Boolean).map((part, index) => {
    if (patterns.some((pattern) => part.toLowerCase() === pattern.toLowerCase())) {
      return (
        <Text as="strong" key={`evidence-highlight-${index}`} fontWeight="semibold">
          {part}
        </Text>
      );
    }

    return <span key={`evidence-text-${index}`}>{part}</span>;
  });
}

function buildDebugTranscript(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const content = readTrimmedString(message?.content);
      if (!content) {
        return null;
      }

      const speaker = message?.role === "user" ? "USER" : "CHATBOT";
      return `[${speaker}]: ${content}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function normalizeAssessmentItem(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const normalizedValue = readTrimmedString(value.value);
  if (!normalizedValue) {
    return null;
  }

  return {
    value: normalizedValue,
    confidence: Math.max(1, Math.min(5, readFiniteNumber(value.confidence, 1))),
    reason: readTrimmedString(value.reason),
    evidence: dedupeStrings(value.evidence),
    score: readFiniteNumber(value.score, 0),
  };
}

function normalizeAssessmentList(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((value) => normalizeAssessmentItem(value))
    .filter(Boolean);
}

function normalizeSegmentationV312(record) {
  const metadataSegmentation =
    record?.metadata?.segmentation &&
    typeof record.metadata.segmentation === "object"
      ? record.metadata.segmentation
      : null;
  const metadataSegmentationV312 =
    record?.metadata?.segmentationV312 &&
    typeof record.metadata.segmentationV312 === "object"
      ? record.metadata.segmentationV312
      : null;

  return normalizeSegmentationV312Payload(
    metadataSegmentation &&
      (readTrimmedString(metadataSegmentation.strategy).toLowerCase() === "v312" ||
        Array.isArray(metadataSegmentation.verticals) ||
        (readObjectField(
          metadataSegmentation,
          "compatibilityProjection",
          "compatibilityprojection"
        ) &&
          typeof readObjectField(
            metadataSegmentation,
            "compatibilityProjection",
            "compatibilityprojection"
          ) === "object"))
      ? metadataSegmentation
      : metadataSegmentationV312
  );
}

function normalizeSegmentationV312Payload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    strategy: readTrimmedString(payload.strategy) || "v312",
    segmentedAt: readTrimmedString(readObjectField(payload, "segmentedAt", "segmentedat")),
    sector: normalizeAssessmentItem(payload.sector),
    verticals: normalizeAssessmentList(payload.verticals),
    visibleKeywords: normalizeAssessmentList(
      readObjectField(payload, "visibleKeywords", "visiblekeywords")
    ),
    emailIndustry: normalizeAssessmentItem(
      readObjectField(payload, "emailIndustry", "emailindustry")
    ),
    allKeywords: normalizeAssessmentList(
      readObjectField(payload, "allKeywords", "allkeywords")
    ),
    overallAssessment: normalizeAssessmentItem(
      readObjectField(payload, "overallAssessment", "overallassessment")
    ),
    lock:
      payload.lock && typeof payload.lock === "object"
        ? {
            locked: payload.lock.locked === true,
            mode: readTrimmedString(payload.lock.mode),
            reason: readTrimmedString(payload.lock.reason),
            lockedAt: readTrimmedString(
              readObjectField(payload.lock, "lockedAt", "lockedat")
            ),
            lockedBy: readTrimmedString(
              readObjectField(payload.lock, "lockedBy", "lockedby")
            ),
          }
        : {
            locked: false,
            mode: "",
            reason: "",
            lockedAt: "",
            lockedBy: "",
          },
    raw: payload,
  };
}

function resolveAssessmentWeight(item) {
  if (!item || typeof item !== "object") {
    return 0;
  }
  return item.score > 0 ? item.score : item.confidence;
}

function partitionVerticalsForPage(verticals = []) {
  if (!Array.isArray(verticals) || !verticals.length) {
    return {
      visible: [],
      hidden: [],
    };
  }

  const [primary, ...rest] = verticals;
  const primaryWeight = resolveAssessmentWeight(primary);
  const threshold = primaryWeight > 0 ? primaryWeight * 0.25 : 0;
  const visible = [primary];
  const hidden = [];

  rest.forEach((vertical) => {
    const verticalWeight = resolveAssessmentWeight(vertical);
    if (primaryWeight > 0 && verticalWeight < threshold) {
      hidden.push(vertical);
      return;
    }
    visible.push(vertical);
  });

  return {
    visible,
    hidden,
  };
}

function AssessmentCard({ title, item, emptyLabel = "Not set", isLoading = false }) {
  return (
    <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="20px" bg="white" p={5}>
      <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">
        {title}
      </Text>
      {isLoading ? (
        <Stack spacing={3} mt={3}>
          <Skeleton height="22px" width="55%" borderRadius="sm" />
          <SkeletonText noOfLines={2} spacing="3" skeletonHeight="14px" />
          <HStack spacing={2}>
            <Skeleton height="26px" width="90px" borderRadius="full" />
            <Skeleton height="26px" width="120px" borderRadius="full" />
          </HStack>
        </Stack>
      ) : item ? (
        <Stack spacing={3} mt={3}>
          <HStack justify="space-between" align="flex-start" spacing={4}>
            <Heading size="sm" color="gray.900">
              {item.value}
            </Heading>
            <Badge colorScheme="blue" borderRadius="full" px={3} py={1} textTransform="none">
              {item.confidence}/5
            </Badge>
          </HStack>
          {item.reason ? (
            <Text color="gray.700" lineHeight="1.7">
              {renderQuotedReasonText(item.reason)}
            </Text>
          ) : null}
          {item.evidence.length ? (
            <UnorderedList spacing={2} pl={5} color="gray.700">
              {item.evidence.map((evidence) => (
                <ListItem key={`${title}-${evidence}`} lineHeight="1.7">
                  <Text as="span" fontSize="sm">
                    {renderHighlightedEvidenceText(evidence, item.value)}
                  </Text>
                </ListItem>
              ))}
            </UnorderedList>
          ) : null}
        </Stack>
      ) : (
        <Text color="gray.500" mt={3}>
          {emptyLabel}
        </Text>
      )}
    </Box>
  );
}

function AssessmentListCard({ title, items, emptyLabel = "Not set", isLoading = false }) {
  return (
    <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="20px" bg="white" p={5}>
      <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="gray.500">
        {title}
      </Text>
      {isLoading ? (
        <Stack spacing={3} mt={3}>
          {[0, 1].map((index) => (
            <Box
              key={`${title}-loading-${index}`}
              borderWidth="1px"
              borderColor="gray.100"
              borderRadius="16px"
              bg="gray.50"
              p={4}
            >
              <Skeleton height="18px" width={index === 0 ? "42%" : "58%"} mb={3} borderRadius="sm" />
              <SkeletonText noOfLines={2} spacing="3" skeletonHeight="12px" />
            </Box>
          ))}
        </Stack>
      ) : Array.isArray(items) && items.length ? (
        <Stack spacing={3} mt={3}>
          {items.map((item) => (
            <Box
              key={`${title}-${item.value}`}
              borderWidth="1px"
              borderColor="gray.100"
              borderRadius="16px"
              bg="gray.50"
              p={4}
            >
              <HStack justify="space-between" align="flex-start" spacing={4}>
                <Text fontWeight="semibold" color="gray.900">
                  {item.value}
                </Text>
                <Badge colorScheme="blue" borderRadius="full" px={3} py={1} textTransform="none">
                  {item.confidence}/5
                </Badge>
              </HStack>
              {item.reason ? (
                <Text color="gray.700" fontSize="sm" lineHeight="1.7" mt={2}>
                  {renderQuotedReasonText(item.reason)}
                </Text>
              ) : null}
              {item.evidence.length ? (
                <UnorderedList spacing={2} pl={5} color="gray.700" mt={2}>
                  {item.evidence.map((evidence) => (
                    <ListItem key={`${title}-${item.value}-${evidence}`} lineHeight="1.7">
                      <Text as="span" fontSize="sm">
                        {renderHighlightedEvidenceText(evidence, item.value)}
                      </Text>
                    </ListItem>
                  ))}
                </UnorderedList>
              ) : null}
            </Box>
          ))}
        </Stack>
      ) : (
        <Text color="gray.500" mt={3}>
          {emptyLabel}
        </Text>
      )}
    </Box>
  );
}

function LoadingPanel({ title, lines = 4 }) {
  return (
    <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="24px" bg="white" p={6}>
      <Skeleton height="24px" width="240px" mb={5} borderRadius="sm" />
      <Stack spacing={4}>
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            key={`${title}-${index}`}
            height="16px"
            width={index === lines - 1 ? "68%" : "100%"}
            borderRadius="sm"
          />
        ))}
      </Stack>
    </Box>
  );
}

function formatJson(value) {
  return JSON.stringify(value || {}, null, 2);
}

function normalizeSegmentationFailureDetails(details) {
  if (!details || typeof details !== "object") {
    return null;
  }

  const context =
    details?.context && typeof details.context === "object"
      ? details.context
      : {};
  const diagnostics =
    details?.diagnostics && typeof details.diagnostics === "object"
      ? details.diagnostics
      : {};
  const unsupportedItems = Array.isArray(diagnostics.unsupportedItems)
    ? diagnostics.unsupportedItems
    : [];
  const weakEvidenceItems = Array.isArray(diagnostics.weakEvidenceItems)
    ? diagnostics.weakEvidenceItems
    : [];
  const passSummaries = Array.isArray(diagnostics.passSummaries)
    ? diagnostics.passSummaries
    : [];

  return {
    summary:
      readTrimmedString(details.summary) ||
      "Segmentation failed. Please have an admin review the logs and error details.",
    openAIMessage: readTrimmedString(details.openAIMessage),
    category: readTrimmedString(details.category),
    failureType: readTrimmedString(diagnostics.failureType),
    organizationDescriptionPresent:
      context.organizationDescriptionPresent === true,
    externalSourceCount: readFiniteNumber(context.externalSourceCount, 0),
    descriptiveEvidenceCount: readFiniteNumber(
      context.descriptiveEvidenceCount,
      0
    ),
    structuredEvidenceCount: readFiniteNumber(
      context.structuredEvidenceCount,
      0
    ),
    unsupportedItems,
    weakEvidenceItems,
    passSummaries,
  };
}

function renderFailureItemReasons(item) {
  const reasons = Array.isArray(item?.reasons)
    ? item.reasons.map((reason) => readTrimmedString(reason)).filter(Boolean)
    : [];
  return reasons.length ? reasons.join(", ") : "";
}

function renderFailureItemEvidence(item) {
  const evidence = Array.isArray(item?.parsedEvidence)
    ? item.parsedEvidence
    : Array.isArray(item?.evidencePreview)
      ? item.evidencePreview
      : [];
  return evidence.map((entry) => readTrimmedString(entry)).filter(Boolean);
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return bodyText ? JSON.parse(bodyText) : {};
    } catch (_error) {
      throw new Error("The segmentation review service returned invalid JSON.");
    }
  }

  throw new Error(bodyText.trim() || response.statusText || "Unexpected non-JSON response.");
}

async function postSegmentationReviewChat(organizationUUID, messages = []) {
  const response = await fetch(
    `/api/rest/organization/${encodeURIComponent(organizationUUID)}/segmentation-review/chat`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages,
      }),
    }
  );
  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(
      readTrimmedString(payload?.message) ||
        readTrimmedString(payload?.error) ||
        "Segmentation review request failed."
    );
  }

  return {
    review: payload?.review && typeof payload.review === "object" ? payload.review : null,
    status: readTrimmedString(payload?.status) || "completed",
    statusExplained: readTrimmedString(payload?.statusExplained) || "",
    meta: payload?.meta && typeof payload.meta === "object" ? payload.meta : null,
  };
}

function buildUnavailableAssistantReply(message, segmentation) {
  const normalized = readTrimmedString(message)?.toLowerCase() || "";
  const sector = readTrimmedString(segmentation?.sector?.value) || "Not set";
  const emailIndustry =
    readTrimmedString(segmentation?.emailIndustry?.value) || "Not set";

  if (normalized.includes("wrong")) {
    return `The live review service is not running right now, so I can't analyze this fully yet. Current sector is ${sector} and current email industry is ${emailIndustry}. When the service is back, this kind of feedback should turn into a proposed company correction, keyword change, or rule change.`;
  }

  if (normalized.includes("keyword")) {
    return `The live review service is not running right now. Based on the current saved segmentation, sector is ${sector} and email industry is ${emailIndustry}. When the service is back, keyword requests should come back as a reviewed add/remove/visibility proposal.`;
  }

  if (normalized.includes("rule")) {
    return `The live review service is not running right now. Based on the current saved segmentation, sector is ${sector} and email industry is ${emailIndustry}. When the service is back, rule questions should return a proposed playbook change rather than a direct save.`;
  }

  return `The live review service is not running right now. Current sector is ${sector} and current email industry is ${emailIndustry}.`;
}

function renderExplanationCrosswalk(row) {
  const crosswalkName = readTrimmedString(row?.crosswalkDocumentName);
  const crosswalkId = readTrimmedString(row?.crosswalkDocumentId);
  const label = crosswalkName || crosswalkId;

  if (!label) {
    return "Not set";
  }

  if (!crosswalkId) {
    return label;
  }

  return (
    <HStack spacing={1} align="center">
      <Text as="span" fontSize="sm">
        {label}
      </Text>
      <Link
        href={buildSegmentationDocumentPath(crosswalkId)}
        isExternal
        color="blue.500"
        aria-label={`Open ${label} crosswalk`}
      >
        <Icon as={MdOpenInNew} boxSize={3.5} />
      </Link>
    </HStack>
  );
}

export function OrganizationSegmentationReviewFlyout({
  isOpen,
  onClose,
  organizationUUID,
  organizationName,
  segmentation,
  onReviewOutcome,
}) {
  const [draftMessage, setDraftMessage] = useState("");
  const [copyState, setCopyState] = useState("idle");
  const [chatState, setChatState] = useState({
    status: "idle",
    error: "",
  });
  const [messages, setMessages] = useState([
    {
      id: "assistant-initial",
      role: "assistant",
      content:
        "I can help review segmentation on this organization. Ask why a result was chosen, say something is wrong, or propose a keyword or rule change.",
    },
  ]);

  useEffect(() => {
    setDraftMessage("");
    setMessages([
      {
        id: "assistant-initial",
        role: "assistant",
        content:
          "I can help review segmentation on this organization. Ask why a result was chosen, say something is wrong, or propose a keyword or rule change.",
      },
    ]);
    setChatState({
      status: "idle",
      error: "",
    });
    setCopyState("idle");
  }, [organizationUUID, organizationName]);

  async function handleCopyTranscript() {
    const transcript = buildDebugTranscript(messages);
    if (!transcript) {
      return;
    }

    try {
      await navigator.clipboard.writeText(transcript);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (_error) {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  async function pushUserMessage(message) {
    const trimmed = readTrimmedString(message);
    if (!trimmed || !organizationUUID || chatState.status === "sending") {
      return;
    }

    const nextUserMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setDraftMessage("");
    setChatState({
      status: "sending",
      error: "",
    });

    try {
      const payload = await postSegmentationReviewChat(organizationUUID, nextMessages);
      const assistantContent =
        readTrimmedString(payload?.review?.reply?.content) ||
        "I can help with segmentation review on this organization.";
      const needsFollowUp = payload?.review?.needsFollowUp === true;
      const followUpQuestion = readTrimmedString(payload?.review?.followUpQuestion);
      const appendFollowUp =
        needsFollowUp &&
        shouldAppendFollowUpQuestion({
          assistantContent,
          followUpQuestion,
          userMessage: trimmed,
        });
      const nextAssistantMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content: appendFollowUp
          ? `${assistantContent}\n\n${followUpQuestion}`
          : assistantContent,
      };

      setMessages((currentValue) => [...currentValue, nextAssistantMessage]);
      if (typeof onReviewOutcome === "function") {
        onReviewOutcome(payload?.review || null, payload);
      }
      setChatState({
        status: "idle",
        error: "",
      });
    } catch (error) {
      const fallbackAssistantMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content: buildUnavailableAssistantReply(trimmed, segmentation),
      };
      setMessages((currentValue) => [...currentValue, fallbackAssistantMessage]);
      setChatState({
        status: "idle",
        error: "Segmentation Review AI is not available right now. Showing a local placeholder response instead.",
      });
    }
  }

  const promptSuggestions = [
    "Why did this choose this vertical?",
    "This is wrong.",
    "Remove a keyword from the taxonomy.",
    "What rule would you change?",
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement="right"
      size="xl"
      closeOnOverlayClick={false}
      scrollBehavior="inside"
      preserveScrollBarGap={false}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor={BORDER_COLOR}>
          <HStack spacing={3} align="center">
            <Flex
              boxSize={10}
              borderRadius="16px"
              bg="#EEF4FF"
              color={BRAND_BLUE}
              align="center"
              justify="center"
            >
              <Icon as={MdAutoAwesome} boxSize={5} />
            </Flex>
            <Box>
              <Text fontSize="md" fontWeight="bold" color="gray.900">
                {organizationName || "Organization"}
              </Text>
              <Text fontSize="xs" color="gray.500">
                Segmentation Review AI
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        <DrawerBody py={5} overflowY="auto" flex="1" minH={0}>
          <Stack spacing={5} h="100%" minH={0}>
            {chatState.error ? (
              <Alert status="warning" borderRadius="16px">
                <AlertIcon />
                {chatState.error}
              </Alert>
            ) : null}

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="18px" bg="gray.50" p={4}>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" fontWeight="bold">
                  Current Sector
                </Text>
                <Text mt={2} fontWeight="semibold" color="gray.900">
                  {segmentation?.sector?.value || "Not set"}
                </Text>
              </Box>
              <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="18px" bg="gray.50" p={4}>
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" fontWeight="bold">
                  Current Email Industry
                </Text>
                <Text mt={2} fontWeight="semibold" color="gray.900">
                  {segmentation?.emailIndustry?.value || "Not set"}
                </Text>
              </Box>
            </SimpleGrid>

            <Box>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" fontWeight="bold" mb={3}>
                Suggested Prompts
              </Text>
              <Wrap spacing={2}>
                {promptSuggestions.map((prompt) => (
                  <WrapItem key={prompt}>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor={BORDER_COLOR}
                      onClick={() => pushUserMessage(prompt)}
                      isDisabled={chatState.status === "sending"}
                    >
                      {prompt}
                    </Button>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>
            <Box position="relative" flex="1" minH={{ base: "220px", md: "320px" }}>
              <Tooltip
                label={
                  copyState === "copied"
                    ? "Copied"
                    : copyState === "failed"
                      ? "Copy failed"
                      : "Copy transcript for debugging"
                }
              >
                <IconButton
                  aria-label="Copy transcript"
                  icon={<Icon as={MdContentCopy} boxSize={4} />}
                  size="sm"
                  variant="ghost"
                  colorScheme={copyState === "copied" ? "green" : "gray"}
                  position="absolute"
                  top={3}
                  right={3}
                  zIndex={1}
                  onClick={handleCopyTranscript}
                />
              </Tooltip>
              <Stack
                spacing={3}
                h="100%"
                minH={0}
                overflowY="auto"
                borderWidth="1px"
                borderColor={BORDER_COLOR}
                borderRadius="20px"
                bg="white"
                p={4}
                pr={14}
              >
                {messages.map((message) => (
                  <Flex
                    key={message.id}
                    justify={message.role === "user" ? "flex-end" : "flex-start"}
                  >
                    <Box
                      maxW="85%"
                      px={4}
                      py={3}
                      borderRadius="18px"
                      bg={message.role === "user" ? BRAND_BLUE : "gray.100"}
                      color={message.role === "user" ? "white" : "gray.800"}
                    >
                      {renderChatMessageContent(message.content)}
                    </Box>
                  </Flex>
                ))}
                {chatState.status === "sending" ? (
                  <Flex justify="flex-start">
                    <Box
                      maxW="85%"
                      px={4}
                      py={3}
                      borderRadius="18px"
                      bg="gray.100"
                      color="gray.800"
                    >
                      <HStack spacing={3}>
                        <Spinner size="sm" />
                        <Text fontSize="sm">Thinking…</Text>
                      </HStack>
                    </Box>
                  </Flex>
                ) : null}
              </Stack>
            </Box>
          </Stack>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px" borderColor={BORDER_COLOR} flexShrink={0}>
          <Stack spacing={3} w="100%">
            <Textarea
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  (event.metaKey || event.ctrlKey)
                ) {
                  event.preventDefault();
                  pushUserMessage(draftMessage);
                }
              }}
              placeholder="Discuss the segmentation, ask why something was chosen, or propose a keyword/rule change..."
              minH={{ base: "88px", md: "120px" }}
              resize="vertical"
            />
            <HStack justify="space-between">
              <Text fontSize="xs" color="gray.500">
                `Cmd/Ctrl + Enter` submits. Phase 1 scope: segmentation only
              </Text>
              <Button
                colorScheme="blue"
                onClick={() => pushUserMessage(draftMessage)}
                isDisabled={!readTrimmedString(draftMessage) || chatState.status === "sending"}
                isLoading={chatState.status === "sending"}
              >
                Send
              </Button>
            </HStack>
          </Stack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function OrganizationSegmentationTab({ organizationDetail }) {
  const revalidator = useRevalidator();
  const toast = useToast();
  const record =
    organizationDetail?.record && typeof organizationDetail.record === "object"
      ? organizationDetail.record
      : null;
  const organizationUUID = readTrimmedString(
    organizationDetail?.uuid || record?.uuid
  );
  const salesforceEntity =
    organizationDetail?.salesforceEntity &&
    typeof organizationDetail.salesforceEntity === "object"
      ? organizationDetail.salesforceEntity
      : null;
  const organizationName = readTrimmedString(record?.name) || "Organization";
  const initialSegmentation = normalizeSegmentationV312(record);
  const legacySegmentation = buildOrganizationSegmentationViewModel(record);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [segmentation, setSegmentation] = useState(initialSegmentation);
  const [rerunState, setRerunState] = useState({
    status: "idle",
    message: "",
    error: "",
    details: null,
  });
  const [salesforceSaveState, setSalesforceSaveState] = useState({
    status: "idle",
    message: "",
    error: "",
  });
  const [reviewNotice, setReviewNotice] = useState({
    status: "idle",
    message: "",
  });
  const [externalState, setExternalState] = useState({
    status: "idle",
    externalOrganizations: [],
    error: "",
  });
  const isRerunning = rerunState.status === "running";
  const { visible: visibleVerticals, hidden: hiddenVerticals } =
    partitionVerticalsForPage(segmentation?.verticals || []);

  useEffect(() => {
    setSegmentation(initialSegmentation);
  }, [organizationUUID, record?.metadata?.segmentation, record?.metadata?.segmentationV312]);

  useEffect(() => {
    setRerunState({
      status: "idle",
      message: "",
      error: "",
      details: null,
    });
    setSalesforceSaveState({
      status: "idle",
      message: "",
      error: "",
    });
    setReviewNotice({
      status: "idle",
      message: "",
    });
  }, [organizationUUID]);

  function handleReviewOutcome(review) {
    const executedAction =
      review?.executedAction && typeof review.executedAction === "object"
        ? review.executedAction
        : null;
    if (!executedAction?.attempted) {
      return;
    }

    if (
      executedAction.actionType === "rerun_segmentation" &&
      executedAction.succeeded === true
    ) {
      const nextPayload =
        executedAction?.actionResult?.resegmentation?.proposedV312 ||
        null;
      const nextSegmentation = normalizeSegmentationV312Payload(nextPayload);
      if (nextSegmentation) {
        setSegmentation(nextSegmentation);
      }
      setRerunState({
        status: "completed",
        message:
          readTrimmedString(executedAction.message) ||
          "Segmentation was rerun successfully.",
        error: "",
        details: null,
      });
      setReviewNotice({
        status: "idle",
        message: "",
      });
      revalidator.revalidate();
      return;
    }

    if (
      executedAction.actionType === "save_playbook_document" &&
      executedAction.succeeded === true
    ) {
      const documentSlug =
        readTrimmedString(executedAction?.savedPlaybookChange?.documentSlug) || "playbook";
      const targetLabel =
        readTrimmedString(executedAction?.savedPlaybookChange?.targetDefinitionLabel) ||
        readTrimmedString(executedAction?.savedPlaybookChange?.targetRuleName) ||
        "";
      const scopeText = targetLabel
        ? `${documentSlug.replace(/-/g, " ")} change saved for ${targetLabel}.`
        : `${documentSlug.replace(/-/g, " ")} playbook change saved.`;
      setReviewNotice({
        status: "success",
        message: `${scopeText} The organization segmentation was not rerun yet.`,
      });
      return;
    }

    if (executedAction.succeeded === false) {
      setReviewNotice({
        status: "error",
        message:
          readTrimmedString(executedAction.message) ||
          "The requested review action did not complete.",
      });
    }
  }

  useEffect(() => {
    if (!organizationUUID) {
      return undefined;
    }

    let isCancelled = false;
    setExternalState({
      status: "loading",
      externalOrganizations: [],
      error: "",
    });

    fetch(`/api/rest/organization/${encodeURIComponent(organizationUUID)}/external-organizations`, {
      headers: {
        accept: "application/json",
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "Unable to load external organizations."
          );
        }
        return Array.isArray(payload?.externalOrganizations)
          ? payload.externalOrganizations
          : [];
      })
      .then((externalOrganizations) => {
        if (isCancelled) {
          return;
        }
        setExternalState({
          status: "loaded",
          externalOrganizations,
          error: "",
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }
        setExternalState({
          status: "error",
          externalOrganizations: [],
          error: error instanceof Error ? error.message : "Unable to load external organizations.",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [organizationUUID]);

  async function handleRerunSegmentation() {
    if (!organizationUUID) {
      return;
    }

    setRerunState({
      status: "running",
      message: "",
      error: "",
      details: null,
    });
    setSalesforceSaveState({
      status: "idle",
      message: "",
      error: "",
    });

    try {
      const payload = await postResegmentationAction("segmentOrganization", {
        uuid: organizationUUID,
        strategy: "v312",
        dryRun: false,
        includeExplanation: true,
      });
      const nextPayload = payload?.resegmentation?.proposedV312 || null;
      const runtimeMode = readTrimmedString(nextPayload?.runtime?.mode);
      const savedPayload = normalizeSegmentationV312Payload(nextPayload);
      if (savedPayload) {
        setSegmentation(savedPayload);
      }

      setRerunState({
        status: "success",
        message:
          payload?.statusExplained ||
          (savedPayload
            ? `Segmentation reran and saved${runtimeMode ? ` using ${runtimeMode}` : ""}.`
            : "Segmentation reran and saved."),
        error: "",
        details: null,
      });
      revalidator.revalidate();
    } catch (error) {
      const failureDetails = normalizeSegmentationFailureDetails(error?.details);
      setRerunState({
        status: "error",
        message: "",
        error: failureDetails?.summary ||
          (error instanceof Error
            ? error.message
            : "Segmentation failed. Please have an admin review the logs and error details."),
        details: failureDetails,
      });
    }
  }

  async function handleSendToSalesforce() {
    if (!organizationUUID || !salesforceEntity?.salesforceId) {
      return;
    }

    setSalesforceSaveState({
      status: "running",
      message: "",
      error: "",
    });

    try {
      const payload = await postResegmentationAction(
        "saveOrganizationSegmentationToSalesforce",
        {
          uuid: organizationUUID,
        }
      );
      const message =
        payload?.statusExplained || "Segmentation was saved to Salesforce successfully.";
      setSalesforceSaveState({
        status: "success",
        message,
        error: "",
      });
      toast({
        title: "Saved to Salesforce",
        description: message,
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save segmentation to Salesforce.";
      setSalesforceSaveState({
        status: "error",
        message: "",
        error: message,
      });
      toast({
        title: "Salesforce Save Failed",
        description: message,
        status: "error",
        duration: 7000,
        isClosable: true,
        position: "top-right",
      });
    }
  }

  return (
    <>
      <Stack spacing={6}>
        <Flex
          align={{ base: "stretch", lg: "center" }}
          justify="space-between"
          direction={{ base: "column", lg: "row" }}
          gap={4}
        >
          <HStack spacing={3} alignSelf={{ base: "stretch", lg: "flex-start" }}>
            {segmentation?.lock?.locked ? (
              <Badge colorScheme="red" borderRadius="full" px={3} py={1.5} textTransform="none">
                Segmentation Locked
              </Badge>
            ) : (
              <Badge colorScheme="gray" borderRadius="full" px={3} py={1.5} textTransform="none">
                No Lock
              </Badge>
            )}
            <Button
              variant="outline"
              leftIcon={<MdAutorenew />}
              onClick={handleRerunSegmentation}
              isLoading={rerunState.status === "running"}
              loadingText="Rerunning..."
              isDisabled={!organizationUUID}
            >
              Rerun Segmentation
            </Button>
            {salesforceEntity?.salesforceId ? (
              <Button
                variant="outline"
                colorScheme="blue"
                onClick={handleSendToSalesforce}
                isLoading={salesforceSaveState.status === "running"}
                loadingText="Saving..."
                isDisabled={isRerunning}
              >
                Send to Salesforce
              </Button>
            ) : null}
            <Button colorScheme="blue" leftIcon={<MdAutoAwesome />} onClick={onOpen}>
              Review With AI
            </Button>
          </HStack>
        </Flex>

        {rerunState.error ? (
          <Stack spacing={4}>
            <Alert status="error" borderRadius="20px" alignItems="flex-start">
              <AlertIcon mt={1} />
              <Stack spacing={1}>
                <Text fontWeight="semibold">
                  Segmentation failed. Please have an admin review logs and error details.
                </Text>
                <Text>{rerunState.error}</Text>
              </Stack>
            </Alert>

            {rerunState.details ? (
              <Box
                borderWidth="1px"
                borderColor={BORDER_COLOR}
                borderRadius="24px"
                bg="white"
                px={5}
                py={5}
              >
                <Stack spacing={4}>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" letterSpacing="0.14em" color="gray.500">
                      ERROR DETAILS
                    </Text>
                    <Text fontSize="sm" color="gray.700" mt={1}>
                      {rerunState.details.summary}
                    </Text>
                    {rerunState.details.openAIMessage ? (
                      <Text fontSize="sm" color="gray.600" mt={2}>
                        OpenAI message: {rerunState.details.openAIMessage}
                      </Text>
                    ) : null}
                  </Box>

                  <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={3}>
                    <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="16px" px={4} py={3}>
                      <Text fontSize="xs" color="gray.500" letterSpacing="0.12em">CATEGORY</Text>
                      <Text fontSize="sm" mt={1}>{rerunState.details.category || "Not set"}</Text>
                    </Box>
                    <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="16px" px={4} py={3}>
                      <Text fontSize="xs" color="gray.500" letterSpacing="0.12em">FAILURE TYPE</Text>
                      <Text fontSize="sm" mt={1}>{rerunState.details.failureType || "Not set"}</Text>
                    </Box>
                    <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="16px" px={4} py={3}>
                      <Text fontSize="xs" color="gray.500" letterSpacing="0.12em">EXTERNAL SOURCES</Text>
                      <Text fontSize="sm" mt={1}>{rerunState.details.externalSourceCount}</Text>
                    </Box>
                    <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="16px" px={4} py={3}>
                      <Text fontSize="xs" color="gray.500" letterSpacing="0.12em">EVIDENCE FRAGMENTS</Text>
                      <Text fontSize="sm" mt={1}>
                        {rerunState.details.descriptiveEvidenceCount} descriptive,{" "}
                        {rerunState.details.structuredEvidenceCount} structured
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold">Unsupported items</Text>
                    {rerunState.details.unsupportedItems.length ? (
                      <UnorderedList mt={2} spacing={2}>
                        {rerunState.details.unsupportedItems.map((item, index) => {
                          const evidence = renderFailureItemEvidence(item);
                          const reasons = renderFailureItemReasons(item);
                          return (
                            <ListItem key={`unsupported-${index}`}>
                              <Text fontSize="sm">
                                {readTrimmedString(item?.scope) || "item"}:{" "}
                                {readTrimmedString(item?.value) || "Not set"}
                                {reasons ? ` (${reasons})` : ""}
                              </Text>
                              {evidence.length ? (
                                <Text fontSize="xs" color="gray.600">
                                  Evidence: {evidence.join(" | ")}
                                </Text>
                              ) : null}
                            </ListItem>
                          );
                        })}
                      </UnorderedList>
                    ) : (
                      <Text fontSize="sm" color="gray.600" mt={2}>No unsupported items were logged.</Text>
                    )}
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold">Weak evidence items</Text>
                    {rerunState.details.weakEvidenceItems.length ? (
                      <UnorderedList mt={2} spacing={2}>
                        {rerunState.details.weakEvidenceItems.map((item, index) => {
                          const evidence = renderFailureItemEvidence(item);
                          const reasons = renderFailureItemReasons(item);
                          return (
                            <ListItem key={`weak-${index}`}>
                              <Text fontSize="sm">
                                {readTrimmedString(item?.scope) || "item"}:{" "}
                                {readTrimmedString(item?.value) || "Not set"}
                                {reasons ? ` (${reasons})` : ""}
                              </Text>
                              {evidence.length ? (
                                <Text fontSize="xs" color="gray.600">
                                  Evidence: {evidence.join(" | ")}
                                </Text>
                              ) : null}
                            </ListItem>
                          );
                        })}
                      </UnorderedList>
                    ) : (
                      <Text fontSize="sm" color="gray.600" mt={2}>No weak-evidence items were logged.</Text>
                    )}
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold">Pass history</Text>
                    {rerunState.details.passSummaries.length ? (
                      <UnorderedList mt={2} spacing={1}>
                        {rerunState.details.passSummaries.map((pass, index) => (
                          <ListItem key={`pass-${index}`}>
                            <Text fontSize="sm">
                              {readTrimmedString(pass?.passType) || "pass"}
                              {Number.isFinite(Number(pass?.attempt))
                                ? ` (attempt ${Number(pass.attempt)})`
                                : ""}
                              {readTrimmedString(pass?.responseId)
                                ? ` - ${readTrimmedString(pass.responseId)}`
                                : ""}
                            </Text>
                          </ListItem>
                        ))}
                      </UnorderedList>
                    ) : (
                      <Text fontSize="sm" color="gray.600" mt={2}>No pass history was logged.</Text>
                    )}
                  </Box>
                </Stack>
              </Box>
            ) : null}
          </Stack>
        ) : null}

        {rerunState.message ? (
          <Alert status="success" borderRadius="20px">
            <AlertIcon />
            {rerunState.message}
          </Alert>
        ) : null}

        {reviewNotice.message ? (
          <Alert
            status={reviewNotice.status === "error" ? "error" : "info"}
            borderRadius="20px"
          >
            <AlertIcon />
            {reviewNotice.message}
          </Alert>
        ) : null}

        {!segmentation && !isRerunning ? (
          <Alert status="warning" borderRadius="20px">
            <AlertIcon />
            No saved organization-level v3.12 segmentation result is available. Segmentation may have run during research but not produced a confident saved payload for this organization.
          </Alert>
        ) : null}

        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
          <AssessmentCard title="Sector" item={segmentation?.sector} isLoading={isRerunning} />
          <AssessmentCard title="Email Industry" item={segmentation?.emailIndustry} isLoading={isRerunning} />
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
          <AssessmentListCard
            title="Verticals"
            items={visibleVerticals}
            emptyLabel="No visible verticals"
            isLoading={isRerunning}
          />
          <AssessmentListCard
            title="Visible Keywords"
            items={segmentation?.visibleKeywords || []}
            emptyLabel="No visible keywords"
            isLoading={isRerunning}
          />
        </SimpleGrid>

        <AssessmentCard
          title="Overall Assessment"
          item={segmentation?.overallAssessment}
          isLoading={isRerunning}
        />

        {isRerunning ? (
          <LoadingPanel title="External Organizations Sent To Segmentation" lines={5} />
        ) : (
        <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="24px" bg="white" p={6}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">External Organizations Sent To Segmentation</Heading>
            {externalState.status === "loading" ? (
              <HStack spacing={2} color="gray.500">
                <Spinner size="sm" />
                <Text fontSize="sm">Loading sources…</Text>
              </HStack>
            ) : null}
          </Flex>

          {externalState.status === "error" ? (
            <Alert status="warning" borderRadius="16px" mb={4}>
              <AlertIcon />
              {externalState.error}
            </Alert>
          ) : null}

          {externalState.externalOrganizations.length ? (
            <Stack spacing={4}>
              {externalState.externalOrganizations.map((externalOrganization, index) => (
                <Box
                  key={externalOrganization.uuid || `${externalOrganization.source || "source"}-${index}`}
                  borderWidth="1px"
                  borderColor="gray.100"
                  borderRadius="18px"
                  bg="gray.50"
                  p={4}
                >
                  <Flex
                    justify="space-between"
                    align={{ base: "flex-start", md: "center" }}
                    direction={{ base: "column", md: "row" }}
                    gap={3}
                  >
                    <Box>
                      <Heading size="sm" color="gray.900">
                        {readTrimmedString(externalOrganization.name) || "Unnamed source"}
                      </Heading>
                      <HStack spacing={2} mt={2} wrap="wrap">
                        <Badge colorScheme="blue" textTransform="none">
                          {readTrimmedString(externalOrganization.source) || "unknown"}
                        </Badge>
                        {readTrimmedString(externalOrganization.domain) ? (
                          <Badge colorScheme="gray" textTransform="none">
                            {readTrimmedString(externalOrganization.domain)}
                          </Badge>
                        ) : null}
                      </HStack>
                    </Box>
                    {readTrimmedString(externalOrganization.website) ? (
                      <Link href={readTrimmedString(externalOrganization.website)} isExternal color="blue.500">
                        {readTrimmedString(externalOrganization.website)}
                      </Link>
                    ) : null}
                  </Flex>
                  {readTrimmedString(externalOrganization.description) ? (
                    <Text mt={3} color="gray.700" lineHeight="1.8">
                      {readTrimmedString(externalOrganization.description)}
                    </Text>
                  ) : (
                    <Text mt={3} color="gray.500">
                      No description was available for this source.
                    </Text>
                  )}
                </Box>
              ))}
            </Stack>
          ) : externalState.status === "loading" ? null : (
            <Text color="gray.500">No external organizations were returned for this organization.</Text>
          )}
        </Box>
        )}

        <Grid templateColumns={{ base: "1fr", xl: "1.2fr 0.8fr" }} gap={5}>
          <GridItem>
            {isRerunning ? (
              <LoadingPanel title="Payload And Assessment" lines={8} />
            ) : (
            <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="24px" bg="white" p={6}>
              <Heading size="md" mb={4}>
                Payload And Assessment
              </Heading>
              <Stack spacing={5}>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" mb={2}>
                    Saved Payload
                  </Text>
                  <Box
                    as="pre"
                    p={4}
                    borderRadius="16px"
                    bg="gray.900"
                    color="gray.100"
                    fontSize="12px"
                    overflowX="auto"
                    whiteSpace="pre-wrap"
                  >
                    {formatJson(segmentation?.raw)}
                  </Box>
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" mb={2}>
                    Overall Assessment
                  </Text>
                  <Box
                    as="pre"
                    p={4}
                    borderRadius="16px"
                    bg="gray.900"
                    color="gray.100"
                    fontSize="12px"
                    overflowX="auto"
                    whiteSpace="pre-wrap"
                  >
                    {formatJson(segmentation?.overallAssessment)}
                  </Box>
                </Box>
              </Stack>
            </Box>
            )}
          </GridItem>
          <GridItem>
            <Stack spacing={5}>
              {isRerunning ? (
                <LoadingPanel title="Inspection" lines={6} />
              ) : (
              <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="24px" bg="white" p={6}>
                <Heading size="md" mb={4}>
                  Inspection
                </Heading>
                <Stack spacing={4}>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                      Segmented At
                    </Text>
                    <Text mt={2} color="gray.800">
                      {segmentation?.segmentedAt || "Not set"}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                      Hidden Secondary Verticals
                    </Text>
                    {hiddenVerticals.length ? (
                      <Wrap spacing={2} mt={2}>
                        {hiddenVerticals.map((vertical) => (
                          <WrapItem key={`hidden-${vertical.value}`}>
                            <Badge colorScheme="orange" textTransform="none" px={3} py={1.5} borderRadius="full">
                              {vertical.value}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    ) : (
                      <Text mt={2} color="gray.500">
                        No verticals are hidden by the 25% rule.
                      </Text>
                    )}
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                      All Keywords
                    </Text>
                    {segmentation?.allKeywords?.length ? (
                      <Wrap spacing={2} mt={2}>
                        {segmentation.allKeywords.map((keyword) => (
                          <WrapItem key={`all-${keyword.value}`}>
                            <Badge colorScheme="gray" textTransform="none" px={3} py={1.5} borderRadius="full">
                              {keyword.value}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    ) : (
                      <Text mt={2} color="gray.500">
                        No keywords were saved.
                      </Text>
                    )}
                  </Box>
                </Stack>
              </Box>
              )}

              {isRerunning ? (
                <LoadingPanel title="Legacy Summary" lines={3} />
              ) : (
                <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="24px" bg="white" p={6}>
                  <Heading size="md" mb={4}>
                    Legacy Summary
                  </Heading>
                  <Stack spacing={3}>
                    <Text color="gray.700">
                      Industries: {legacySegmentation?.industries?.length ? legacySegmentation.industries.join(", ") : "Not set"}
                    </Text>
                    <Text color="gray.700">
                      Focuses: {legacySegmentation?.focuses?.length ? legacySegmentation.focuses.join(", ") : "Not set"}
                    </Text>
                  </Stack>
                </Box>
              )}
            </Stack>
          </GridItem>
        </Grid>

        {isRerunning ? (
          <LoadingPanel title="Reasoning And Debug" lines={8} />
        ) : (
          <Box borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="24px" bg="white" p={6}>
            <Heading size="md" mb={4}>
              Reasoning And Debug
            </Heading>
            {legacySegmentation?.explanations?.length ? (
              <TableContainer>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Field</Th>
                      <Th>Dimension</Th>
                      <Th>Value</Th>
                      <Th>Score</Th>
                      <Th>Crosswalk</Th>
                      <Th>Rule</Th>
                      <Th>How Derived</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {legacySegmentation.explanations.map((row, index) => (
                      <Tr key={`${row.sourceField || row.source || "source"}-${index}`}>
                        <Td>{readTrimmedString(row?.sourceField) || readTrimmedString(row?.source) || "Not set"}</Td>
                        <Td>{readTrimmedString(row?.dimension) || "Not set"}</Td>
                        <Td whiteSpace="pre-line">{readTrimmedString(row?.value) || "Not set"}</Td>
                        <Td>{row?.score == null ? "Not set" : String(row.score)}</Td>
                        <Td>{renderExplanationCrosswalk(row)}</Td>
                        <Td>{readTrimmedString(row?.rule) || "Not set"}</Td>
                        <Td>
                          <Box
                            fontSize="sm"
                            color="gray.700"
                            sx={{
                              mark: {
                                bg: "yellow.100",
                                px: 1,
                                borderRadius: "sm",
                              },
                            }}
                            dangerouslySetInnerHTML={{
                              __html: row.reasonHtml || "Not provided",
                            }}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <Text color="gray.500">
                Detailed reasoning rows are not available on this organization yet.
              </Text>
            )}
          </Box>
        )}
      </Stack>

      <OrganizationSegmentationReviewFlyout
        isOpen={isOpen}
        onClose={onClose}
        organizationUUID={organizationUUID}
        organizationName={organizationName}
        segmentation={segmentation}
        onReviewOutcome={handleReviewOutcome}
      />
    </>
  );
}
