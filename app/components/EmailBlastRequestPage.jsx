import React, { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Icon,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link } from "@remix-run/react";
import { FiChevronLeft } from "react-icons/fi";
import { StatusPill, EMAIL_BLAST_STATUS_TONES } from "./ui/atoms/StatusPill";
import { RecipientPicker } from "./ui/organisms/RecipientPicker";
import { RichTextField } from "./ui/molecules/RichTextField";
import { SimpleEmailComposer } from "./ui/molecules/SimpleEmailComposer";
import { WizardShell } from "./ui/organisms/WizardShell";
import { MOCK_ALL_SERVICES } from "../models/services-mock-data.mjs";
import {
  CANNED_AUDIENCE_LISTS,
  COMPANY_SIZE_BANDS,
  DISCIPLINES,
  EMAIL_BLAST_STATUSES,
  MOCK_EMAIL_BLAST_REQUESTS,
  MOCK_EMAIL_STARTER_TEMPLATES,
  POSITION_LEVELS,
  US_REGIONS,
  estimateAudienceSize,
  isServiceClientManager,
  statusIndex,
} from "../models/email-blast-mock-data.mjs";

const EMPTY_FILTERS = { positionLevels: [], disciplines: [], regions: [], companySizeBands: [] };

function serviceDetailPath(service) {
  if (!service) return "/jobs";
  return service.type === "em" ? `/jobs/em/${service.id}` : `/jobs/es/${service.id}`;
}

function buildInitialState(existingRequest) {
  if (!existingRequest) {
    return {
      selectedListId: "",
      customFilters: EMPTY_FILTERS,
      notes: "",
      selectedStarterTemplateId: "",
      subject: "",
      bodyHtml: "",
      approverFeedback: "",
    };
  }

  const isCanned = existingRequest.audienceSource.type === "canned";
  return {
    selectedListId: isCanned ? existingRequest.audienceSource.cannedListId : "custom",
    customFilters: isCanned ? EMPTY_FILTERS : existingRequest.audienceSource.filters,
    notes: existingRequest.notes || "",
    selectedStarterTemplateId: existingRequest.email.starterTemplateId || "",
    subject: existingRequest.email.subject || "",
    bodyHtml: existingRequest.email.bodyHtml || "",
    approverFeedback: existingRequest.approverFeedback || "",
  };
}

/**
 * Requester-facing Email Blast Request wizard. Launched from a service (the
 * service is supplied, not picked here) — either starting a new blast or
 * editing one already in flight. Three steps: recipients, compose, and
 * approve — open to everyone, but the Approve Email step's content differs
 * by role: the service's client manager gets the full approve/feedback UI,
 * anyone else can only request their approval with a note. Exclusions are
 * no longer set here — that's Research's job now, fully owned by the
 * Schedule Email Blast page. No backend yet — everything is local mock state.
 * @param {{serviceId: string, requestId?: string}} props
 */
