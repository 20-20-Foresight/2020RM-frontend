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
  Select,
  Switch,
  Text,
  Textarea,
  VStack
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";
import { useLocation } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { InlineSaveStatus } from "./InlineSaveStatus";
import { useQueuedDocumentSave } from "../hooks/useQueuedDocumentSave";
import { useRowSaveHighlight } from "../hooks/useRowSaveHighlight";
import { CategoryEditorCard } from "./ui/organisms/CategoryEditorCard";
import { applyLockedDimensionId, resolveLockedDimensionId } from "../models/category-editor-page.mjs";

/**
 * Reads a trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Builds one stable transient key for client-only row state.
 * @returns {string}
 */
function buildClientKey() {
  return `category-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Clones category rows into local editor state.
 * @param {unknown[]} rows
 * @returns {Array<{
 *   id: string,
 *   label: string,
 *   description: string,
 *   examplesText: string,
 *   dimensionId: string,
 *   preference: number|null,
 *   deletedOn: string,
 *   __extraFields: Record<string, unknown>,
 *   __clientKey: string
 * }>}
 */
function cloneRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        id: readTrimmedString(row?.id),
        label: readTrimmedString(row?.label),
        description: readTrimmedString(row?.description),
        examplesText: readTrimmedString(row?.examplesText),
        dimensionId: readTrimmedString(row?.dimensionId),
        preference: Number.isFinite(Number(row?.preference)) ? Number(row.preference) : null,
        deletedOn: readTrimmedString(row?.deletedOn),
        __extraFields: row && typeof row.__extraFields === "object" && !Array.isArray(row.__extraFields) ? { ...row.__extraFields } : {},
        __clientKey: readTrimmedString(row?.__clientKey) || buildClientKey()
      }))
    : [];
}

/**
 * Builds one empty category draft row.
 * @param {string} [defaultDimensionId]
 * @returns {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   examplesText: string,
 *   dimensionId: string,
 *   preference: number|null,
 *   deletedOn: string,
 *   __extraFields: Record<string, unknown>,
 *   __clientKey: string
 * }}
 */
function buildEmptyRow(defaultDimensionId = "") {
  return {
    id: "",
    label: "",
    description: "",
    examplesText: "",
    dimensionId: defaultDimensionId,
    preference: null,
    deletedOn: "",
    __extraFields: {},
    __clientKey: buildClientKey()
  };
}

/**
 * Removes transient client-only properties before save.
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
function stripTransientFields(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const nextRow = { ...row };
    delete nextRow.__clientKey;
    return nextRow;
  });
}

/**
 * Returns whether one category row is retired.
 * @param {{deletedOn?: string}} row
 * @returns {boolean}
 */
function isRetiredRow(row) {
  return Boolean(readTrimmedString(row?.deletedOn));
}

/**
 * Renders the category document editor with inline card editing.
 * @param {{
 *   data: {
 *     id: string,
 *     name: string,
 *     description?: string,
 *     metadata?: Record<string, unknown>,
 *     version?: number|null,
 *     document?: unknown,
 *     editor?: unknown,
 *     lastmodifieddate?: string|null,
 *     lastmodifiedby?: string|null,
 *     categoryEditor: {rows: unknown[], supportsPreference?: boolean},
 *     dimensionCatalog?: Array<{id: string, label: string}>
 *   },
 *   actionData?: {error?: {message?: string}}|null
 * }} props
 * @returns {JSX.Element}
 */
export function CategoryEditorPage({ data, actionData }) {
  const location = useLocation();
  const [metadata, setMetadata] = useState(() => (data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {}));
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneRows(data.categoryEditor?.rows));
  const [showRetired, setShowRetired] = useState(false);
  const [editingRowKey, setEditingRowKey] = useState("");
  const [draftRow, setDraftRow] = useState(null);
  const [isDraftNew, setIsDraftNew] = useState(false);
  const documentIdRef = useRef(readTrimmedString(data.id));
  const lockedDimensionId = useMemo(
    () =>
      resolveLockedDimensionId({
        documentName: data.name,
        metadataName: data.metadata?.name,
        dimensionCatalog: data.dimensionCatalog
      }),
    [data.dimensionCatalog, data.metadata?.name, data.name]
  );
  const defaultDimensionIdRef = useRef(lockedDimensionId || readTrimmedString(data.dimensionCatalog?.[0]?.id));
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
      formData.set("customDocumentType", "categories");
      formData.set("description", description);
      formData.set("metadata", JSON.stringify(metadata));
      formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
      formData.set("document", JSON.stringify(data.document ?? null));
      formData.set("editor", JSON.stringify(data.editor ?? null));
      formData.set("supportsPreference", data.categoryEditor?.supportsPreference ? "true" : "false");
      formData.set("categoryRows", JSON.stringify(stripTransientFields(rows)));
      return formData;
    }
  });
  const { rowHighlightStateByKey, markRowsChanged } = useRowSaveHighlight({
    isSaving: isQueuedSaving,
    savedVisible,
    saveErrorMessage: saveError?.message || actionData?.error?.message || null
  });

  useEffect(() => {
    defaultDimensionIdRef.current = lockedDimensionId || readTrimmedString(data.dimensionCatalog?.[0]?.id);
  }, [data.dimensionCatalog, lockedDimensionId]);

  useEffect(() => {
    const nextDocumentId = readTrimmedString(data.id);
    if (documentIdRef.current === nextDocumentId) {
      return;
    }

    documentIdRef.current = nextDocumentId;
    setMetadata(data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {});
    setDescription(data.description || "");
    setRows(cloneRows(data.categoryEditor?.rows));
    setEditingRowKey("");
    setDraftRow(null);
    setIsDraftNew(false);
  }, [data.categoryEditor?.rows, data.description, data.id, data.metadata]);

  const dimensionOptions = useMemo(
    () =>
      Array.isArray(data.dimensionCatalog)
        ? data.dimensionCatalog
            .map((row) => ({
              id: readTrimmedString(row?.id),
              label: readTrimmedString(row?.label)
            }))
            .filter((row) => row.id && row.label)
        : [],
    [data.dimensionCatalog]
  );

  const dimensionNameById = useMemo(
    () => new Map(dimensionOptions.map((row) => [row.id, row.label])),
    [dimensionOptions]
  );

  const visibleRows = showRetired ? rows : rows.filter((row) => !isRetiredRow(row));
  const displayName = readTrimmedString(metadata?.name) || data.name;

  /**
   * Builds one background save payload from a future row state.
   * @param {{summary: {version: number|null}, nextRows?: unknown[], nextDescription?: string, nextMetadata?: Record<string, unknown>}} options
   * @returns {FormData}
   */
  function buildSaveFormData({ summary, nextRows = rows, nextDescription = description, nextMetadata = metadata }) {
    const formData = new FormData();
    formData.set("customDocumentType", "categories");
    formData.set("description", nextDescription);
    formData.set("metadata", JSON.stringify(nextMetadata));
    formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
    formData.set("document", JSON.stringify(data.document ?? null));
    formData.set("editor", JSON.stringify(data.editor ?? null));
    formData.set("supportsPreference", data.categoryEditor?.supportsPreference ? "true" : "false");
    formData.set("categoryRows", JSON.stringify(stripTransientFields(nextRows)));
    return formData;
  }

  /**
   * Opens one existing row for inline editing.
   * @param {string} rowKey
   */
  function startEditingRow(rowKey) {
    const matchedRow = rows.find((row) => row.__clientKey === rowKey);
    if (!matchedRow) {
      return;
    }

    setEditingRowKey(rowKey);
    setDraftRow(applyLockedDimensionId(cloneRows([matchedRow])[0] || buildEmptyRow(defaultDimensionIdRef.current), lockedDimensionId));
    setIsDraftNew(false);
  }

  /**
   * Opens one unsaved row at the top of the list.
   */
  function startAddingRow() {
    const nextDraft = applyLockedDimensionId(buildEmptyRow(defaultDimensionIdRef.current), lockedDimensionId);
    setEditingRowKey(nextDraft.__clientKey);
    setDraftRow(nextDraft);
    setIsDraftNew(true);
  }

  /**
   * Closes the active inline editor.
   */
  function cancelEditing() {
    setEditingRowKey("");
    setDraftRow(null);
    setIsDraftNew(false);
  }

  /**
   * Updates one draft field.
   * @param {string} field
   * @param {string|number|null} value
   */
  function updateDraftField(field, value) {
    setDraftRow((currentValue) => (currentValue ? { ...currentValue, [field]: value } : currentValue));
  }

  /**
   * Saves the current inline draft.
   */
  function saveDraftRow() {
    if (!draftRow) {
      return;
    }

    const nextRow = applyLockedDimensionId(cloneRows([draftRow])[0], lockedDimensionId);
    const nextRows = isDraftNew
      ? [nextRow, ...rows]
      : rows.map((row) => (row.__clientKey === editingRowKey ? nextRow : row));

    setRows(nextRows);
    markRowsChanged([nextRow.__clientKey]);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
    cancelEditing();
  }

  /**
   * Toggles the active state of one row and persists the change immediately.
   * @param {string} rowKey
   */
  function toggleRowRetired(rowKey) {
    const nextRows = rows.map((row) => {
      if (row.__clientKey !== rowKey) {
        return row;
      }

      return {
        ...row,
        deletedOn: isRetiredRow(row) ? "" : new Date().toISOString()
      };
    });

    setRows(nextRows);
    markRowsChanged([rowKey]);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );

    if (editingRowKey === rowKey && draftRow) {
      setDraftRow((currentValue) =>
        currentValue
          ? {
              ...currentValue,
              deletedOn: isRetiredRow(currentValue) ? "" : new Date().toISOString()
            }
          : currentValue
      );
    }
  }

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

        <VStack align="stretch" spacing={4} flex="1" minH="0">
          <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap={4} wrap="wrap">
            <HStack spacing={3}>
              <Switch isChecked={showRetired} onChange={(event) => setShowRetired(event.target.checked)} />
              <Text color="gray.600">Show retired</Text>
            </HStack>

            <Button colorScheme="blue" onClick={startAddingRow} isDisabled={Boolean(editingRowKey)}>
              Add Category
            </Button>
          </Flex>

          <VStack align="stretch" spacing={4} overflow="auto" pb={1}>
            {isDraftNew && draftRow ? (
              <CategoryEditorCard
                title={draftRow.label}
                draftRow={draftRow}
                isEditing
                supportsPreference={Boolean(data.categoryEditor?.supportsPreference)}
                dimensionOptions={dimensionOptions}
                showDimensionField={!lockedDimensionId}
                onDraftChange={updateDraftField}
                onSave={saveDraftRow}
                onCancel={cancelEditing}
              />
            ) : null}

            {visibleRows.length ? (
              visibleRows.map((row) => {
                const isEditing = !isDraftNew && editingRowKey === row.__clientKey && draftRow;
                return (
                  <CategoryEditorCard
                    key={row.__clientKey}
                    title={row.label}
                    draftRow={isEditing ? draftRow : null}
                    retired={isRetiredRow(row)}
                    dimensionName={dimensionNameById.get(row.dimensionId) || ""}
                    descriptionHtml={row.description}
                    examplesText={row.examplesText}
                    dimensionOptions={dimensionOptions}
                    showDimensionField={!lockedDimensionId}
                    highlightState={rowHighlightStateByKey[row.__clientKey]}
                    isEditing={Boolean(isEditing)}
                    supportsPreference={Boolean(data.categoryEditor?.supportsPreference)}
                    onEdit={() => startEditingRow(row.__clientKey)}
                    onDraftChange={updateDraftField}
                    onSave={saveDraftRow}
                    onCancel={cancelEditing}
                    onToggleRetired={() => toggleRowRetired(isEditing ? draftRow.__clientKey : row.__clientKey)}
                  />
                );
              })
            ) : (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={5} py={6} bg="white">
                <Text color="gray.500">No categories are defined yet.</Text>
              </Box>
            )}
          </VStack>
        </VStack>
      </Box>
    </Box>
  );
}
