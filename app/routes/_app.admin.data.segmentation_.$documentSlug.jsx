import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  ListItem,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  UnorderedList,
  VStack
} from "@chakra-ui/react";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useLocation, useNavigation, useSearchParams } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { randomUUID } from "node:crypto";

function readList(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === "string" && value.trim()) : [];
}

function joinList(values) {
  return readList(values).join("\n");
}

function readFormString(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readFormBoolean(formData, name) {
  return formData.has(name);
}

function parseSavedMarker(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const [kind, ...rest] = value.split(":");
  const id = rest.join(":").trim();
  if (!kind || !id) {
    return null;
  }

  return {
    kind: kind.trim(),
    id,
  };
}

async function loadSegmentationDocumentModule() {
  const module = await import("../models/segmentation-v312-documents.server.js");
  return module.default || module;
}

function ExpandableText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const normalizedText = typeof text === "string" ? text.trim() : "";
  const shouldCollapse = normalizedText.length > 320;

  if (!normalizedText) {
    return <Text color="gray.500">No description</Text>;
  }

  return (
    <VStack align="stretch" spacing={2}>
      <Text
        color="gray.700"
        whiteSpace="pre-wrap"
        sx={
          expanded || !shouldCollapse
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: 6,
                WebkitBoxOrient: "vertical",
                overflow: "hidden"
              }
        }
      >
        {normalizedText}
      </Text>
      {shouldCollapse ? (
        <Button alignSelf="start" size="sm" variant="link" colorScheme="red" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Less" : "More"}
        </Button>
      ) : null}
    </VStack>
  );
}

function DefinitionCard({
  documentSlug,
  entry,
  activeTab,
  isSaving = false,
  isSaved = false,
  isKeywordDocument = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const examples = readList(entry.examples);
  const notes = readList(entry.notes);

  if (isEditing) {
    return (
      <Box borderWidth="1px" borderColor="red.200" bg="white" borderRadius="xl" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }} boxShadow="sm">
        <Form
          method="post"
          onSubmit={() => {
            setIsEditing(false);
          }}
        >
          <VStack align="stretch" spacing={4}>
            <input type="hidden" name="intent" value="save-definition" />
            <input type="hidden" name="documentSlug" value={documentSlug} />
            <input type="hidden" name="definitionId" value={entry.id} />
            <input type="hidden" name="redirectTab" value={activeTab} />

            <Heading size="md">Edit Definition</Heading>

            <FormControl>
              <FormLabel>Name</FormLabel>
              <Textarea name="label" defaultValue={entry.label} minH="72px" />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea name="description" defaultValue={entry.description} minH="200px" />
            </FormControl>

            <FormControl>
              <FormLabel>Examples</FormLabel>
              <Textarea name="examplesText" defaultValue={joinList(entry.examples)} minH="160px" placeholder="One example per line" />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea name="notesText" defaultValue={joinList(entry.notes)} minH="160px" placeholder="One note per line" />
            </FormControl>

            {isKeywordDocument ? (
              <FormControl>
                <Checkbox
                  name="visible"
                  value="true"
                  defaultChecked={entry.visible !== false}
                  colorScheme="red"
                >
                  Can appear in Visible Keywords
                </Checkbox>
              </FormControl>
            ) : null}

            <HStack justify="flex-end">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" type="submit">
                Save
              </Button>
            </HStack>
          </VStack>
        </Form>
      </Box>
    );
  }

  return (
    <Box borderWidth="1px" borderColor="gray.200" bg="white" borderRadius="xl" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }} boxShadow="sm">
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="start" gap={4}>
          <Box>
            <Heading size="md" color="gray.900">
              {entry.label}
            </Heading>
            {isSaving ? (
              <Badge mt={2} colorScheme="blue" borderRadius="full" px={2} py={0.5}>
                Saving
              </Badge>
            ) : null}
            {!isSaving && isSaved ? (
              <Badge mt={2} colorScheme="green" borderRadius="full" px={2} py={0.5}>
                Saved
              </Badge>
            ) : null}
            {isKeywordDocument ? (
              <Badge
                mt={2}
                ml={2}
                colorScheme={entry.visible === false ? "orange" : "gray"}
                borderRadius="full"
                px={2}
                py={0.5}
              >
                {entry.visible === false
                  ? "Hidden From Visible Keywords"
                  : "Visible Keyword Allowed"}
              </Badge>
            ) : null}
          </Box>
          <Button
            size="sm"
            variant="outline"
            colorScheme="red"
            onClick={() => setIsEditing(true)}
            isDisabled={isSaving}
          >
            Edit
          </Button>
        </Flex>

        <Box>
          <Text fontWeight="semibold" color="gray.900" mb={2}>
            Description
          </Text>
          <ExpandableText text={entry.description} />
        </Box>

        {examples.length ? (
          <Box>
            <Text fontWeight="semibold" color="gray.900" mb={2}>
              Examples
            </Text>
            <UnorderedList spacing={2} pl={5} color="gray.700">
              {examples.map((example) => (
                <ListItem key={example}>{example}</ListItem>
              ))}
            </UnorderedList>
          </Box>
        ) : null}

        {notes.length ? (
          <Box>
            <Text fontWeight="semibold" color="gray.900" mb={2}>
              Notes
            </Text>
            <UnorderedList spacing={2} pl={5} color="gray.700">
              {notes.map((note) => (
                <ListItem key={note}>{note}</ListItem>
              ))}
            </UnorderedList>
          </Box>
        ) : null}
      </VStack>
    </Box>
  );
}

