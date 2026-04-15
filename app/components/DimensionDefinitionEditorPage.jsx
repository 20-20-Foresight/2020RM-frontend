import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Text,
  Textarea,
  VStack
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";
import { useLocation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { InlineSaveStatus } from "./InlineSaveStatus";
import { ToastRichTextEditor } from "./ToastRichTextEditor";
import { useQueuedDocumentSave } from "../hooks/useQueuedDocumentSave";
import { useRowSaveHighlight } from "../hooks/useRowSaveHighlight";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildClientKey() {
  return `dimension-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        id: readTrimmedString(row.id),
        key: readTrimmedString(row.key),
        label: readTrimmedString(row.label),
        description: readTrimmedString(row.description),
        examplesText: readTrimmedString(row.examplesText),
        __extraFields: row && typeof row.__extraFields === "object" && !Array.isArray(row.__extraFields) ? { ...row.__extraFields } : {},
        __clientKey: readTrimmedString(row.__clientKey) || buildClientKey()
      }))
    : [];
}

function buildEmptyRow() {
  return {
    id: "",
    key: "",
    label: "",
    description: "",
    examplesText: "",
    __extraFields: {},
    __clientKey: buildClientKey()
  };
}

function stripTransientFields(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const nextRow = { ...row };
    delete nextRow.__clientKey;
    return nextRow;
  });
}

function DescriptionMarkup({ html = "" }) {
  if (!readTrimmedString(html)) {
    return null;
  }

  return (
    <Box
      color="gray.700"
      sx={{
        p: { marginBottom: "0.75rem" },
        "p:last-of-type": { marginBottom: 0 },
        ul: { paddingLeft: "1.25rem", marginBottom: "0.75rem" },
        ol: { paddingLeft: "1.25rem", marginBottom: "0.75rem" }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function DimensionCard({
  row,
  highlightState,
  isEditing = false,
  draftRow = null,
  onEdit,
  onDraftChange,
  onSave,
  onCancel
}) {
  const cardBackground = isEditing ? "blue.50" : highlightState === "saving" ? "blue.50" : highlightState === "saved" ? "green.50" : "white";
  const borderColor = isEditing ? "blue.200" : highlightState === "saving" ? "blue.200" : highlightState === "saved" ? "green.200" : "gray.200";

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      bg={cardBackground}
      px={{ base: 4, md: 5 }}
      py={{ base: 4, md: 5 }}
      transition="background-color 0.35s ease, border-color 0.35s ease"
      boxShadow="sm"
    >
      {isEditing && draftRow ? (
        <VStack align="stretch" spacing={4}>
          <Flex justify="space-between" align="start" gap={4}>
            <Heading size="sm">{readTrimmedString(draftRow.id) ? "Edit Dimension" : "New Dimension"}</Heading>
          </Flex>

          <FormControl>
            <FormLabel>Name</FormLabel>
            <Input value={draftRow.label} onChange={(event) => onDraftChange?.("label", event.target.value)} bg="white" />
          </FormControl>

          <FormControl>
            <FormLabel>Key</FormLabel>
            <Input value={draftRow.key} onChange={(event) => onDraftChange?.("key", event.target.value)} bg="white" />
          </FormControl>

          <FormControl>
            <FormLabel>Description</FormLabel>
            <ToastRichTextEditor value={draftRow.description} onChange={(value) => onDraftChange?.("description", value)} />
          </FormControl>

          <FormControl>
            <FormLabel>Examples</FormLabel>
            <Textarea
              value={draftRow.examplesText}
              onChange={(event) => onDraftChange?.("examplesText", event.target.value)}
              minH="112px"
              bg="white"
              placeholder="One or more examples"
            />
          </FormControl>

          <HStack justify="flex-end" spacing={3}>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={onSave}>
              Save
            </Button>
          </HStack>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4}>
          <Flex justify="space-between" align="start" gap={4}>
            <Box>
              <Heading size="md">{row.label || row.key || "Untitled Dimension"}</Heading>
            </Box>

            <Button size="sm" leftIcon={<EditIcon />} variant="outline" colorScheme="blue" onClick={onEdit}>
              Edit
            </Button>
          </Flex>

          <Box>
            <Text fontWeight="semibold" color="gray.800" mb={2}>
              Description:
            </Text>
            {readTrimmedString(row.description) ? <DescriptionMarkup html={row.description} /> : <Text color="gray.500">No description</Text>}
          </Box>

          {readTrimmedString(row.examplesText) ? (
            <Box>
              <Text fontWeight="semibold" color="gray.800" mb={2}>
                Examples:
              </Text>
              <Text color="gray.700" whiteSpace="pre-wrap">
                {row.examplesText}
              </Text>
            </Box>
          ) : null}
        </VStack>
      )}
    </Box>
  );
}

export function DimensionDefinitionEditorPage({ data, actionData }) {
  const location = useLocation();
  const [metadata, setMetadata] = useState(() => (data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {}));
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneRows(data.dimensionDefinition.rows));
  const [editingRowKey, setEditingRowKey] = useState("");
  const [draftRow, setDraftRow] = useState(buildEmptyRow);
  const [isDraftNew, setIsDraftNew] = useState(false);
  const {
    saveSummary,
    isSaving: isQueuedSaving,
    savedVisible,
    saveError,
    requestSave
  } = useQueuedDocumentSave({
    pathname: location.pathname,
    initialSummary: data,
    buildFormData(summary) {
      const formData = new FormData();
      formData.set("customDocumentType", "dimension-definition");
      formData.set("description", description);
      formData.set("metadata", JSON.stringify(metadata));
      formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
      formData.set("document", JSON.stringify(data.document ?? null));
      formData.set("dimensionDefinitionRows", JSON.stringify(stripTransientFields(rows)));
      formData.set("editor", JSON.stringify(data.editor ?? null));
      return formData;
    }
  });
  const { rowHighlightStateByKey, markRowsChanged } = useRowSaveHighlight({
    isSaving: isQueuedSaving,
    savedVisible,
    saveErrorMessage: saveError?.message || actionData?.error?.message || null
  });

  useEffect(() => {
    setMetadata(data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {});
    setDescription(data.description || "");
    setRows(cloneRows(data.dimensionDefinition.rows));
    setEditingRowKey("");
    setDraftRow(buildEmptyRow());
    setIsDraftNew(false);
  }, [data.description, data.dimensionDefinition.rows, data.id, data.metadata, data.version]);

  function startEditingRow(rowKey) {
    const matchedRow = rows.find((row) => row.__clientKey === rowKey);
    if (!matchedRow) {
      return;
    }

    setEditingRowKey(rowKey);
    setDraftRow(cloneRows([matchedRow])[0] || buildEmptyRow());
    setIsDraftNew(false);
  }

  function startAddingRow() {
    const nextDraft = buildEmptyRow();
    setEditingRowKey(nextDraft.__clientKey);
    setDraftRow(nextDraft);
    setIsDraftNew(true);
  }

  function closeEditor() {
    setEditingRowKey("");
    setDraftRow(buildEmptyRow());
    setIsDraftNew(false);
  }

  /**
   * Builds one background save payload for the current editor state.
   * @param {{
   *   summary: {version: number|null},
   *   nextRows?: unknown[],
   *   nextDescription?: string,
   *   nextMetadata?: Record<string, unknown>
   * }} options
   * @returns {FormData}
   */
  function buildSaveFormData({ summary, nextRows = rows, nextDescription = description, nextMetadata = metadata }) {
    const formData = new FormData();
    formData.set("customDocumentType", "dimension-definition");
    formData.set("description", nextDescription);
    formData.set("metadata", JSON.stringify(nextMetadata));
    formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
    formData.set("document", JSON.stringify(data.document ?? null));
    formData.set("dimensionDefinitionRows", JSON.stringify(stripTransientFields(nextRows)));
    formData.set("editor", JSON.stringify(data.editor ?? null));
    return formData;
  }

  function saveDraftRow() {
    const nextRow = cloneRows([draftRow])[0];
    const nextRows = isDraftNew ? [nextRow, ...rows] : rows.map((row) => (row.__clientKey === editingRowKey ? nextRow : row));

    setRows(nextRows);
    markRowsChanged([nextRow.__clientKey]);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
    closeEditor();
  }

  function updateDraftField(field, value) {
    setDraftRow((currentRow) => ({
      ...currentRow,
      [field]: value
    }));
  }

  const displayName = readTrimmedString(metadata?.name) || data.name;

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="md">{displayName}</Heading>
            <InlineSaveStatus
              isSaving={isQueuedSaving}
              savedVisible={savedVisible}
              lastmodifieddate={saveSummary.lastmodifieddate || data.lastmodifieddate}
              lastmodifiedby={saveSummary.lastmodifiedby || data.lastmodifiedby}
            />
          </Box>
        </Flex>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" display="flex" flexDirection="column">
        {saveError?.message || actionData?.error?.message ? (
          <Alert status="error" borderRadius="md" mb={4}>
            <AlertIcon />
            <AlertDescription>{saveError?.message || actionData.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0
          }}
        >
          <VStack align="stretch" spacing={4} h="100%" minH="0">
            <Flex justify="flex-end" align={{ base: "stretch", xl: "end" }} gap={4} wrap="wrap">
              <HStack spacing={3}>
                <Button type="button" colorScheme="blue" onClick={startAddingRow} isDisabled={Boolean(editingRowKey)}>
                  Add Dimension
                </Button>
              </HStack>
            </Flex>

            <VStack align="stretch" spacing={4} overflow="auto" pb={1}>
              {isDraftNew ? (
                <DimensionCard
                  row={draftRow}
                  draftRow={draftRow}
                  isEditing
                  onDraftChange={updateDraftField}
                  onSave={saveDraftRow}
                  onCancel={closeEditor}
                />
              ) : null}

              {rows.length ? (
                rows.map((row) => {
                  const isEditingRow = !isDraftNew && editingRowKey === row.__clientKey;
                  return (
                    <DimensionCard
                      key={row.__clientKey}
                      row={row}
                      draftRow={isEditingRow ? draftRow : null}
                      highlightState={rowHighlightStateByKey[row.__clientKey]}
                      isEditing={isEditingRow}
                      onEdit={() => startEditingRow(row.__clientKey)}
                      onDraftChange={updateDraftField}
                      onSave={saveDraftRow}
                      onCancel={closeEditor}
                    />
                  );
                })
              ) : (
                <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={5} py={6} bg="white">
                  <Text color="gray.500">No dimensions are defined yet.</Text>
                </Box>
              )}
            </VStack>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}
