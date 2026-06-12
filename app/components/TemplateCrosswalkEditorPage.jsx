import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack
} from "@chakra-ui/react";
import { Form } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cloneObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

function buildClientRow(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneSets(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        id: readTrimmedString(row?.id),
        label: readTrimmedString(row?.label),
        description: readTrimmedString(row?.description),
        __extraFields: cloneObject(row?.__extraFields),
        __clientKey: buildClientRow("set")
      }))
    : [];
}

function cloneKeywords(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        id: readTrimmedString(row?.id),
        value: readTrimmedString(row?.value),
        setsText: readTrimmedString(row?.setsText),
        __extraFields: cloneObject(row?.__extraFields),
        __clientKey: buildClientRow("keyword")
      }))
    : [];
}

function cloneTemplates(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        id: readTrimmedString(row?.id),
        label: readTrimmedString(row?.label),
        pattern: readTrimmedString(row?.pattern),
        description: readTrimmedString(row?.description),
        notes: readTrimmedString(row?.notes),
        sectorTargetsText: readTrimmedString(row?.sectorTargetsText),
        industryTargetsText: readTrimmedString(row?.industryTargetsText),
        focusTargetsText: readTrimmedString(row?.focusTargetsText),
        __extraFields: cloneObject(row?.__extraFields),
        __clientKey: buildClientRow("template")
      }))
    : [];
}

function buildEmptySetRow() {
  return {
    id: "",
    label: "",
    description: "",
    __extraFields: {},
    __clientKey: buildClientRow("set")
  };
}

function buildEmptyKeywordRow() {
  return {
    id: "",
    value: "",
    setsText: "",
    __extraFields: {},
    __clientKey: buildClientRow("keyword")
  };
}

function buildEmptyTemplateRow() {
  return {
    id: "",
    label: "",
    pattern: "",
    description: "",
    notes: "",
    sectorTargetsText: "",
    industryTargetsText: "",
    focusTargetsText: "",
    __extraFields: {},
    __clientKey: buildClientRow("template")
  };
}

function stripTransientRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const nextRow = { ...row };
    delete nextRow.__clientKey;
    return nextRow;
  });
}