function AddDefinitionCard({
  documentSlug,
  activeTab,
  isKeywordDocument = false,
  onCancel,
}) {
  return (
    <Box borderWidth="1px" borderColor="red.200" bg="white" borderRadius="xl" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }} boxShadow="sm">
      <Form method="post">
        <VStack align="stretch" spacing={4}>
          <input type="hidden" name="intent" value="add-definition" />
          <input type="hidden" name="documentSlug" value={documentSlug} />
          <input type="hidden" name="redirectTab" value={activeTab} />

          <Heading size="md">Add Definition</Heading>

          <FormControl>
            <FormLabel>Name</FormLabel>
            <Textarea name="label" minH="72px" />
          </FormControl>

          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea name="description" minH="200px" />
          </FormControl>

          <FormControl>
            <FormLabel>Examples</FormLabel>
            <Textarea name="examplesText" minH="160px" placeholder="One example per line" />
          </FormControl>

          <FormControl>
            <FormLabel>Notes</FormLabel>
            <Textarea name="notesText" minH="160px" placeholder="One note per line" />
          </FormControl>

          {isKeywordDocument ? (
            <FormControl>
              <Checkbox name="visible" value="true" defaultChecked colorScheme="red">
                Can appear in Visible Keywords
              </Checkbox>
            </FormControl>
          ) : null}

          <HStack justify="flex-end">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button colorScheme="red" type="submit">
              Add Definition
            </Button>
          </HStack>
        </VStack>
      </Form>
    </Box>
  );
}

