import { json, redirect } from "@remix-run/node";
import { Link, useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Select,
  Skeleton,
  SkeletonText,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  Tabs,
  Text,
  Textarea
} from "@chakra-ui/react";
import { EmailTemplateVisualEditor } from "../components/EmailTemplateVisualEditor";
import {
  buildEmailContentRecordId,
  buildEmailTemplatePreview,
  buildEmptyEmailSnippetDocument,
  buildEmptyEmailTemplateDocument,
  EMAIL_SNIPPET_KIND,
  EMAIL_SNIPPET_TYPES,
  EMAIL_TEMPLATE_KIND,
  EMAIL_TEMPLATE_NAMESPACE_PREFIX,
  EMAIL_TEMPLATE_TOOL_PATH,
  normalizeEmailContentDocument,
  normalizeEmailContentKey,
  publishDraftEmailContentDocument
} from "../models/email-template-document.mjs";
const {
  EmailTemplatesApiError,
  getEmailTemplate,
  loadEmailTemplates,
  saveEmailTemplate
} = require("../models/email-templates.server.js");

/**
 * Reads a trimmed string.
 * @param {FormData} formData
 * @param {string} key
 * @returns {string}
 */
function readFormString(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads an optional number.
 * @param {FormData} formData
 * @param {string} key
 * @returns {number|null}
 */
function readFormNumber(formData, key) {
  const value = readFormString(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parses one JSON payload from a form field.
 * @param {FormData} formData
 * @param {string} key
 * @param {unknown} fallback
 * @returns {unknown}
 */
function parseJsonField(formData, key, fallback) {
  const value = readFormString(formData, key);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

/**
 * Builds one route error payload.
 * @param {unknown} error
 * @returns {{message: string}}
 */
function buildRouteError(error) {
  if (error instanceof Error && error.name === "EmailTemplatesApiError") {
    return {
      message: error.message
    };
  }

  return {
    message: error instanceof Error ? error.message : "Email Templates request failed."
  };
}

/**
 * Returns whether one tab key is valid.
 * @param {unknown} value
 * @returns {"templates"|"snippets"}
 */
function normalizeTab(value) {
  return value === "snippets" ? "snippets" : "templates";
}

/**
 * Builds the current route path with selection params.
 * @param {{tab?: string, id?: string}} [options]
 * @returns {string}
 */
function buildEmailTemplatesPath(options = {}) {
  const searchParams = new URLSearchParams();
  const tab = normalizeTab(options.tab);
  searchParams.set("tab", tab);

  if (typeof options.id === "string" && options.id.trim()) {
    searchParams.set("id", options.id.trim());
  }

  return `${EMAIL_TEMPLATE_TOOL_PATH}?${searchParams.toString()}`;
}

/**
 * Returns whether one record is a snippet.
 * @param {{kind?: string}} record
 * @returns {boolean}
 */
function isSnippetRecord(record) {
  return record?.kind === EMAIL_SNIPPET_KIND;
}

/**
 * Loads all email template/snippet records.
 * @param {{request: Request}} options
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function loadEmailContentRecords(options) {
  const result = await loadEmailTemplates({
    request: options.request
  });
  const records = (Array.isArray(result.data) ? result.data : []).map((record) => {
    const normalized = normalizeEmailContentDocument(record);
    return {
      ...record,
      ...normalized,
      description: record.description || "",
      version: record.version ?? null,
      rawDocument: record.rawDocument || null
    };
  });

  return records.sort((left, right) => String(left.name || left.key || "").localeCompare(String(right.name || right.key || "")));
}

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const selectedTab = normalizeTab(url.searchParams.get("tab"));
    const records = await loadEmailContentRecords({ request });
    const templates = records.filter((record) => !isSnippetRecord(record));
    const snippets = records.filter((record) => isSnippetRecord(record));
    const selectedCollection = selectedTab === "snippets" ? snippets : templates;
    const requestedId = typeof url.searchParams.get("id") === "string" ? url.searchParams.get("id").trim() : "";
    const selectedDocument =
      selectedCollection.find((record) => record.id === requestedId) ||
      selectedCollection[0] ||
      null;

    return json({
      templates,
      snippets,
      selectedTab,
      selectedDocument,
      snippetsByKey: Object.fromEntries(snippets.map((snippet) => [snippet.snippetKey, snippet.rawDocument]))
    });
  } catch (error) {
    const status = error?.name === "EmailTemplatesApiError" ? error.statusCode : 500;
    return json(
      {
        templates: [],
        snippets: [],
        selectedTab: "templates",
        selectedDocument: null,
        snippetsByKey: {},
        error: buildRouteError(error)
      },
      { status }
    );
  }
}

export async function action({ request }) {
  const formData = await request.formData();
  const intent = readFormString(formData, "intent");
  const tab = normalizeTab(readFormString(formData, "tab"));

  try {
    if (intent === "create-template") {
      const rawKey = readFormString(formData, "key") || readFormString(formData, "name");
      const key = normalizeEmailContentKey(rawKey);
      const name = readFormString(formData, "name") || key;
      if (!key) {
        return json({ ok: false, error: { message: "Template key or name is required." } }, { status: 400 });
      }

      const id = buildEmailContentRecordId(EMAIL_TEMPLATE_KIND, key);
      await saveEmailTemplate({
        request,
        id,
        name,
        description: "",
        document: buildEmptyEmailTemplateDocument({
          key,
          name
        })
      });

      return redirect(buildEmailTemplatesPath({ tab: "templates", id }));
    }

    if (intent === "create-snippet") {
      const rawKey = readFormString(formData, "key") || readFormString(formData, "name");
      const key = normalizeEmailContentKey(rawKey);
      const name = readFormString(formData, "name") || key;
      const snippetKind = EMAIL_SNIPPET_TYPES.includes(readFormString(formData, "snippetKind"))
        ? readFormString(formData, "snippetKind")
        : "footer";
      if (!key) {
        return json({ ok: false, error: { message: "Snippet key or name is required." } }, { status: 400 });
      }

      const id = buildEmailContentRecordId(EMAIL_SNIPPET_KIND, key);
      await saveEmailTemplate({
        request,
        id,
        name,
        description: "",
        document: buildEmptyEmailSnippetDocument({
          key,
          name,
          snippetKind
        })
      });

      return redirect(buildEmailTemplatesPath({ tab: "snippets", id }));
    }

    if (intent === "save-template-draft" || intent === "publish-template") {
      const id = readFormString(formData, "id");
      const key = normalizeEmailContentKey(readFormString(formData, "recordKey") || id.split(":").pop());
      const name = readFormString(formData, "name");
      const description = readFormString(formData, "description");
      const subject = readFormString(formData, "subject");
      const bodyHtml = readFormString(formData, "bodyHtml");
      const design = parseJsonField(formData, "design", null);
      const expectedVersion = readFormNumber(formData, "expectedVersion");
      const headerSnippetKey = normalizeEmailContentKey(readFormString(formData, "headerSnippetKey"));
      const footerSnippetKey = normalizeEmailContentKey(readFormString(formData, "footerSnippetKey"));
      const existing = await getEmailTemplate({
        request,
        id
      });
      const normalized = normalizeEmailContentDocument(existing);
      const nextDocument = {
        ...(existing.document && typeof existing.document === "object" ? existing.document : {}),
        kind: EMAIL_TEMPLATE_KIND,
        templateKey: key,
        tokenScope: "help-docs",
        slots: {
          header: {
            snippetKey: headerSnippetKey,
            mode: "selected"
          },
          footer: {
            snippetKey: footerSnippetKey,
            mode: "selected"
          }
        },
        draft: {
          name: name || key,
          subject,
          bodyHtml,
          design: design && typeof design === "object" ? design : null,
          html: bodyHtml
        },
        active: normalized.active
      };
      const finalDocument = intent === "publish-template"
        ? publishDraftEmailContentDocument(nextDocument)
        : nextDocument;

      await saveEmailTemplate({
        request,
        id,
        name: name || key,
        description,
        expectedVersion,
        document: finalDocument
      });

      return redirect(buildEmailTemplatesPath({ tab: "templates", id }));
    }

    if (intent === "save-snippet-draft" || intent === "publish-snippet") {
      const id = readFormString(formData, "id");
      const key = normalizeEmailContentKey(readFormString(formData, "recordKey") || id.split(":").pop());
      const name = readFormString(formData, "name");
      const description = readFormString(formData, "description");
      const html = readFormString(formData, "html");
      const bodyHtml = readFormString(formData, "bodyHtml") || html;
      const design = parseJsonField(formData, "design", null);
      const expectedVersion = readFormNumber(formData, "expectedVersion");
      const snippetKind = EMAIL_SNIPPET_TYPES.includes(readFormString(formData, "snippetKind"))
        ? readFormString(formData, "snippetKind")
        : "footer";
      const existing = await getEmailTemplate({
        request,
        id
      });
      const normalized = normalizeEmailContentDocument(existing);
      const nextDocument = {
        ...(existing.document && typeof existing.document === "object" ? existing.document : {}),
        kind: EMAIL_SNIPPET_KIND,
        snippetKey: key,
        snippetKind,
        scope: "global",
        draft: {
          name: name || key,
          subject: "",
          bodyHtml,
          design: design && typeof design === "object" ? design : null,
          html
        },
        active: normalized.active
      };
      const finalDocument = intent === "publish-snippet"
        ? publishDraftEmailContentDocument(nextDocument)
        : nextDocument;

      await saveEmailTemplate({
        request,
        id,
        name: name || key,
        description,
        expectedVersion,
        document: finalDocument
      });

      return redirect(buildEmailTemplatesPath({ tab: "snippets", id }));
    }

    return json({ ok: false, error: { message: "Unsupported Email Templates action." } }, { status: 400 });
  } catch (error) {
    const status = error?.name === "EmailTemplatesApiError" ? error.statusCode : 500;
    return json(
      {
        ok: false,
        error: buildRouteError(error)
      },
      { status }
    );
  }
}

/**
 * Returns the editable template state for one loaded record.
 * @param {Record<string, unknown>|null} record
 * @returns {{
 *   id: string,
 *   key: string,
 *   name: string,
 *   description: string,
 *   expectedVersion: number|string,
 *   subject: string,
 *   bodyHtml: string,
 *   design: Record<string, unknown>|null,
 *   headerSnippetKey: string,
 *   footerSnippetKey: string
 * }}
 */
function buildTemplateFormState(record) {
  return {
    id: typeof record?.id === "string" ? record.id : "",
    key: typeof record?.templateKey === "string" ? record.templateKey : "",
    name: typeof record?.draft?.name === "string" ? record.draft.name : "",
    description: typeof record?.description === "string" ? record.description : "",
    expectedVersion: Number.isFinite(record?.version) ? Number(record.version) : "",
    subject: typeof record?.draft?.subject === "string" ? record.draft.subject : "",
    bodyHtml: typeof record?.draft?.bodyHtml === "string" ? record.draft.bodyHtml : "",
    design: record?.draft?.design && typeof record.draft.design === "object" ? record.draft.design : null,
    headerSnippetKey: typeof record?.slots?.header?.snippetKey === "string" ? record.slots.header.snippetKey : "",
    footerSnippetKey: typeof record?.slots?.footer?.snippetKey === "string" ? record.slots.footer.snippetKey : ""
  };
}

/**
 * Returns the editable snippet state for one loaded record.
 * @param {Record<string, unknown>|null} record
 * @returns {{
 *   id: string,
 *   key: string,
 *   name: string,
 *   description: string,
 *   expectedVersion: number|string,
 *   snippetKind: string,
 *   html: string
 * }}
 */
function buildSnippetFormState(record) {
  return {
    id: typeof record?.id === "string" ? record.id : "",
    key: typeof record?.snippetKey === "string" ? record.snippetKey : "",
    name: typeof record?.draft?.name === "string" ? record.draft.name : "",
    description: typeof record?.description === "string" ? record.description : "",
    expectedVersion: Number.isFinite(record?.version) ? Number(record.version) : "",
    snippetKind: EMAIL_SNIPPET_TYPES.includes(record?.snippetKind) ? record.snippetKind : "footer",
    html: typeof record?.draft?.html === "string"
      ? record.draft.html
      : typeof record?.draft?.bodyHtml === "string"
        ? record.draft.bodyHtml
        : "",
    bodyHtml: typeof record?.draft?.bodyHtml === "string"
      ? record.draft.bodyHtml
      : typeof record?.draft?.html === "string"
        ? record.draft.html
        : "",
    design: record?.draft?.design && typeof record.draft.design === "object" ? record.draft.design : null
  };
}

export default function EmailTemplatesRoute() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const editorRef = useRef(null);
  const snippetEditorRef = useRef(null);
  const selectedDocument = loaderData?.selectedDocument || null;
  const selectedTab = loaderData?.selectedTab || "templates";
  const [templateState, setTemplateState] = useState(() => buildTemplateFormState(selectedDocument));
  const [snippetState, setSnippetState] = useState(() => buildSnippetFormState(selectedDocument));
  const [isSnippetCreateFormOpen, setIsSnippetCreateFormOpen] = useState(() => {
    return selectedTab === "snippets" && !(loaderData?.snippets || []).length;
  });
  const selectedDocumentSignature = `${selectedDocument?.id || ""}:${selectedDocument?.version || ""}:${selectedTab}`;

  useEffect(() => {
    setTemplateFormState(buildTemplateFormState(selectedDocument));
    setSnippetFormState(buildSnippetFormState(selectedDocument));
  }, [selectedDocumentSignature]);

  useEffect(() => {
    if (selectedTab !== "snippets") {
      setIsSnippetCreateFormOpen(false);
      return;
    }

    if (!(loaderData?.snippets || []).length) {
      setIsSnippetCreateFormOpen(true);
      return;
    }

    if (selectedDocument?.kind === EMAIL_SNIPPET_KIND) {
      setIsSnippetCreateFormOpen(false);
    }
  }, [loaderData?.snippets, selectedDocument?.id, selectedDocument?.kind, selectedTab]);

  const setTemplateFormState = setTemplateState;
  const setSnippetFormState = setSnippetState;
  const headerSnippets = (loaderData?.snippets || []).filter((item) => item.snippetKind === "header");
  const footerSnippets = (loaderData?.snippets || []).filter((item) => item.snippetKind === "footer");
  const snippetsByKey = useMemo(() => {
    return loaderData?.snippetsByKey && typeof loaderData.snippetsByKey === "object"
      ? { ...loaderData.snippetsByKey }
      : {};
  }, [loaderData?.snippetsByKey]);
  const templatePreview = useMemo(() => {
    if (!selectedDocument || selectedDocument.kind !== EMAIL_TEMPLATE_KIND) {
      return {
        subject: "",
        html: ""
      };
    }

    return buildEmailTemplatePreview({
      template: {
        ...selectedDocument.rawDocument,
        kind: EMAIL_TEMPLATE_KIND,
        slots: {
          header: {
            snippetKey: templateState.headerSnippetKey,
            mode: "selected"
          },
          footer: {
            snippetKey: templateState.footerSnippetKey,
            mode: "selected"
          }
        },
        draft: {
          ...(selectedDocument.rawDocument?.draft || {}),
          name: templateState.name,
          subject: templateState.subject,
          bodyHtml: templateState.bodyHtml,
          design: templateState.design,
          html: templateState.bodyHtml
        }
      },
      snippetsByKey,
      versionKey: "active"
    });
  }, [selectedDocument, snippetsByKey, templateState]);
  const isSaving = navigation.state === "submitting";
  const navigationIntent = navigation.formData
    ? readFormString(navigation.formData, "intent")
    : "";
  const isCreatingTemplate =
    navigation.state === "submitting" && navigationIntent === "create-template";
  const isCreatingSnippet =
    navigation.state === "submitting" && navigationIntent === "create-snippet";

  /**
   * Saves the current template draft or publishes it.
   * @param {"save-template-draft"|"publish-template"} intent
   * @returns {Promise<void>}
   */
  async function handleTemplateSubmit(intent) {
    const exported = await editorRef.current?.exportContent?.();
    const nextHtml = exported?.html || templateState.bodyHtml || "";
    const nextDesign = exported?.design && typeof exported.design === "object"
      ? exported.design
      : templateState.design;
    const formData = new FormData();
    formData.set("intent", intent);
    formData.set("tab", "templates");
    formData.set("id", templateState.id);
    formData.set("recordKey", templateState.key);
    formData.set("name", templateState.name);
    formData.set("description", templateState.description);
    formData.set("expectedVersion", String(templateState.expectedVersion || ""));
    formData.set("subject", templateState.subject);
    formData.set("bodyHtml", nextHtml);
    formData.set("design", JSON.stringify(nextDesign || null));
    formData.set("headerSnippetKey", templateState.headerSnippetKey);
    formData.set("footerSnippetKey", templateState.footerSnippetKey);
    submit(formData, { method: "post" });
  }

  /**
   * Saves the current snippet draft or publishes it.
   * @param {"save-snippet-draft"|"publish-snippet"} intent
   * @returns {void}
   */
  function handleSnippetSubmit(intent) {
    Promise.resolve(snippetEditorRef.current?.exportContent?.())
      .then((exported) => {
        const nextHtml = exported?.html || snippetState.bodyHtml || snippetState.html || "";
        const nextDesign = exported?.design && typeof exported.design === "object"
          ? exported.design
          : snippetState.design;
        const formData = new FormData();
        formData.set("intent", intent);
        formData.set("tab", "snippets");
        formData.set("id", snippetState.id);
        formData.set("recordKey", snippetState.key);
        formData.set("name", snippetState.name);
        formData.set("description", snippetState.description);
        formData.set("expectedVersion", String(snippetState.expectedVersion || ""));
        formData.set("snippetKind", snippetState.snippetKind);
        formData.set("html", nextHtml);
        formData.set("bodyHtml", nextHtml);
        formData.set("design", JSON.stringify(nextDesign || null));
        submit(formData, { method: "post" });
      });
  }

  return (
    <Box>
      <Heading size="md" mb={1}>Email Templates</Heading>
      <Text color="gray.500" fontSize="sm" mb={6}>
        Manage phase 1 email templates, global headers and footers, and draft-to-active publishing from one tool.
      </Text>

      {loaderData?.error?.message ? (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          <AlertDescription>{loaderData.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {actionData?.error?.message ? (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          <AlertDescription>{actionData.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <Grid templateColumns={{ base: "1fr", xl: "320px 1fr" }} gap={6} alignItems="start">
        <GridItem>
          <Card>
            <CardBody>
              <Tabs index={selectedTab === "snippets" ? 1 : 0} variant="soft-rounded" colorScheme="blue" isLazy>
                <TabList mb={4}>
                  <Tab as={Link} to={buildEmailTemplatesPath({ tab: "templates" })}>Templates</Tab>
                  <Tab as={Link} to={buildEmailTemplatesPath({ tab: "snippets" })}>Snippets</Tab>
                </TabList>
              </Tabs>

              <Stack spacing={3} mb={5}>
                {(selectedTab === "snippets" ? loaderData?.snippets : loaderData?.templates).map((record) => (
                  <Box
                    key={record.id}
                    as={Link}
                    to={buildEmailTemplatesPath({
                      tab: selectedTab,
                      id: record.id
                    })}
                    border="1px solid"
                    borderColor={selectedDocument?.id === record.id ? "blue.300" : "gray.200"}
                    bg={selectedDocument?.id === record.id ? "blue.50" : "white"}
                    borderRadius="md"
                    px={3}
                    py={3}
                    _hover={{ borderColor: "blue.200", textDecoration: "none" }}
                  >
                    <HStack justify="space-between" align="flex-start" mb={1}>
                      <Text fontWeight="semibold" fontSize="sm">{record.draft?.name || record.name}</Text>
                      <Badge colorScheme={record.active?.name || record.active?.html || record.active?.bodyHtml ? "green" : "gray"}>
                        {record.active?.name || record.active?.html || record.active?.bodyHtml ? "Active" : "Draft only"}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">{record.key}</Text>
                  </Box>
                ))}
              </Stack>

              <Divider mb={4} />

              {selectedTab === "templates" ? (
                <Box as="form" method="post">
                  <input type="hidden" name="intent" value="create-template" />
                  <input type="hidden" name="tab" value="templates" />
                  <Heading size="sm" mb={3}>New Template</Heading>
                  <Stack spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="sm">Name</FormLabel>
                      <Input name="name" size="sm" placeholder="Executive Search Outreach" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Key</FormLabel>
                      <Input name="key" size="sm" placeholder="executive-search-outreach" />
                    </FormControl>
                    <Button type="submit" size="sm" colorScheme="blue" isLoading={isCreatingTemplate}>
                      Create Template
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Stack spacing={3}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant={isSnippetCreateFormOpen ? "solid" : "outline"}
                    onClick={() => setIsSnippetCreateFormOpen((current) => !current)}
                  >
                    {isSnippetCreateFormOpen ? "Close New Snippet" : "New Snippet"}
                  </Button>

                  {isSnippetCreateFormOpen ? (
                    <Box as="form" method="post">
                      <input type="hidden" name="intent" value="create-snippet" />
                      <input type="hidden" name="tab" value="snippets" />
                      <Heading size="sm" mb={3}>New Snippet</Heading>
                      <Stack spacing={3}>
                        <FormControl>
                          <FormLabel fontSize="sm">Name</FormLabel>
                          <Input name="name" size="sm" placeholder="Default Footer" />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="sm">Key</FormLabel>
                          <Input name="key" size="sm" placeholder="default-footer" />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="sm">Type</FormLabel>
                          <Select name="snippetKind" size="sm" defaultValue="footer">
                            <option value="header">Header</option>
                            <option value="footer">Footer</option>
                          </Select>
                        </FormControl>
                        <Button type="submit" size="sm" colorScheme="blue" isLoading={isCreatingSnippet}>
                          Create Snippet
                        </Button>
                      </Stack>
                    </Box>
                  ) : null}
                </Stack>
              )}
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          {isCreatingSnippet ? (
            <Stack spacing={6}>
              <Card>
                <CardBody>
                  <Skeleton height="22px" width="180px" mb={4} borderRadius="sm" />
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={4}>
                    <Skeleton height="40px" borderRadius="md" />
                    <Skeleton height="40px" borderRadius="md" />
                  </SimpleGrid>
                  <Skeleton height="72px" borderRadius="md" mb={4} />
                  <Skeleton height="18px" width="120px" mb={3} borderRadius="sm" />
                  <Skeleton height="420px" borderRadius="md" />
                  <HStack spacing={3} mt={5}>
                    <Skeleton height="40px" width="120px" borderRadius="md" />
                    <Skeleton height="40px" width="180px" borderRadius="md" />
                  </HStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Skeleton height="18px" width="90px" mb={3} borderRadius="sm" />
                  <SkeletonText noOfLines={6} spacing={4} skeletonHeight="16px" />
                </CardBody>
              </Card>
            </Stack>
          ) : !selectedDocument ? (
            <Card>
              <CardBody>
                <Heading size="sm" mb={2}>Nothing selected</Heading>
                <Text fontSize="sm" color="gray.600">
                  Create a template or snippet from the left rail to start editing phase 1 email content.
                </Text>
              </CardBody>
            </Card>
          ) : selectedDocument.kind === EMAIL_TEMPLATE_KIND ? (
            <Stack spacing={6}>
              <Card>
                <CardBody>
                  <HStack justify="space-between" align="flex-start" mb={4}>
                    <Box>
                      <Heading size="sm">{selectedDocument.draft?.name || selectedDocument.name}</Heading>
                      <Text fontSize="sm" color="gray.500">{selectedDocument.key}</Text>
                    </Box>
                    <HStack spacing={2}>
                      <Badge colorScheme="purple">Template</Badge>
                      <Badge colorScheme={selectedDocument.active?.name || selectedDocument.active?.bodyHtml ? "green" : "gray"}>
                        {selectedDocument.active?.name || selectedDocument.active?.bodyHtml ? "Active version available" : "Draft only"}
                      </Badge>
                    </HStack>
                  </HStack>

                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">Template Name</FormLabel>
                      <Input
                        value={templateState.name}
                        onChange={(event) => setTemplateFormState((current) => ({ ...current, name: event.target.value }))}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Record Key</FormLabel>
                      <Input value={templateState.key} isReadOnly bg="gray.50" />
                    </FormControl>
                  </SimpleGrid>

                  <FormControl mb={4}>
                    <FormLabel fontSize="sm">Description</FormLabel>
                    <Textarea
                      rows={2}
                      value={templateState.description}
                      onChange={(event) => setTemplateFormState((current) => ({ ...current, description: event.target.value }))}
                    />
                  </FormControl>

                  <FormControl mb={4}>
                    <FormLabel fontSize="sm">Subject</FormLabel>
                    <Input
                      value={templateState.subject}
                      onChange={(event) => setTemplateFormState((current) => ({ ...current, subject: event.target.value }))}
                    />
                    <FormHelperText>
                      Use help-doc tokens such as <code>{"{{sender.name}}"}</code>,{" "}
                      <code>{"{{receiver.name}}"}</code>, and <code>{"{{topic.name}}"}</code>.
                    </FormHelperText>
                  </FormControl>

                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">Header Snippet</FormLabel>
                      <Select
                        value={templateState.headerSnippetKey}
                        onChange={(event) => setTemplateFormState((current) => ({ ...current, headerSnippetKey: event.target.value }))}
                      >
                        <option value="">No header</option>
                        {headerSnippets.map((snippet) => (
                          <option key={snippet.id} value={snippet.snippetKey}>
                            {snippet.draft?.name || snippet.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Footer Snippet</FormLabel>
                      <Select
                        value={templateState.footerSnippetKey}
                        onChange={(event) => setTemplateFormState((current) => ({ ...current, footerSnippetKey: event.target.value }))}
                      >
                        <option value="">No footer</option>
                        {footerSnippets.map((snippet) => (
                          <option key={snippet.id} value={snippet.snippetKey}>
                            {snippet.draft?.name || snippet.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </SimpleGrid>

                  <Heading size="sm" mb={3}>Body</Heading>
                  <EmailTemplateVisualEditor
                    ref={editorRef}
                    initialDesign={templateState.design}
                    minHeight="520px"
                  />

                  <HStack spacing={3} mt={5}>
                    <Button colorScheme="blue" onClick={() => handleTemplateSubmit("save-template-draft")} isLoading={isSaving}>
                      Save Draft
                    </Button>
                    <Button variant="outline" onClick={() => handleTemplateSubmit("publish-template")} isLoading={isSaving}>
                      Publish Draft To Active
                    </Button>
                  </HStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Heading size="sm" mb={3}>Preview</Heading>
                  <Stack spacing={3}>
                    <Box>
                      <Text fontSize="xs" textTransform="uppercase" color="gray.500" mb={1}>Subject</Text>
                      <Text fontSize="sm">{templatePreview.subject || "No subject yet"}</Text>
                    </Box>
                    <Divider />
                    <Box
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      bg="white"
                      px={4}
                      py={4}
                      minH="160px"
                      dangerouslySetInnerHTML={{
                        __html: templatePreview.html || "<p style=\"color:#718096;margin:0;\">Preview will appear after the body is exported on save.</p>"
                      }}
                    />
                  </Stack>
                </CardBody>
              </Card>
            </Stack>
          ) : (
            <Stack spacing={6}>
              <Card>
                <CardBody>
                  <HStack justify="space-between" align="flex-start" mb={4}>
                    <Box>
                      <Heading size="sm">{selectedDocument.draft?.name || selectedDocument.name}</Heading>
                      <Text fontSize="sm" color="gray.500">{selectedDocument.key}</Text>
                    </Box>
                    <HStack spacing={2}>
                      <Badge colorScheme="orange">{selectedDocument.snippetKind}</Badge>
                      <Badge colorScheme="purple">Global Snippet</Badge>
                    </HStack>
                  </HStack>

                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">Snippet Name</FormLabel>
                      <Input
                        value={snippetState.name}
                        onChange={(event) => setSnippetFormState((current) => ({ ...current, name: event.target.value }))}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Snippet Type</FormLabel>
                      <Select
                        value={snippetState.snippetKind}
                        onChange={(event) => setSnippetFormState((current) => ({ ...current, snippetKind: event.target.value }))}
                      >
                        <option value="header">Header</option>
                        <option value="footer">Footer</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>

                  <FormControl mb={4}>
                    <FormLabel fontSize="sm">Description</FormLabel>
                    <Textarea
                      rows={2}
                      value={snippetState.description}
                      onChange={(event) => setSnippetFormState((current) => ({ ...current, description: event.target.value }))}
                    />
                  </FormControl>

                  <FormControl mb={4}>
                    <FormLabel fontSize="sm">Snippet Body</FormLabel>
                    <EmailTemplateVisualEditor
                      ref={snippetEditorRef}
                      initialDesign={snippetState.design}
                      minHeight="420px"
                    />
                    <FormHelperText>
                      Author the header or footer visually, then save draft or publish. Shared replacements such as{" "}
                      <code>{"{{sender.name}}"}</code> still live outside this editor.
                    </FormHelperText>
                  </FormControl>

                  <HStack spacing={3}>
                    <Button colorScheme="blue" onClick={() => handleSnippetSubmit("save-snippet-draft")} isLoading={isSaving}>
                      Save Draft
                    </Button>
                    <Button variant="outline" onClick={() => handleSnippetSubmit("publish-snippet")} isLoading={isSaving}>
                      Publish Draft To Active
                    </Button>
                  </HStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Heading size="sm" mb={3}>Preview</Heading>
                  <Box
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    bg="white"
                    px={4}
                    py={4}
                    minH="160px"
                    dangerouslySetInnerHTML={{
                      __html: snippetState.bodyHtml || snippetState.html || "<p style=\"color:#718096;margin:0;\">Snippet preview will appear after the snippet is exported on save.</p>"
                    }}
                  />
                </CardBody>
              </Card>
            </Stack>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
}