export function TemplateCrosswalkEditorPage({ data, actionData, isSaving = false }) {
  const [metadata, setMetadata] = useState(() =>
    cloneObject(data.metadata)
  );
  const [description, setDescription] = useState(data.description || "");
  const [compiledTargetNamespace, setCompiledTargetNamespace] = useState(
    data.templateCrosswalk?.compiledTargetNamespace || "crm.data"
  );
  const [compiledTargetKey, setCompiledTargetKey] = useState(
    data.templateCrosswalk?.compiledTargetKey || ""
  );
  const [sets, setSets] = useState(() => cloneSets(data.templateCrosswalk?.sets));
  const [keywords, setKeywords] = useState(() =>
    cloneKeywords(data.templateCrosswalk?.keywords)
  );
  const [templates, setTemplates] = useState(() =>
    cloneTemplates(data.templateCrosswalk?.templates)
  );

  useEffect(() => {
    setMetadata(cloneObject(data.metadata));
    setDescription(data.description || "");
    setCompiledTargetNamespace(
      data.templateCrosswalk?.compiledTargetNamespace || "crm.data"
    );
    setCompiledTargetKey(data.templateCrosswalk?.compiledTargetKey || "");
    setSets(cloneSets(data.templateCrosswalk?.sets));
    setKeywords(cloneKeywords(data.templateCrosswalk?.keywords));
    setTemplates(cloneTemplates(data.templateCrosswalk?.templates));
  }, [
    data.description,
    data.metadata,
    data.templateCrosswalk?.compiledTargetKey,
    data.templateCrosswalk?.compiledTargetNamespace,
    data.templateCrosswalk?.keywords,
    data.templateCrosswalk?.sets,
    data.templateCrosswalk?.templates
  ]);

  const compiledPreviewRows = Array.isArray(data.compiledPreview?.rows)
    ? data.compiledPreview.rows
    : [];
  const compiledPreviewSummary = useMemo(
    () => ({
      rowCount: compiledPreviewRows.length
    }),
    [compiledPreviewRows]
  );

  function updateMetadataName(value) {
    setMetadata((current) => ({
      ...current,
      name: value
    }));
  }

  function updateSetRow(rowKey, field, value) {
    setSets((current) =>
      current.map((row) =>
        row.__clientKey === rowKey ? { ...row, [field]: value } : row
      )
    );
  }

  function updateKeywordRow(rowKey, field, value) {
    setKeywords((current) =>
      current.map((row) =>
        row.__clientKey === rowKey ? { ...row, [field]: value } : row
      )
    );
  }

  function updateTemplateRow(rowKey, field, value) {
    setTemplates((current) =>
      current.map((row) =>
        row.__clientKey === rowKey ? { ...row, [field]: value } : row
      )
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="md">Template Crosswalk</Heading>
        <Text color="gray.600" mt={1}>
          Author reusable sets and templates here. Saving this document publishes the compiled runtime crosswalk.
        </Text>
      </Box>

      {actionData?.error?.message ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>{actionData.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {actionData?.ok ? (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <AlertDescription>
            Saved version {actionData.saved?.version ?? data.version ?? "unknown"}.
          </AlertDescription>
        </Alert>
      ) : null}

      <Form method="post">
        <input type="hidden" name="customDocumentType" value="template-crosswalk" />
        <input type="hidden" name="metadata" value={JSON.stringify(metadata)} />
        <input type="hidden" name="expectedVersion" value={data.version == null ? "" : String(data.version)} />
        <input type="hidden" name="document" value={JSON.stringify(data.document ?? null)} />
        <input type="hidden" name="editor" value={JSON.stringify(data.editor ?? null)} />
        <input type="hidden" name="templateCrosswalkSets" value={JSON.stringify(stripTransientRows(sets))} />
        <input type="hidden" name="templateCrosswalkKeywords" value={JSON.stringify(stripTransientRows(keywords))} />
        <input type="hidden" name="templateCrosswalkTemplates" value={JSON.stringify(stripTransientRows(templates))} />
        <input type="hidden" name="compiledTargetNamespace" value={compiledTargetNamespace} />
        <input type="hidden" name="compiledTargetKey" value={compiledTargetKey} />

        <VStack align="stretch" spacing={6}>
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
            <Heading size="sm" mb={4}>
              Document
            </Heading>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={readTrimmedString(metadata?.name)}
                  onChange={(event) => updateMetadataName(event.target.value)}
                  bg="white"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  name="description"
                  bg="white"
                  minH="96px"
                />
              </FormControl>
            </VStack>
          </Box>

          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
            <Heading size="sm" mb={4}>
              Compiled Target
            </Heading>
            <HStack align="flex-start" spacing={4}>
              <FormControl>
                <FormLabel>Namespace</FormLabel>
                <Input
                  value={compiledTargetNamespace}
                  onChange={(event) => setCompiledTargetNamespace(event.target.value)}
                  bg="white"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Key</FormLabel>
                <Input
                  value={compiledTargetKey}
                  onChange={(event) => setCompiledTargetKey(event.target.value)}
                  bg="white"
                />
                <FormHelperText>The runtime matcher will keep reading this compiled document key.</FormHelperText>
              </FormControl>
            </HStack>
          </Box>

          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
            <HStack justify="space-between" mb={4}>
              <Heading size="sm">Sets</Heading>
              <Button type="button" size="sm" onClick={() => setSets((current) => [...current, buildEmptySetRow()])}>
                Add Set
              </Button>
            </HStack>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Label</Th>
                  <Th>Description</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {sets.map((row) => (
                  <Tr key={row.__clientKey}>
                    <Td>
                      <Input value={row.id} onChange={(event) => updateSetRow(row.__clientKey, "id", event.target.value)} bg="white" />
                    </Td>
                    <Td>
                      <Input value={row.label} onChange={(event) => updateSetRow(row.__clientKey, "label", event.target.value)} bg="white" />
                    </Td>
                    <Td>
                      <Input
                        value={row.description}
                        onChange={(event) => updateSetRow(row.__clientKey, "description", event.target.value)}
                        bg="white"
                      />
                    </Td>
                    <Td textAlign="right">
                      <Button
                        type="button"
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() =>
                          setSets((current) =>
                            current.filter((entry) => entry.__clientKey !== row.__clientKey)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {!sets.length ? <Text color="gray.500" mt={3}>No sets defined yet.</Text> : null}
          </Box>

          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
            <HStack justify="space-between" mb={4}>
              <Heading size="sm">Keywords</Heading>
              <Button type="button" size="sm" onClick={() => setKeywords((current) => [...current, buildEmptyKeywordRow()])}>
                Add Keyword
              </Button>
            </HStack>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Value</Th>
                  <Th>Sets</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {keywords.map((row) => (
                  <Tr key={row.__clientKey}>
                    <Td>
                      <Input value={row.id} onChange={(event) => updateKeywordRow(row.__clientKey, "id", event.target.value)} bg="white" />
                    </Td>
                    <Td>
                      <Input value={row.value} onChange={(event) => updateKeywordRow(row.__clientKey, "value", event.target.value)} bg="white" />
                    </Td>
                    <Td>
                      <Input
                        value={row.setsText}
                        onChange={(event) => updateKeywordRow(row.__clientKey, "setsText", event.target.value)}
                        placeholder="real-estate-assets, office"
                        bg="white"
                      />
                    </Td>
                    <Td textAlign="right">
                      <Button
                        type="button"
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() =>
                          setKeywords((current) =>
                            current.filter((entry) => entry.__clientKey !== row.__clientKey)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {!keywords.length ? <Text color="gray.500" mt={3}>No keywords defined yet.</Text> : null}
          </Box>

          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
            <HStack justify="space-between" mb={4}>
              <Heading size="sm">Templates</Heading>
              <Button type="button" size="sm" onClick={() => setTemplates((current) => [...current, buildEmptyTemplateRow()])}>
                Add Template
              </Button>
            </HStack>
            <Text color="gray.600" fontSize="sm" mb={4}>
              Use {"{set-id}"} tokens inside the pattern. Output textareas accept one {"Name|Score"} entry per line.
            </Text>
            <VStack align="stretch" spacing={5}>
              {templates.map((row) => (
                <Box key={row.__clientKey} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
                  <HStack justify="space-between" align="flex-start" mb={4}>
                    <Heading size="xs">Template</Heading>
                    <Button
                      type="button"
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() =>
                        setTemplates((current) =>
                          current.filter((entry) => entry.__clientKey !== row.__clientKey)
                        )
                      }
                    >
                      Remove
                    </Button>
                  </HStack>
                  <VStack align="stretch" spacing={4}>
                    <HStack align="flex-start" spacing={4}>
                      <FormControl>
                        <FormLabel>ID</FormLabel>
                        <Input value={row.id} onChange={(event) => updateTemplateRow(row.__clientKey, "id", event.target.value)} bg="white" />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Label</FormLabel>
                        <Input value={row.label} onChange={(event) => updateTemplateRow(row.__clientKey, "label", event.target.value)} bg="white" />
                      </FormControl>
                    </HStack>
                    <FormControl>
                      <FormLabel>Pattern</FormLabel>
                      <Input
                        value={row.pattern}
                        onChange={(event) => updateTemplateRow(row.__clientKey, "pattern", event.target.value)}
                        placeholder="management of {real-estate-assets}"
                        bg="white"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Description</FormLabel>
                      <Input
                        value={row.description}
                        onChange={(event) => updateTemplateRow(row.__clientKey, "description", event.target.value)}
                        bg="white"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Sector Outputs</FormLabel>
                      <Textarea
                        value={row.sectorTargetsText}
                        onChange={(event) => updateTemplateRow(row.__clientKey, "sectorTargetsText", event.target.value)}
                        minH="88px"
                        bg="white"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Industry Outputs</FormLabel>
                      <Textarea
                        value={row.industryTargetsText}
                        onChange={(event) => updateTemplateRow(row.__clientKey, "industryTargetsText", event.target.value)}
                        minH="88px"
                        bg="white"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Focus Outputs</FormLabel>
                      <Textarea
                        value={row.focusTargetsText}
                        onChange={(event) => updateTemplateRow(row.__clientKey, "focusTargetsText", event.target.value)}
                        minH="88px"
                        bg="white"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Notes</FormLabel>
                      <Textarea
                        value={row.notes}
                        onChange={(event) => updateTemplateRow(row.__clientKey, "notes", event.target.value)}
                        minH="88px"
                        bg="white"
                      />
                    </FormControl>
                  </VStack>
                </Box>
              ))}
            </VStack>
            {!templates.length ? <Text color="gray.500" mt={3}>No templates defined yet.</Text> : null}
          </Box>

          <HStack justify="flex-end">
            <Button type="submit" colorScheme="blue" isLoading={isSaving}>
              Save
            </Button>
          </HStack>
        </VStack>
      </Form>

      <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
        <Heading size="sm" mb={2}>
          Compiled Preview
        </Heading>
        <Text color="gray.600" fontSize="sm" mb={4}>
          {compiledPreviewSummary.rowCount
            ? `${compiledPreviewSummary.rowCount} compiled row${compiledPreviewSummary.rowCount === 1 ? "" : "s"} are currently active for ${data.compiledPreview?.id || `${compiledTargetNamespace}:${compiledTargetKey}`}.`
            : `No compiled runtime document was found yet for ${data.compiledPreview?.id || `${compiledTargetNamespace}:${compiledTargetKey}`}.`}
        </Text>
        {compiledPreviewRows.length ? (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Regex</Th>
                  <Th>Sector</Th>
                  <Th>Industry</Th>
                  <Th>Focus</Th>
                  <Th>Template</Th>
                  <Th>Expanded Values</Th>
                </Tr>
              </Thead>
              <Tbody>
                {compiledPreviewRows.slice(0, 100).map((row, index) => (
                  <Tr key={row.rowId || `${row.regex}-${index}`}>
                    <Td fontFamily="mono" fontSize="sm">{readTrimmedString(row.regex) || "Not set"}</Td>
                    <Td>{readTrimmedString(row.sector) || "Not set"}</Td>
                    <Td>{readTrimmedString(row.industry) || "Not set"}</Td>
                    <Td>{readTrimmedString(row.focus) || "Not set"}</Td>
                    <Td>{readTrimmedString(row.authoredTemplateId) || "Not set"}</Td>
                    <Td>{Array.isArray(row.expandedValues) && row.expandedValues.length ? row.expandedValues.join(", ") : "Not set"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {compiledPreviewRows.length > 100 ? (
              <Text color="gray.500" fontSize="sm" mt={3}>
                Showing the first 100 compiled rows.
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </VStack>
  );
}