function RuleCard({ documentSlug, rule, activeTab, isSaving = false, isSaved = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const signals = readList(rule.signals);
  const examples = readList(rule.examples);

  if (isEditing) {
    return (
      <Box borderWidth="1px" borderColor="red.200" bg="white" borderRadius="xl" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }} boxShadow="sm">
        <Form
          method="post"
          onSubmit={() => {
            setIsEditing(false);
          }}
        >
          <VStack align="stretch" spacing={4}>
            <input type="hidden" name="intent" value="save-rule" />
            <input type="hidden" name="documentSlug" value={documentSlug} />
            <input type="hidden" name="ruleId" value={rule.id} />
            <input type="hidden" name="redirectTab" value={activeTab} />

            <Heading size="md">Edit Rule</Heading>

            <FormControl>
              <FormLabel>Name</FormLabel>
              <Textarea name="name" defaultValue={rule.name} minH="72px" />
            </FormControl>

            <FormControl>
              <FormLabel>Directive</FormLabel>
              <Textarea name="directive" defaultValue={rule.directive} minH="200px" />
            </FormControl>

            <FormControl>
              <FormLabel>Why This Exists</FormLabel>
              <Textarea name="why" defaultValue={rule.why || ""} minH="160px" />
            </FormControl>

            <FormControl>
              <FormLabel>Signals</FormLabel>
              <Textarea name="signalsText" defaultValue={joinList(rule.signals)} minH="160px" placeholder="One signal per line" />
            </FormControl>

            <FormControl>
              <FormLabel>Examples</FormLabel>
              <Textarea name="examplesText" defaultValue={joinList(rule.examples)} minH="160px" placeholder="One example per line" />
            </FormControl>

            <FormControl>
              <FormLabel>Stop Condition</FormLabel>
              <Textarea name="stopCondition" defaultValue={rule.stopCondition || ""} minH="120px" />
            </FormControl>

            <HStack justify="flex-end">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" type="submit">
                Save
              </Button>
            </HStack>
          </VStack>
        </Form>
      </Box>
    );
  }

  return (
    <Box borderWidth="1px" borderColor="gray.200" bg="white" borderRadius="xl" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }} boxShadow="sm">
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="start" gap={4}>
          <Box>
            <Heading size="md">{rule.name}</Heading>
            {isSaving ? (
              <Badge mt={2} colorScheme="blue" borderRadius="full" px={2} py={0.5}>
                Saving
              </Badge>
            ) : null}
            {!isSaving && isSaved ? (
              <Badge mt={2} colorScheme="green" borderRadius="full" px={2} py={0.5}>
                Saved
              </Badge>
            ) : null}
          </Box>
          <Button
            size="sm"
            variant="outline"
            colorScheme="red"
            onClick={() => setIsEditing(true)}
            isDisabled={isSaving}
          >
            Edit
          </Button>
        </Flex>

        <Box>
          <Text fontWeight="semibold" color="gray.900" mb={2}>
            Directive
          </Text>
          <ExpandableText text={rule.directive} />
        </Box>

        {typeof rule.why === "string" && rule.why.trim() ? (
          <Box>
            <Text fontWeight="semibold" color="gray.900" mb={2}>
              Why This Exists
            </Text>
            <ExpandableText text={rule.why} />
          </Box>
        ) : null}

        {signals.length ? (
          <Box>
            <Text fontWeight="semibold" color="gray.900" mb={2}>
              Signals To Consider
            </Text>
            <UnorderedList spacing={2} pl={5} color="gray.700">
              {signals.map((signal) => (
                <ListItem key={signal}>{signal}</ListItem>
              ))}
            </UnorderedList>
          </Box>
        ) : null}

        {examples.length ? (
          <Box>
            <Text fontWeight="semibold" color="gray.900" mb={2}>
              Examples
            </Text>
            <UnorderedList spacing={2} pl={5} color="gray.700">
              {examples.map((example) => (
                <ListItem key={example}>{example}</ListItem>
              ))}
            </UnorderedList>
          </Box>
        ) : null}

        {typeof rule.stopCondition === "string" && rule.stopCondition.trim() ? (
          <Box borderWidth="1px" borderColor="blue.200" bg="blue.50" borderRadius="lg" px={4} py={3}>
            <Text fontWeight="semibold" color="blue.800" mb={1}>
              Stop Condition
            </Text>
            <ExpandableText text={rule.stopCondition} />
          </Box>
        ) : null}
      </VStack>
    </Box>
  );
}