export function EmailBlastRequestPage({ serviceId, requestId = null }) {
  const service = useMemo(() => MOCK_ALL_SERVICES.find((entry) => entry.id === serviceId) || null, [serviceId]);
  const existingRequest = useMemo(
    () =>
      requestId
        ? MOCK_EMAIL_BLAST_REQUESTS.find((entry) => entry.id === requestId && entry.serviceId === serviceId) || null
        : null,
    [serviceId, requestId]
  );
  const initial = useMemo(() => buildInitialState(existingRequest), [existingRequest]);

  const viewerOptions = useMemo(
    () =>
      Array.from(
        new Set([service?.recruiter, service?.originator, service?.clientManager, service?.executiveSponsor].filter(Boolean))
      ),
    [service]
  );

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [viewingAsPersonName, setViewingAsPersonName] = useState(
    service?.recruiter && service.recruiter !== service.clientManager ? service.recruiter : viewerOptions[0] || ""
  );
  const [selectedListId, setSelectedListId] = useState(initial.selectedListId);
  const [customFilters, setCustomFilters] = useState(initial.customFilters);
  const [notes, setNotes] = useState(initial.notes);
  const [selectedStarterTemplateId, setSelectedStarterTemplateId] = useState(initial.selectedStarterTemplateId);
  const [subject, setSubject] = useState(initial.subject);
  const [bodyHtml, setBodyHtml] = useState(initial.bodyHtml);
  const [approverFeedback, setApproverFeedback] = useState(initial.approverFeedback);
  const [feedbackSentAt, setFeedbackSentAt] = useState(null);
  const [approvedChecked, setApprovedChecked] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const isClientManager = isServiceClientManager(service, viewingAsPersonName);
  const isCustomAudience = selectedListId === "custom";
  const selectedCannedList = CANNED_AUDIENCE_LISTS.find((list) => list.id === selectedListId) || null;
  const estimatedAudienceSize = isCustomAudience
    ? estimateAudienceSize(customFilters)
    : selectedCannedList?.approxSize || 0;

  function handleSelectStarterTemplate(templateId) {
    setSelectedStarterTemplateId(templateId);
    const template = MOCK_EMAIL_STARTER_TEMPLATES.find((entry) => entry.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.bodyHtml || "");
    }
  }

  function handleSendFeedback() {
    setFeedbackSentAt(new Date().toISOString());
  }

  function handleSubmitForScheduling() {
    setSubmittedRequest({
      id: existingRequest?.id || `blast-req-${Math.random().toString(36).slice(2, 8)}`,
      service,
      isEdit: Boolean(existingRequest),
      estimatedAudienceSize,
      subject,
      mode: "approved",
      approvedBy: viewingAsPersonName,
    });
  }

  function handleRequestApproval() {
    setSubmittedRequest({
      id: existingRequest?.id || `blast-req-${Math.random().toString(36).slice(2, 8)}`,
      service,
      isEdit: Boolean(existingRequest),
      estimatedAudienceSize,
      subject,
      mode: "requested",
      requestedFrom: service.clientManager,
    });
  }

  if (!service) {
    return (
      <Alert status="error" borderRadius="md" maxW="640px">
        <AlertIcon />
        Service not found.
      </Alert>
    );
  }

  if (submittedRequest) {
    const isApproved = submittedRequest.mode === "approved";
    return (
      <VStack align="stretch" spacing={5} maxW="640px">
        <Alert status="success" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Box>
            <AlertTitle>
              {isApproved
                ? `${submittedRequest.isEdit ? "Changes submitted" : "Submitted"} — Approved, ready for scheduling`
                : "Submitted — Awaiting Approval"}
            </AlertTitle>
            <AlertDescription>
              <Text fontSize="sm">
                {isApproved ? (
                  <>
                    Request {submittedRequest.id} was approved by {submittedRequest.approvedBy}. Research can now
                    pick it up in Schedule Email Blast.
                  </>
                ) : (
                  <>
                    Request {submittedRequest.id} was sent to {submittedRequest.requestedFrom || "the client manager"}{" "}
                    for approval. Once they approve it, Research can pick it up in Schedule Email Blast.
                  </>
                )}
              </Text>
            </AlertDescription>
          </Box>
        </Alert>

        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5} bg="white">
          <VStack align="stretch" spacing={2} fontSize="sm">
            <HStack justify="space-between">
              <Text color="gray.500">Service</Text>
              <Text fontWeight="semibold">{submittedRequest.service?.title || "—"}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">Subject</Text>
              <Text fontWeight="semibold">{submittedRequest.subject || "(none)"}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">Audience</Text>
              <Text fontWeight="semibold">~{submittedRequest.estimatedAudienceSize.toLocaleString()} people</Text>
            </HStack>
          </VStack>
        </Box>

        <HStack>
          {isApproved ? (
            <Button as={Link} to="/tools/email-blast-schedule" colorScheme="blue">
              View in Schedule Email Blast
            </Button>
          ) : null}
          <Button as={Link} to={serviceDetailPath(service)} variant="ghost">
            Back to service
          </Button>
        </HStack>
      </VStack>
    );
  }

  const steps = [
    { key: "recipients", label: "Select Recipients" },
    { key: "compose", label: "Compose Email" },
    { key: "approve", label: "Approve Email" },
  ];

  return (
    <Box>
      <Box
        as={Link}
        to={serviceDetailPath(service)}
        display="inline-flex"
        alignItems="center"
        gap={1}
        fontSize="sm"
        color="gray.500"
        _hover={{ color: "blue.600", textDecoration: "none" }}
        mb={3}
      >
        <Icon as={FiChevronLeft} boxSize={4} />
        {service.title}
      </Box>

      <Flex justify="space-between" align="flex-start" mb={2} flexWrap="wrap" gap={3}>
        <Box>
          <HStack spacing={3} mb={1}>
            <Heading size="lg">{existingRequest ? "Edit Email Blast" : "New Email Blast"}</Heading>
            {existingRequest ? (
              <StatusPill
                label={EMAIL_BLAST_STATUSES[statusIndex(existingRequest.status)].label}
                tone={EMAIL_BLAST_STATUS_TONES[existingRequest.status]}
              />
            ) : null}
          </HStack>
          <Text color="gray.600">
            {service.title} — {service.subtitle}
          </Text>
        </Box>

        <FormControl maxW="240px">
          <FormLabel fontSize="xs" color="gray.500" mb={1}>
            Viewing as (demo only)
          </FormLabel>
          <Select size="sm" value={viewingAsPersonName} onChange={(event) => setViewingAsPersonName(event.target.value)}>
            {viewerOptions.map((name) => (
              <option key={name} value={name}>
                {name}
                {name === service.clientManager ? " (Client Manager)" : ""}
              </option>
            ))}
          </Select>
        </FormControl>
      </Flex>

      <WizardShell
        steps={steps}
        activeIndex={activeTabIndex}
        onActiveIndexChange={setActiveTabIndex}
        isNextDisabled={activeTabIndex === 0 && !selectedListId}
        nextDisabledHint="Select a recipient list before continuing"
        contentHeight="80vh"
      >
        <RecipientPicker
          cannedLists={CANNED_AUDIENCE_LISTS}
          selectedListId={selectedListId}
          onSelectListId={setSelectedListId}
          positionLevelOptions={POSITION_LEVELS}
          disciplineOptions={DISCIPLINES}
          regionOptions={US_REGIONS}
          companySizeOptions={COMPANY_SIZE_BANDS}
          customFilters={customFilters}
          onCustomFiltersChange={setCustomFilters}
        />

        <SimpleEmailComposer
          starterTemplates={MOCK_EMAIL_STARTER_TEMPLATES}
          selectedStarterTemplateId={selectedStarterTemplateId}
          onSelectStarterTemplate={handleSelectStarterTemplate}
          subject={subject}
          onSubjectChange={setSubject}
          bodyHtml={bodyHtml}
          onBodyHtmlChange={setBodyHtml}
        />

        <VStack align="stretch" spacing={4} maxW="768px" mx="auto">
          <RichTextField
            label="Notes for the approver"
            value={notes}
            onChange={setNotes}
            placeholder="Anything the approver should know before signing off..."
            height="140px"
          />

          {isClientManager ? (
            <>
              <Divider />
              <RichTextField
                label="Feedback for Recruiter"
                value={approverFeedback}
                onChange={setApproverFeedback}
                placeholder="Anything the recruiter should adjust before this goes out..."
                height="180px"
              />
              <HStack justify="space-between">
                {feedbackSentAt ? (
                  <Text fontSize="xs" color="green.600">
                    Feedback sent to {service.recruiter}.
                  </Text>
                ) : (
                  <Box />
                )}
                <Button size="sm" onClick={handleSendFeedback} isDisabled={!approverFeedback.trim()}>
                  Send
                </Button>
              </HStack>

              <HStack spacing={4}>
                <Divider />
                <Text fontSize="md" fontWeight="semibold" color="gray.500" whiteSpace="nowrap">
                  or
                </Text>
                <Divider />
              </HStack>

              <Checkbox isChecked={approvedChecked} onChange={(event) => setApprovedChecked(event.target.checked)}>
                Approved by {viewingAsPersonName}
              </Checkbox>

              <Button colorScheme="blue" isDisabled={!approvedChecked} onClick={handleSubmitForScheduling} alignSelf="flex-end">
                Submit for Blast for Scheduling
              </Button>
            </>
          ) : (
            <>
              <Divider />
              <Text fontSize="sm" color="gray.600">
                {service.clientManager || "The client manager"} needs to approve this before Research can schedule
                it. Add a note above, then request their approval.
              </Text>
              <Button
                colorScheme="blue"
                isDisabled={!notes.trim()}
                onClick={handleRequestApproval}
                alignSelf="flex-end"
              >
                Request Approval
              </Button>
            </>
          )}
        </VStack>
      </WizardShell>
    </Box>
  );
}
