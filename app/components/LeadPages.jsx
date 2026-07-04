import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Heading,
  HStack,
  IconButton,
  Link as ChakraLink,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Link as RemixLink, useLocation } from "@remix-run/react";
import { useMemo, useState } from "react";
import { FaLinkedin } from "react-icons/fa";
import { FiGlobe, FiPhone, FiSettings } from "react-icons/fi";
import { MilestoneChevrons } from "./MilestoneChevrons";
import { buildEntityDetailPath, buildLeadDetailPath } from "../models/entity-route.mjs";

function SurfaceCard({ children, ...props }) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="#D7DFEC"
      borderRadius="20px"
      shadow="sm"
      p={5}
      {...props}
    >
      {children}
    </Box>
  );
}

function StageBadge({ current, closed }) {
  if (closed) {
    return <Badge colorScheme={current === "Closed Won" ? "green" : "red"}>{current}</Badge>;
  }
  return <Badge colorScheme="blue">{current || "Unknown Stage"}</Badge>;
}

function formatDateLabel(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalizeUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function resolvePhoneLabel(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "object") {
    const candidates = [
      value.phone,
      value.work,
      value.mobile,
      value.main,
      value.number,
      value.home,
      value.other,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
      if (candidate && typeof candidate === "object" && typeof candidate.phone === "string" && candidate.phone.trim()) {
        return candidate.phone.trim();
      }
    }
  }
  return null;
}

function getLeadStageChevronModel(leadStages, currentStage) {
  const baseStages = Array.isArray(leadStages) && leadStages.length
    ? leadStages
    : [
        { name: "Analysis", description: "" },
        { name: "Proposal", description: "" },
        { name: "Negotiation", description: "" },
        { name: "Closed Won", description: "" },
        { name: "Closed Lost", description: "" },
      ];
  const closedLabel =
    currentStage === "Closed Won"
      ? "Closed Won"
      : currentStage === "Closed Lost"
        ? "Closed Lost"
        : "Closed";
  const milestones = [
    { key: "Analysis", label: "Analysis", shortLabel: "Analysis" },
    { key: "Proposal", label: "Proposal", shortLabel: "Proposal" },
    { key: "Negotiation", label: "Negotiation", shortLabel: "Negotiation" },
    { key: "Closed", label: closedLabel, shortLabel: closedLabel },
  ];
  const normalizedCurrentStage =
    typeof currentStage === "string" && currentStage.startsWith("Closed")
      ? "Closed"
      : currentStage;
  const activeIndex = Math.max(
    milestones.findIndex((milestone) => milestone.key === normalizedCurrentStage),
    0
  );

  return {
    milestones,
    activeIndex,
    stageOptions: baseStages,
  };
}

function MetaLink({ icon, label, href = null }) {
  if (!label) {
    return null;
  }
  return (
    <HStack spacing={2} color="gray.600">
      <Box as={icon} boxSize={4} color="gray.400" />
      {href ? (
        <ChakraLink href={href} isExternal color="blue.600">
          {label}
        </ChakraLink>
      ) : (
        <Text>{label}</Text>
      )}
    </HStack>
  );
}

function DetailField({ label, value }) {
  return (
    <Box>
      <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
        {label}
      </Text>
      <Text mt={2} color={value ? "gray.900" : "gray.400"}>
        {value || " "}
      </Text>
    </Box>
  );
}