function AddRuleCard({ documentSlug, activeTab, onCancel }) {
  return (
    <Box borderWidth="1px" borderColor="red.200" bg="white" borderRadius="xl" px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }} boxShadow="sm">
      <Form method="post">
        <VStack align="stretch" spacing={4}>
          <input type="hidden" name="intent" value="add-rule" />
          <input type="hidden" name="documentSlug" value={documentSlug} />
          <input type="hidden" name="redirectTab" value={activeTab} />

          <Heading size="md">Add Rule</Heading>

          <FormControl>
            <FormLabel>Name</FormLabel>
            <Textarea name="name" minH="72px" />
          </FormControl>

          <FormControl>
            <FormLabel>Directive</FormLabel>
            <Textarea name="directive" minH="200px" />
          </FormControl>

          <FormControl>
            <FormLabel>Why This Exists</FormLabel>
            <Textarea name="why" minH="160px" />
          </FormControl>

          <FormControl>
            <FormLabel>Signals</FormLabel>
            <Textarea name="signalsText" minH="160px" placeholder="One signal per line" />
          </FormControl>

          <FormControl>
            <FormLabel>Examples</FormLabel>
            <Textarea name="examplesText" minH="160px" placeholder="One example per line" />
          </FormControl>

          <FormControl>
            <FormLabel>Stop Condition</FormLabel>
            <Textarea name="stopCondition" minH="120px" />
          </FormControl>

          <HStack justify="flex-end">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button colorScheme="red" type="submit">
              Add Rule
            </Button>
          </HStack>
        </VStack>
      </Form>
    </Box>
  );
}

export async function loader({ request, params }) {
  const documentSlug = typeof params.documentSlug === "string" ? params.documentSlug : "";
  const { loadSegmentationDocument } = await loadSegmentationDocumentModule();
  const result = await loadSegmentationDocument({
    request,
    slug: documentSlug,
  });
  const document = result?.document || null;

  if (!document) {
    throw new Response("Not found", { status: 404 });
  }

  return json({
    document,
    syncStatus: result?.syncStatus || null,
    reloadToken: Date.now()
  });
}

export async function action({ request, params }) {
  const documentSlug = typeof params.documentSlug === "string" ? params.documentSlug : "";
  const { updateDefinition, updateRule, addDefinition, addRule } = await loadSegmentationDocumentModule();
  const formData = await request.formData();
  const intent = readFormString(formData, "intent").trim();
  const redirectTab = readFormString(formData, "redirectTab").trim() || "definitions";
  let savedMarker = null;

  if (!documentSlug) {
    throw new Response("Not found", { status: 404 });
  }

  if (intent === "save-definition") {
    const definitionId = readFormString(formData, "definitionId").trim();
    await updateDefinition({
      request,
      slug: documentSlug,
      definitionId,
      label: readFormString(formData, "label"),
      description: readFormString(formData, "description"),
      examplesText: readFormString(formData, "examplesText"),
      notesText: readFormString(formData, "notesText"),
      visible: readFormBoolean(formData, "visible"),
    });
    savedMarker = `definition:${definitionId}`;
  } else if (intent === "add-definition") {
    const result = await addDefinition({
      request,
      slug: documentSlug,
      label: readFormString(formData, "label"),
      description: readFormString(formData, "description"),
      examplesText: readFormString(formData, "examplesText"),
      notesText: readFormString(formData, "notesText"),
      visible: readFormBoolean(formData, "visible"),
    });
    savedMarker = `definition:${result?.addedDefinitionId}`;
  } else if (intent === "save-rule") {
    const ruleId = readFormString(formData, "ruleId").trim();
    await updateRule({
      request,
      slug: documentSlug,
      ruleId,
      name: readFormString(formData, "name"),
      directive: readFormString(formData, "directive"),
      why: readFormString(formData, "why"),
      signalsText: readFormString(formData, "signalsText"),
      examplesText: readFormString(formData, "examplesText"),
      stopCondition: readFormString(formData, "stopCondition")
    });
    savedMarker = `rule:${ruleId}`;
  } else if (intent === "add-rule") {
    const ruleId = randomUUID();
    const result = await addRule({
      request,
      slug: documentSlug,
      ruleId,
      name: readFormString(formData, "name"),
      directive: readFormString(formData, "directive"),
      why: readFormString(formData, "why"),
      signalsText: readFormString(formData, "signalsText"),
      examplesText: readFormString(formData, "examplesText"),
      stopCondition: readFormString(formData, "stopCondition")
    });
    savedMarker = `rule:${result?.addedRuleId || ruleId}`;
  } else {
    return json({ ok: false }, { status: 400 });
  }

  const nextSearchParams = new URLSearchParams();
  if (redirectTab === "rules") {
    nextSearchParams.set("tab", "rules");
  }
  if (savedMarker) {
    nextSearchParams.set("saved", savedMarker);
  }
  const queryString = nextSearchParams.toString();

  return redirect(
    `/admin/data/segmentation/${encodeURIComponent(documentSlug)}${queryString ? `?${queryString}` : ""}`
  );
}

export default function AdminDataSegmentationDocumentRoute() {
  const data = useLoaderData();
  const location = useLocation();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => (searchParams.get("tab") === "rules" ? "rules" : "definitions"));
  const [isAddingDefinition, setIsAddingDefinition] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [savedMarker, setSavedMarker] = useState(() => parseSavedMarker(searchParams.get("saved")));
  const document = data?.document || null;
  const isKeywordDocument = document?.slug === "keywords";
  const reloadToken = data?.reloadToken || 0;
  const syncStatus = data?.syncStatus || null;
  const tabIndex = activeTab === "rules" ? 1 : 0;
  const definitionCards = useMemo(() => (Array.isArray(document?.definitions) ? document.definitions : []), [document?.definitions]);
  const ruleCards = useMemo(() => (Array.isArray(document?.rules) ? document.rules : []), [document?.rules]);
  const navigationFormAction = typeof navigation.formAction === "string" ? new URL(navigation.formAction, "http://localhost").pathname : "";
  const isSameDocumentSubmission =
    navigation.state !== "idle" && navigationFormAction === location.pathname;
  const pendingIntent = isSameDocumentSubmission ? readFormString(navigation.formData || new FormData(), "intent").trim() : "";
  const pendingDefinitionId = isSameDocumentSubmission ? readFormString(navigation.formData || new FormData(), "definitionId").trim() : "";
  const pendingRuleId = isSameDocumentSubmission ? readFormString(navigation.formData || new FormData(), "ruleId").trim() : "";
  const isSavingDocument =
    isSameDocumentSubmission &&
    ["save-definition", "add-definition", "save-rule", "add-rule"].includes(pendingIntent);
  const syncTone =
    isSavingDocument
      ? "blue"
      : syncStatus?.status === "failed"
      ? "red"
      : syncStatus?.status === "syncing"
        ? "blue"
        : syncStatus?.status === "scheduled"
          ? "orange"
      : syncStatus?.dirty === true
        ? "orange"
        : syncStatus?.status === "synced"
          ? "green"
          : "gray";

  useEffect(() => {
    setIsAddingDefinition(false);
    setIsAddingRule(false);
  }, [reloadToken]);

  useEffect(() => {
    setSavedMarker(parseSavedMarker(searchParams.get("saved")));
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams.get("saved")) {
      return;
    }

    setActiveTab(searchParams.get("tab") === "rules" ? "rules" : "definitions");
  }, [searchParams]);

  useEffect(() => {
    if (!savedMarker) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSavedMarker(null);
      const next = new URLSearchParams(searchParams);
      next.delete("saved");
      setSearchParams(next, { replace: true });
    }, 2500);

    return () => clearTimeout(timer);
  }, [savedMarker, searchParams, setSearchParams]);

  function handleTabChange(index) {
    const nextTab = index === 1 ? "rules" : "definitions";
    setActiveTab(nextTab);
    if (nextTab !== "rules") {
      setIsAddingRule(false);
    }
    if (nextTab !== "definitions") {
      setIsAddingDefinition(false);
    }
  }

  if (!document) {
    return (
      <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
        <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
          <Box>
            <Heading size="md">Segmentation</Heading>
            <Text color="gray.600" mt={2}>
              This page is reloading.
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Box>
          <Heading size="md">{document.title}</Heading>
          <Text color="gray.600" mt={2}>
            {document.summary}
          </Text>
          <Flex align="center" gap={3} wrap="wrap" mt={3}>
            <Badge colorScheme={syncTone} borderRadius="full" px={3} py={1}>
              {isSavingDocument
                ? "Saving Document"
                : syncStatus?.status === "failed"
                ? "AI Sync Failed"
                : syncStatus?.status === "syncing"
                  ? "AI Syncing"
                  : syncStatus?.status === "scheduled"
                    ? "AI Sync Scheduled"
                : syncStatus?.dirty === true
                  ? "AI Sync Pending"
                  : syncStatus?.status === "synced"
                    ? "AI Synced"
                    : "AI Sync Idle"}
            </Badge>
            <Text color="gray.500" fontSize="sm">
              {isSavingDocument
                ? "Saving document. AI sync scheduling will update automatically."
                : syncStatus?.status === "failed"
                ? syncStatus.lastErrorMessage || "The last AI sync failed."
                : syncStatus?.status === "syncing"
                  ? "AI sync is running in the background while you keep editing."
                  : syncStatus?.status === "scheduled" && syncStatus?.nextScheduledAt
                    ? `AI sync scheduled for ${new Date(syncStatus.nextScheduledAt).toLocaleString()}.`
                : syncStatus?.dirty === true
                  ? "Recent playbook changes are saved and waiting for AI sync."
                  : syncStatus?.lastSyncedAt
                    ? `Last synced ${new Date(syncStatus.lastSyncedAt).toLocaleString()}.`
                    : "No AI sync has run yet."}
            </Text>
          </Flex>
        </Box>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" overflow="auto">
        <Tabs colorScheme="red" variant="enclosed" index={tabIndex} onChange={handleTabChange}>
          <TabList>
            <Tab>Definitions</Tab>
            <Tab>Rules</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0} pt={6}>
              <VStack align="stretch" spacing={4}>
                <Flex justify="space-between" align="center" gap={4} wrap="wrap">
                  <Heading size="sm">Definitions</Heading>
                  <Button colorScheme="red" onClick={() => setIsAddingDefinition(true)}>
                    Add Definition
                  </Button>
                </Flex>

                {isAddingDefinition ? (
                  <AddDefinitionCard
                    documentSlug={document.slug}
                    activeTab={activeTab}
                    isKeywordDocument={isKeywordDocument}
                    onCancel={() => setIsAddingDefinition(false)}
                  />
                ) : null}

                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                  {definitionCards.map((entry) => (
                    <DefinitionCard
                      key={`${entry.id}:${reloadToken}`}
                      documentSlug={document.slug}
                      entry={entry}
                      activeTab={activeTab}
                      isKeywordDocument={isKeywordDocument}
                      isSaving={pendingIntent === "save-definition" && pendingDefinitionId === entry.id}
                      isSaved={savedMarker?.kind === "definition" && savedMarker?.id === entry.id}
                    />
                  ))}
                </SimpleGrid>
              </VStack>
            </TabPanel>

            <TabPanel px={0} pt={6}>
              <VStack align="stretch" spacing={4}>
                <Flex justify="space-between" align="center" gap={4} wrap="wrap">
                  <Heading size="sm">Rules</Heading>
                  <Button colorScheme="red" onClick={() => setIsAddingRule(true)}>
                    Add Rule
                  </Button>
                </Flex>

                {isAddingRule ? (
                  <AddRuleCard documentSlug={document.slug} activeTab={activeTab} onCancel={() => setIsAddingRule(false)} />
                ) : null}

                {ruleCards.map((rule) => (
                  <RuleCard
                    key={`${rule.id}:${reloadToken}`}
                    documentSlug={document.slug}
                    rule={rule}
                    activeTab={activeTab}
                    isSaving={pendingIntent === "save-rule" && pendingRuleId === rule.id}
                    isSaved={savedMarker?.kind === "rule" && savedMarker?.id === rule.id}
                  />
                ))}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Divider mt={6} />
      </Box>
    </Box>
  );
}