function buildFilterPath(pathname, filters, options = {}) {
  const params = new URLSearchParams();
  const myLeads =
    typeof options.myLeads === "boolean" ? options.myLeads : Boolean(filters?.myLeads);
  const stages = Array.isArray(options.stages) ? options.stages : filters?.stages || [];

  params.set("myLeads", myLeads ? "true" : "false");
  stages.forEach((stage) => params.append("stage", stage));

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function FilterToggle({ label, isActive, to }) {
  return (
    <Button
      as={RemixLink}
      to={to}
      size="sm"
      variant="outline"
      leftIcon={<Checkbox isChecked={isActive} pointerEvents="none" colorScheme="blue" />}
      borderRadius="999px"
      borderColor={isActive ? "blue.500" : "#D7DFEC"}
      bg={isActive ? "blue.50" : "white"}
      color={isActive ? "blue.700" : "gray.700"}
      _hover={{
        bg: isActive ? "blue.100" : "#F7FAFC",
      }}
    >
      {label}
    </Button>
  );
}

export function EsSearchLeadsPage({ data }) {
  const leads = Array.isArray(data?.leads) ? data.leads : [];
  const leadStages = Array.isArray(data?.leadStages) ? data.leadStages : [];
  const filters = data?.filters || { myLeads: true, stages: [] };
  const location = useLocation();
  const allStageNames = leadStages.map((stage) => stage?.name).filter(Boolean);
  const selectedStages = Array.isArray(filters.stages) ? filters.stages : [];
  const activeStageSet = new Set(selectedStages.length ? selectedStages : allStageNames);

  function buildStageTogglePath(stageName) {
    const nextStages = selectedStages.length ? [...selectedStages] : [...allStageNames];
    const index = nextStages.indexOf(stageName);
    if (index >= 0) {
      nextStages.splice(index, 1);
    } else {
      nextStages.push(stageName);
    }
    return buildFilterPath(location.pathname, filters, { stages: nextStages });
  }

  return (
    <Stack spacing={6}>
      <Box>
        <Heading size="lg" color="#0F4C81">ES Search Leads</Heading>
      </Box>

      <SurfaceCard>
        <Stack spacing={4}>
          <HStack spacing={3} wrap="wrap">
            <FilterToggle
              label="My Leads"
              isActive={Boolean(filters.myLeads)}
              to={buildFilterPath(location.pathname, filters, {
                myLeads: !Boolean(filters.myLeads),
              })}
            />
            {leadStages.map((stage) => (
              <FilterToggle
                key={stage.name}
                label={stage.name}
                isActive={activeStageSet.has(stage.name)}
                to={buildStageTogglePath(stage.name)}
              />
            ))}
          </HStack>
          <Box textAlign="right">
            <Text fontSize="sm" fontWeight="semibold" color="gray.900">
              {data?.meta?.count || leads.length} lead{(data?.meta?.count || leads.length) === 1 ? "" : "s"}
            </Text>
          </Box>
        </Stack>
      </SurfaceCard>

      {data?.error ? (
        <Alert status="error" borderRadius="16px">
          <AlertIcon />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      {!leads.length ? (
        <SurfaceCard>
          <Text fontWeight="semibold" color="gray.900">
            No ES search leads match the current filters.
          </Text>
          <Text mt={2} color="gray.500">
            Try opening more stages or turning off `My Leads`.
          </Text>
        </SurfaceCard>
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
          {leads.map((lead) => (
            <SurfaceCard key={lead.uuid}>
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between" align="start">
                  <Box>
                    <Heading size="sm" color="gray.900">
                      {lead.title || lead.name || "Untitled Lead"}
                    </Heading>
                    <Text mt={1} fontSize="sm" color="gray.500">
                      {lead.leadType || "Lead"}
                    </Text>
                  </Box>
                  <StageBadge current={lead.stage} closed={lead.stage?.startsWith?.("Closed")} />
                </HStack>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                    {lead.organizations?.[0]?.name || "Unlinked organization"}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {lead.status || "active"}
                    {formatDateLabel(lead.modifiedDate) ? ` • Updated ${formatDateLabel(lead.modifiedDate)}` : ""}
                  </Text>
                </Box>

                <Text fontSize="sm" color="gray.600">
                  {lead.description || "No description has been added yet."}
                </Text>

                <Divider />

                <HStack justify="flex-end" wrap="wrap">
                  <HStack spacing={3}>
                    <Button
                      as={RemixLink}
                      to={buildEntityDetailPath("organization", lead.organizations?.[0]?.organizationUUID) || "#"}
                      size="sm"
                      variant="outline"
                      isDisabled={!lead.organizations?.[0]?.organizationUUID}
                    >
                      View Org
                    </Button>
                    <Button
                      as={RemixLink}
                      to={buildLeadDetailPath(lead.uuid) || "#"}
                      size="sm"
                      colorScheme="blue"
                    >
                      View Lead
                    </Button>
                  </HStack>
                </HStack>
              </VStack>
            </SurfaceCard>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

export function LeadDetailPage({ data }) {
  const record = data?.record || null;
  const stages = Array.isArray(data?.leadStages) ? data.leadStages : [];
  const organizations = Array.isArray(record?.organizations) ? record.organizations : [];
  const primaryOrganization = organizations[0] || null;
  const chevronModel = useMemo(
    () => getLeadStageChevronModel(stages, record?.stage),
    [stages, record?.stage]
  );
  const [displayStage, setDisplayStage] = useState(record?.stage || chevronModel.stageOptions[0]?.name || "Analysis");
  const [draftStage, setDraftStage] = useState(record?.stage || chevronModel.stageOptions[0]?.name || "Analysis");
  const [isStageDrawerOpen, setIsStageDrawerOpen] = useState(false);
  const organizationWebsiteUrl = normalizeUrl(primaryOrganization?.website);
  const organizationLinkedInUrl = normalizeUrl(primaryOrganization?.linkedInUrl);
  const organizationPhone = resolvePhoneLabel(primaryOrganization?.phone);

  function openStageDrawer() {
    setDraftStage(displayStage);
    setIsStageDrawerOpen(true);
  }

  function closeStageDrawer() {
    setDraftStage(displayStage);
    setIsStageDrawerOpen(false);
  }

  function saveStageDraft() {
    setDisplayStage(draftStage);
    setIsStageDrawerOpen(false);
  }

  const displayChevronModel = useMemo(
    () => getLeadStageChevronModel(stages, displayStage),
    [stages, displayStage]
  );

  return (
    <Stack spacing={6}>
      {data?.error ? (
        <Alert status="error" borderRadius="16px">
          <AlertIcon />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      <SurfaceCard>
        <HStack justify="space-between" align="start" spacing={4}>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
              Lead
            </Text>
            <Heading mt={1} size="lg" color="gray.900">
              {record?.metadata?.title || record?.name || "Untitled Lead"}
            </Heading>
            <Text mt={2} color="gray.600">
              {record?.leadType || "Lead"}
            </Text>
            <Box mt={5}>
              <MilestoneChevrons
                milestones={displayChevronModel.milestones}
                activeIndex={displayChevronModel.activeIndex}
                size="lg"
              />
            </Box>
          </Box>

          <IconButton
            aria-label="Lead options"
            icon={<FiSettings />}
            variant="outline"
            onClick={openStageDrawer}
          />
        </HStack>

        <Text mt={5} color="gray.700">
          {record?.metadata?.description || "No description has been added yet."}
        </Text>
      </SurfaceCard>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
        <SurfaceCard>
          <Heading size="md" color="#0F4C81">
            Organization
          </Heading>
          <VStack align="stretch" spacing={4} mt={5}>
            <Box>
              <Text fontWeight="semibold" color="gray.900">
                {primaryOrganization?.name || "Organization pending"}
              </Text>
            </Box>
            <MetaLink icon={FiGlobe} label={primaryOrganization?.website || null} href={organizationWebsiteUrl} />
            <MetaLink icon={FaLinkedin} label={organizationLinkedInUrl ? "LinkedIn" : null} href={organizationLinkedInUrl} />
            <MetaLink icon={FiPhone} label={organizationPhone} />
            <Divider />
            <Box>
              <Heading size="sm" color="gray.900">
                Contacts
              </Heading>
              <Text mt={3} color="gray.400">
                {" "}
              </Text>
            </Box>
          </VStack>
        </SurfaceCard>

        <SurfaceCard>
          <Heading size="md" color="#0F4C81">
            Details
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={5}>
            <DetailField label="Job Title" value={record?.metadata?.title || ""} />
            <DetailField label="Type" value="" />
            <DetailField label="Lead Source" value="" />
            <DetailField label="Owner" value="" />
            <DetailField label="Client Manager" value="" />
            <DetailField label="Recruiter" value="" />
          </SimpleGrid>
        </SurfaceCard>
      </SimpleGrid>

      <Drawer isOpen={isStageDrawerOpen} placement="right" onClose={closeStageDrawer} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Change Stage</DrawerHeader>
          <DrawerBody>
            <RadioGroup value={draftStage} onChange={setDraftStage}>
              <VStack align="stretch" spacing={3}>
                {chevronModel.stageOptions.map((stage) => (
                  <Box
                    key={stage.name}
                    p={4}
                    borderWidth="1px"
                    borderColor={draftStage === stage.name ? "blue.300" : "gray.200"}
                    bg={draftStage === stage.name ? "blue.50" : "transparent"}
                    borderRadius="16px"
                  >
                    <Radio value={stage.name} colorScheme="blue">
                      <Text fontWeight="semibold" color="gray.900">
                        {stage.name}
                      </Text>
                    </Radio>
                    <Text mt={2} ml={6} fontSize="sm" color="gray.600">
                      {stage.description || "No description provided."}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </RadioGroup>
          </DrawerBody>
          <DrawerFooter borderTopWidth="1px" borderColor="gray.100">
            <HStack spacing={3}>
              <Button variant="ghost" onClick={closeStageDrawer}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={saveStageDraft} isDisabled={draftStage === displayStage}>
                Save
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Stack>
  );
}
