import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Tag,
  TagCloseButton,
  TagLabel,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  VStack
} from "@chakra-ui/react";
import { EditIcon, SearchIcon } from "@chakra-ui/icons";
import { useLocation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { MdDescription } from "react-icons/md";
import {
  applyBulkRemap,
  buildTaxonomyOptions,
  readDisplayValue,
  readRowTaxonomyWarnings,
  rowMatchesFilters
} from "../models/segmentation-default-page.mjs";
import { buildSegmentationDefaultSubmitFormData } from "../models/segmentation-default-submit.mjs";
import { InlineSaveStatus } from "./InlineSaveStatus";
import { useQueuedDocumentSave } from "../hooks/useQueuedDocumentSave";
import { useRowSaveHighlight } from "../hooks/useRowSaveHighlight";

/**
 * Returns whether a value is a plain object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads a trimmed string with an empty fallback.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

/**
 * Clones one scored target list into mutable state.
 * @param {unknown} value
 * @returns {Array<{name: string, score: string}>}
 */
function cloneTargetRows(value) {
  const entries = Array.isArray(value) ? value : [];
  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const name = readTrimmedString(entry.name);
      const score = entry.score == null ? "" : String(entry.score).trim();
      if (!name && !score) {
        return null;
      }

      return {
        name,
        score
      };
    })
    .filter(Boolean);
}

/**
 * Builds one empty scored target row.
 * @returns {{name: string, score: string}}
 */
function buildEmptyTargetRow() {
  return {
    name: "",
    score: "3"
  };
}

/**
 * Returns whether one row is missing both Industry and Focus outputs.
 * @param {{industryTargets?: Array<{name?: string}>, focusTargets?: Array<{name?: string}>}} row
 * @returns {boolean}
 */
function isIncompleteRow(row) {
  const hasIndustry = cloneTargetRows(row?.industryTargets).some((target) => readTrimmedString(target.name));
  const hasFocus = cloneTargetRows(row?.focusTargets).some((target) => readTrimmedString(target.name));
  return !hasIndustry && !hasFocus;
}

/**
 * Clones one editable row list into mutable state.
 * @param {Array<{
 *   categories?: string[],
 *   description?: string,
 *   sector?: string,
 *   industry?: string,
 *   focus?: string,
 *   industryTargets?: Array<{name?: string, score?: string|number}>,
 *   focusTargets?: Array<{name?: string, score?: string|number}>,
 *   rowId?: string,
 *   notes?: string,
 *   __branchFieldNames?: string[],
 *   __extraLeafFields?: Record<string, unknown>
 * }>} rows
 * @param {number} categoryDepth
 * @returns {Array<{
 *   categories: string[],
 *   description: string,
 *   sector: string,
 *   industry: string,
 *   focus: string,
 *   industryTargets: Array<{name: string, score: string}>,
 *   focusTargets: Array<{name: string, score: string}>,
 *   rowId: string,
 *   notes: string,
 *   __branchFieldNames: string[],
 *   __extraLeafFields: Record<string, unknown>
 * }>}
 */
function cloneSegmentationRows(rows, categoryDepth) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        categories: Array.from({ length: categoryDepth }, (_, index) => readTrimmedString(row.categories?.[index])),
        description: readTrimmedString(row.description),
        sector: readTrimmedString(row.sector),
        industry: readTrimmedString(row.industry),
        focus: readTrimmedString(row.focus),
        industryTargets: cloneTargetRows(row.industryTargets),
        focusTargets: cloneTargetRows(row.focusTargets),
        rowId: readTrimmedString(row.rowId),
        notes: readTrimmedString(row.notes),
        __branchFieldNames: Array.isArray(row.__branchFieldNames) ? row.__branchFieldNames.map((value) => readTrimmedString(value)) : [],
        __extraLeafFields: isPlainObject(row.__extraLeafFields) ? { ...row.__extraLeafFields } : {}
      }))
    : [];
}

/**
 * Builds an empty editable row for the current category depth.
 * @param {number} categoryDepth
 * @param {string[]} [branchFieldNames]
 * @returns {{
 *   categories: string[],
 *   description: string,
 *   sector: string,
 *   industry: string,
 *   focus: string,
 *   industryTargets: Array<{name: string, score: string}>,
 *   focusTargets: Array<{name: string, score: string}>,
 *   rowId: string,
 *   notes: string,
 *   __branchFieldNames: string[],
 *   __extraLeafFields: Record<string, unknown>
 * }}
 */
function buildEmptySegmentationRow(categoryDepth, branchFieldNames = []) {
  return {
    categories: Array.from({ length: categoryDepth }, () => ""),
    description: "",
    sector: "",
    industry: "",
    focus: "",
    industryTargets: [],
    focusTargets: [],
    rowId: "",
    notes: "",
    __branchFieldNames: Array.isArray(branchFieldNames) ? branchFieldNames.slice(0, categoryDepth) : [],
    __extraLeafFields: {}
  };
}

/**
 * Builds one empty bulk-remap draft.
 * @returns {{dimension: "industry"|"focus", findValue: string, replaceValue: string, scope: "both"|"primary"|"targets"}}
 */
function buildEmptyBulkRemapDraft() {
  return {
    dimension: "industry",
    findValue: "",
    replaceValue: "",
    scope: "both"
  };
}

/**
 * Builds one normalized column key for category filters.
 * @param {number} index
 * @returns {string}
 */
function buildCategoryFilterKey(index) {
  return `category-${index}`;
}

/**
 * Renders one compact search toggle and control.
 * @param {{
 *   columnKey: string,
 *   label: string,
 *   isOpen: boolean,
 *   activeValue: string,
 *   draftValue?: string,
 *   onToggle: () => void,
 *   onDraftChange: (value: string) => void,
 *   onApply: (value?: string) => void,
 *   onClear: () => void,
 *   selectOptions?: string[]|null,
 *   disabled?: boolean
 * }} props
 * @returns {JSX.Element}
 */
function SearchableHeader({
  columnKey,
  label,
  isOpen,
  activeValue,
  draftValue = "",
  onToggle,
  onDraftChange,
  onApply,
  onClear,
  selectOptions = null,
  disabled = false
}) {
  return (
    <VStack align="stretch" spacing={2}>
      <HStack spacing={2} align="center">
        <Text>{label}</Text>
        {disabled || activeValue ? null : (
          <IconButton
            aria-label={`Search ${columnKey}`}
            icon={<SearchIcon />}
            size="xs"
            type="button"
            variant={isOpen ? "solid" : "ghost"}
            colorScheme={isOpen ? "blue" : "gray"}
            onClick={onToggle}
          />
        )}
      </HStack>
      {activeValue ? (
        <Tag size="sm" colorScheme="blue" alignSelf="flex-start" maxW="100%">
          <TagLabel overflow="hidden" textOverflow="ellipsis">
            {activeValue}
          </TagLabel>
          <TagCloseButton onClick={onClear} />
        </Tag>
      ) : isOpen ? (
        Array.isArray(selectOptions) ? (
          <Select
            size="xs"
            value={draftValue}
            onChange={(event) => {
              onDraftChange(event.target.value);
              onApply(event.target.value);
            }}
            bg="white"
          >
            <option value="">All</option>
            {selectOptions.map((option) => (
              <option key={`${columnKey}-${option}`} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            size="xs"
            value={draftValue}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={onApply}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onApply();
              }
            }}
            bg="white"
            autoFocus
          />
        )
      ) : null}
    </VStack>
  );
}

/**
 * Renders the segmentation.default admin-data editor.
 * @param {{
 *   data: {
 *     id: string|null,
 *     name: string,
 *     description: string,
 *     version: number|null,
 *     lastmodifieddate: string|null,
 *     lastmodifiedby: string|null,
 *     metadata?: Record<string, string|number|boolean>,
 *     document: unknown,
 *     editorType: string,
 *     segmentationDefault: {
 *       structure: string,
 *       categoryColumns: string[],
 *       categoryFieldNames?: string[],
 *       rows: Array<{
 *         categories: string[],
 *         description: string,
 *         sector: string,
 *         industry: string,
 *         focus: string,
 *         notes: string,
 *         __branchFieldNames: string[],
 *         __extraLeafFields: Record<string, unknown>
 *       }>
 *     },
 *     categoryCatalog?: {industryOptions?: string[], focusOptions?: string[]}|null
 *   },
 *   actionData?: {ok?: boolean, error?: {message?: string}|null, saved?: {version?: number|null}|null}|undefined,
 *   isSaving?: boolean
 * }} props
 * @returns {JSX.Element}
 */
export function SegmentationDefaultEditorPage({ data, actionData, isSaving = false }) {
  const location = useLocation();
  const categoryDepth = data.segmentationDefault.categoryColumns.length;
  const defaultBranchFieldNames = Array.isArray(data.segmentationDefault.categoryFieldNames)
    ? data.segmentationDefault.categoryFieldNames
    : [];
  const valueColumns = Array.isArray(data.segmentationDefault.valueColumns) ? data.segmentationDefault.valueColumns : [];
  const [metadata, setMetadata] = useState(() => (isPlainObject(data.metadata) ? { ...data.metadata } : {}));
  const [description, setDescription] = useState(data.description || "");
  const [editorConfig, setEditorConfig] = useState(() =>
    isPlainObject(data.editor)
      ? { ...data.editor }
      : data.editorType
        ? {
            type: data.editorType
          }
        : {}
  );
  const [rows, setRows] = useState(() => cloneSegmentationRows(data.segmentationDefault.rows, categoryDepth));
  const [filters, setFilters] = useState({});
  const [draftFilters, setDraftFilters] = useState({});
  const [openFilterKeys, setOpenFilterKeys] = useState({});
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [draftRow, setDraftRow] = useState(() => buildEmptySegmentationRow(categoryDepth, defaultBranchFieldNames));
  const [bulkRemapDraft, setBulkRemapDraft] = useState(() => buildEmptyBulkRemapDraft());
  const {
    isOpen: isRowModalOpen,
    onOpen: openRowModal,
    onClose: closeRowModal
  } = useDisclosure();
  const {
    isOpen: isMetadataModalOpen,
    onOpen: openMetadataModal,
    onClose: closeMetadataModal
  } = useDisclosure();
  const {
    isOpen: isBulkRemapModalOpen,
    onOpen: openBulkRemapModal,
    onClose: closeBulkRemapModal
  } = useDisclosure();
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
      return buildSegmentationDefaultSubmitFormData({
        data: {
          ...data,
          version: summary.version,
          document: data.document ?? null,
          segmentationDefault: {
            ...data.segmentationDefault,
            rows
          }
        },
        description,
        metadata,
        editorConfig,
        rows
      });
    }
  });
  const { rowHighlightStateByKey, markRowsChanged } = useRowSaveHighlight({
    isSaving: isQueuedSaving,
    savedVisible,
    saveErrorMessage: saveError?.message || actionData?.error?.message || null
  });
  const voidRowBg = "gray.50";
  const warningRowBg = "orange.50";

  useEffect(() => {
    setMetadata(isPlainObject(data.metadata) ? { ...data.metadata } : {});
    setDescription(data.description || "");
    setEditorConfig(
      isPlainObject(data.editor)
        ? { ...data.editor }
        : data.editorType
          ? {
              type: data.editorType
            }
          : {}
    );
    setRows(cloneSegmentationRows(data.segmentationDefault.rows, categoryDepth));
    setFilters({});
    setDraftFilters({});
    setOpenFilterKeys({});
    setBulkRemapDraft(buildEmptyBulkRemapDraft());
  }, [categoryDepth, data.description, data.editorType, data.id, data.version]);

  const taxonomyOptions = buildTaxonomyOptions(data.categoryCatalog, rows);
  const filteredRows = rows.filter((row) => rowMatchesFilters(row, filters, taxonomyOptions));
  const bulkRemapPreview = applyBulkRemap(rows, bulkRemapDraft);

  /**
   * Builds one queued-save payload for the current editor state.
   * @param {{
   *   summary: {version: number|null},
   *   nextDescription?: string,
   *   nextMetadata?: Record<string, unknown>,
   *   nextEditorConfig?: Record<string, unknown>,
   *   nextRows?: unknown[]
   * }} [overrides]
   * @returns {FormData}
   */
  function buildSaveFormData({
    summary,
    nextDescription = description,
    nextMetadata = metadata,
    nextEditorConfig = editorConfig,
    nextRows = rows
  }) {
    return buildSegmentationDefaultSubmitFormData({
      data: {
        ...data,
        version: summary.version,
        document: data.document ?? null,
        segmentationDefault: {
          ...data.segmentationDefault,
          rows: nextRows
        }
      },
      description: nextDescription,
      metadata: nextMetadata,
      editorConfig: nextEditorConfig,
      rows: nextRows
    });
  }
  /**
   * Opens the row modal for the requested row index.
   * @param {number|null} rowIndex
   */
  function openRowEditor(rowIndex) {
    setEditingRowIndex(rowIndex);
    setDraftRow(
      rowIndex == null
        ? buildEmptySegmentationRow(categoryDepth, defaultBranchFieldNames)
        : cloneSegmentationRows([rows[rowIndex]], categoryDepth)[0] || buildEmptySegmentationRow(categoryDepth, defaultBranchFieldNames)
    );
    openRowModal();
  }

  /**
   * Closes the row modal and resets draft state.
   */
  function closeRowEditor() {
    setEditingRowIndex(null);
    setDraftRow(buildEmptySegmentationRow(categoryDepth, defaultBranchFieldNames));
    closeRowModal();
  }

  /**
   * Saves the current draft row back into table state.
   */
  function saveDraftRow() {
    const normalizedDraftRow = cloneSegmentationRows([draftRow], categoryDepth)[0];
    const primaryIndustry = readTrimmedString(normalizedDraftRow.industryTargets?.[0]?.name);
    const primaryFocus = readTrimmedString(normalizedDraftRow.focusTargets?.[0]?.name);
    normalizedDraftRow.industry = primaryIndustry || normalizedDraftRow.industry;
    normalizedDraftRow.focus = primaryFocus || normalizedDraftRow.focus;

    const nextRows =
      editingRowIndex == null
        ? [...rows, normalizedDraftRow]
        : rows.map((row, index) => (index === editingRowIndex ? normalizedDraftRow : row));

    setRows(nextRows);
    markRowsChanged([editingRowIndex == null ? nextRows.length - 1 : editingRowIndex]);
    closeRowEditor();
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
  }

  /**
   * Deletes the currently selected draft row.
   */
  function deleteDraftRow() {
    if (editingRowIndex == null) {
      closeRowEditor();
      return;
    }

    const nextRows = rows.filter((_, index) => index !== editingRowIndex);
    setRows(nextRows);
    closeRowEditor();
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
  }

  /**
   * Updates one category cell inside the draft row.
   * @param {number} index
   * @param {string} value
   */
  function updateDraftCategory(index, value) {
    setDraftRow((currentRow) => ({
      ...currentRow,
      categories: currentRow.categories.map((category, categoryIndex) => (categoryIndex === index ? value : category))
    }));
  }

  /**
   * Updates one segmentation field on the draft row.
   * @param {"description"|"sector"|"industry"|"focus"|"notes"} field
   * @param {string} value
   */
  function updateDraftField(field, value) {
    setDraftRow((currentRow) => ({
      ...currentRow,
      [field]: value
    }));
  }

  /**
   * Updates one scored target row on the current draft.
   * @param {"industryTargets"|"focusTargets"} field
   * @param {number} index
   * @param {"name"|"score"} key
   * @param {string} value
   */
  function updateDraftTarget(field, index, key, value) {
    setDraftRow((currentRow) => ({
      ...currentRow,
      [field]: (Array.isArray(currentRow[field]) ? currentRow[field] : []).map((target, targetIndex) =>
        targetIndex === index
          ? {
              ...target,
              [key]: value
            }
          : target
      )
    }));
  }

  /**
   * Appends one scored target row to the draft.
   * @param {"industryTargets"|"focusTargets"} field
   */
  function addDraftTarget(field) {
    setDraftRow((currentRow) => ({
      ...currentRow,
      [field]: [...(Array.isArray(currentRow[field]) ? currentRow[field] : []), buildEmptyTargetRow()]
    }));
  }

  /**
   * Removes one scored target row from the draft.
   * @param {"industryTargets"|"focusTargets"} field
   * @param {number} index
   */
  function removeDraftTarget(field, index) {
    setDraftRow((currentRow) => ({
      ...currentRow,
      [field]: (Array.isArray(currentRow[field]) ? currentRow[field] : []).filter((_, targetIndex) => targetIndex !== index)
    }));
  }

  /**
   * Toggles one column filter control.
   * @param {string} key
   */
  function toggleFilter(key) {
    setOpenFilterKeys((currentKeys) => ({
      ...currentKeys,
      [key]: !currentKeys[key]
    }));
  }

  /**
   * Sets one column filter value.
   * @param {string} key
   * @param {string} value
   */
  function updateDraftFilter(key, value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value
    }));
  }

  /**
   * Applies one pending filter value and closes its editor.
   * @param {string} key
   * @param {string} [explicitValue]
   */
  function applyFilter(key, explicitValue) {
    const nextValue = readTrimmedString(typeof explicitValue === "string" ? explicitValue : draftFilters[key]);

    setFilters((currentFilters) => {
      if (!nextValue) {
        const nextFilters = { ...currentFilters };
        delete nextFilters[key];
        return nextFilters;
      }

      return {
        ...currentFilters,
        [key]: nextValue
      };
    });

    setOpenFilterKeys((currentKeys) => ({
      ...currentKeys,
      [key]: false
    }));
  }

  /**
   * Clears one active filter.
   * @param {string} key
   */
  function clearFilter(key) {
    setFilters((currentFilters) => {
      const nextFilters = { ...currentFilters };
      delete nextFilters[key];
      return nextFilters;
    });

    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [key]: ""
    }));
  }

  /**
   * Updates one editor metadata value.
   * @param {string} key
   * @param {string} value
   */
  function updateEditorConfig(key, value) {
    setEditorConfig((currentConfig) => ({
      ...(isPlainObject(currentConfig) ? currentConfig : {}),
      [key]: value
    }));
  }

  /**
   * Updates one saved metadata field.
   * @param {string} key
   * @param {string} value
   */
  function updateMetadata(key, value) {
    setMetadata((currentMetadata) => ({
      ...(isPlainObject(currentMetadata) ? currentMetadata : {}),
      [key]: value
    }));
  }

  /**
   * Persists metadata edits and closes the metadata modal.
   */
  function saveMetadataChanges() {
    requestSave((summary) =>
      buildSaveFormData({
        summary
      })
    );
    closeMetadataModal();
  }

  /**
   * Updates one bulk-remap field.
   * @param {"dimension"|"findValue"|"replaceValue"|"scope"} key
   * @param {string} value
   */
  function updateBulkRemapDraft(key, value) {
    setBulkRemapDraft((currentValue) => ({
      ...currentValue,
      [key]: value
    }));
  }

  /**
   * Applies the current bulk remap across the document and queues one save.
   */
  function saveBulkRemapChanges() {
    const result = applyBulkRemap(rows, bulkRemapDraft);
    if (!result.changedRowCount) {
      return;
    }

    setRows(result.rows);
    markRowsChanged(result.changedRowIndexes);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows: result.rows
      })
    );
    setBulkRemapDraft(buildEmptyBulkRemapDraft());
    closeBulkRemapModal();
  }

  const displayDescription = readTrimmedString(description);
  const displayName = readTrimmedString(metadata?.name) || data.name;
  const editorTypeLabel = readTrimmedString(editorConfig?.type) || data.editorType || "segmentation.default";

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
          <HStack spacing={3} align="center" flexWrap="wrap">
            <Button type="button" variant="link" size="sm" colorScheme="blue" onClick={openMetadataModal}>
              edit metadata
            </Button>
          </HStack>
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
            {displayDescription ? (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={4} py={3}>
                <Text color="gray.700" whiteSpace="pre-wrap">
                  {displayDescription}
                </Text>
              </Box>
            ) : null}

            <Flex justify="space-between" align={{ base: "stretch", xl: "end" }} gap={4} wrap="wrap">
              <Box />
              <HStack spacing={3} align="center" flexWrap="wrap">
                <Button type="button" variant="outline" onClick={openBulkRemapModal}>
                  Bulk Remap
                </Button>
                <Button type="button" variant="outline" onClick={() => openRowEditor(null)}>
                  Add Row
                </Button>
              </HStack>
            </Flex>

            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" flex="1" minH="0">
              <Box h="100%" overflow="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      {data.segmentationDefault.categoryColumns.map((columnLabel, index) => {
                        const columnKey = buildCategoryFilterKey(index);

                        return (
                          <Th key={columnKey} position="sticky" top={0} bg="gray.50" zIndex={1}>
                            <SearchableHeader
                              columnKey={columnKey}
                              label={columnLabel}
                              isOpen={Boolean(openFilterKeys[columnKey])}
                              activeValue={filters[columnKey] || ""}
                              draftValue={draftFilters[columnKey] || ""}
                              onToggle={() => toggleFilter(columnKey)}
                              onDraftChange={(value) => updateDraftFilter(columnKey, value)}
                              onApply={(value) => applyFilter(columnKey, value)}
                              onClear={() => clearFilter(columnKey)}
                            />
                          </Th>
                        );
                      })}
                      {valueColumns.map((column) => (
                        <Th key={column.key} position="sticky" top={0} bg="gray.50" zIndex={1}>
                          <SearchableHeader
                            columnKey={column.key}
                            label={column.label}
                            isOpen={Boolean(openFilterKeys[column.key])}
                            activeValue={filters[column.key] || ""}
                            draftValue={draftFilters[column.key] || ""}
                            onToggle={() => toggleFilter(column.key)}
                            onDraftChange={(value) => updateDraftFilter(column.key, value)}
                            onApply={(value) => applyFilter(column.key, value)}
                            onClear={() => clearFilter(column.key)}
                          />
                        </Th>
                      ))}
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1} sx={{ borderLeft: "4px double", borderLeftColor: "#CBD5E0" }}>
                        <SearchableHeader
                          columnKey="industry"
                          label="Industry"
                          isOpen={Boolean(openFilterKeys.industry)}
                          activeValue={filters.industry || ""}
                          draftValue={draftFilters.industry || ""}
                          onToggle={() => toggleFilter("industry")}
                          onDraftChange={(value) => updateDraftFilter("industry", value)}
                          onApply={(value) => applyFilter("industry", value)}
                          onClear={() => clearFilter("industry")}
                          selectOptions={taxonomyOptions.industryOptions}
                        />
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        <SearchableHeader
                          columnKey="focus"
                          label="Focus"
                          isOpen={Boolean(openFilterKeys.focus)}
                          activeValue={filters.focus || ""}
                          draftValue={draftFilters.focus || ""}
                          onToggle={() => toggleFilter("focus")}
                          onDraftChange={(value) => updateDraftFilter("focus", value)}
                          onApply={(value) => applyFilter("focus", value)}
                          onClear={() => clearFilter("focus")}
                          selectOptions={taxonomyOptions.focusOptions}
                        />
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        Notes
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1} textAlign="right">
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredRows.length ? (
                      filteredRows.map((row, rowIndex) => {
                        const sourceRowIndex = rows.indexOf(row);
                        const rowWarnings = readRowTaxonomyWarnings(row, taxonomyOptions);
                        const hasWarning = rowWarnings.length > 0;

                        return (
                          <Tr
                            key={row.rowId || `${data.id || "segmentation"}-${rowIndex}`}
                            bg={
                              rowHighlightStateByKey[String(sourceRowIndex)] === "saving"
                                ? "blue.50"
                                : rowHighlightStateByKey[String(sourceRowIndex)] === "saved"
                                  ? "green.50"
                                  : hasWarning
                                    ? warningRowBg
                                    : isIncompleteRow(row)
                                      ? voidRowBg
                                      : undefined
                            }
                            transition="background-color 0.35s ease"
                          >
                            {data.segmentationDefault.categoryColumns.map((_, categoryIndex) => (
                              <Td key={`${rowIndex}-category-${categoryIndex}`}>{row.categories[categoryIndex] || ""}</Td>
                            ))}
                            {valueColumns.map((column) => (
                              <Td key={`${rowIndex}-${column.key}`}>{readTrimmedString(row[column.key])}</Td>
                            ))}
                            <Td sx={{ borderLeft: "4px double", borderLeftColor: "#CBD5E0" }}>
                              {readDisplayValue({
                                key: "industry",
                                row,
                                taxonomyOptions
                              })}
                            </Td>
                            <Td>
                              {readDisplayValue({
                                key: "focus",
                                row,
                                taxonomyOptions
                              })}
                            </Td>
                            <Td>
                              <Tooltip label={row.notes || "No notes"} hasArrow openDelay={200}>
                                <IconButton
                                  aria-label={`View notes for row ${rowIndex + 1}`}
                                  icon={<MdDescription />}
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                  colorScheme={row.notes ? "blue" : "gray"}
                                />
                              </Tooltip>
                              {hasWarning ? (
                                <Tooltip label={rowWarnings.join("\n")} hasArrow openDelay={200}>
                                  <Text mt={1} fontSize="xs" color="orange.700">
                                    Warning
                                  </Text>
                                </Tooltip>
                              ) : null}
                            </Td>
                            <Td textAlign="right" whiteSpace="nowrap">
                              <IconButton
                                aria-label={`Edit row ${rowIndex + 1}`}
                                icon={<EditIcon />}
                                size="sm"
                                type="button"
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => openRowEditor(sourceRowIndex)}
                              />
                            </Td>
                          </Tr>
                        );
                      })
                    ) : (
                      <Tr>
                        <Td colSpan={data.segmentationDefault.categoryColumns.length + valueColumns.length + 5}>
                          <Text color="gray.500">No rows match the active filters.</Text>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          </VStack>
        </Box>
      </Box>

      <Modal isOpen={isRowModalOpen} onClose={closeRowEditor} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingRowIndex == null ? "Add Row" : "Edit Row"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              {isIncompleteRow(draftRow) ? (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>This row has no Industry or Focus output, so segmentation skips it until one is added.</AlertDescription>
                </Alert>
              ) : null}
              {data.segmentationDefault.categoryColumns.map((columnLabel, index) => (
                <FormControl key={`draft-category-${index}`}>
                  <FormLabel>{columnLabel}</FormLabel>
                  <Input
                    value={draftRow.categories[index] || ""}
                    onChange={(event) => updateDraftCategory(index, event.target.value)}
                    bg="white"
                  />
                </FormControl>
              ))}

              {valueColumns.map((column) => (
                <FormControl key={`draft-value-${column.key}`}>
                  <FormLabel>{column.label}</FormLabel>
                  <Input
                    value={readTrimmedString(draftRow[column.key])}
                    onChange={(event) => updateDraftField(column.key, event.target.value)}
                    bg="white"
                  />
                </FormControl>
              ))}

              <FormControl>
                <FormLabel>Industry</FormLabel>
                <VStack align="stretch" spacing={3}>
                  {(Array.isArray(draftRow.industryTargets) ? draftRow.industryTargets : []).map((target, index) => (
                    <HStack key={`industry-target-${index}`} align="start">
                      <Select
                        value={target.name}
                        onChange={(event) => updateDraftTarget("industryTargets", index, "name", event.target.value)}
                        bg="white"
                      >
                        <option value="">Select industry</option>
                        {taxonomyOptions.industryOptions.map((option) => (
                          <option key={`industry-${index}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={target.score}
                        onChange={(event) => updateDraftTarget("industryTargets", index, "score", event.target.value)}
                        bg="white"
                        maxW="100px"
                        placeholder="Score"
                      />
                      <Button type="button" variant="ghost" colorScheme="red" onClick={() => removeDraftTarget("industryTargets", index)}>
                        Remove
                      </Button>
                    </HStack>
                  ))}
                  <Button type="button" variant="outline" alignSelf="flex-start" onClick={() => addDraftTarget("industryTargets")}>
                    Add Industry
                  </Button>
                </VStack>
              </FormControl>

              <FormControl>
                <FormLabel>Focus</FormLabel>
                <VStack align="stretch" spacing={3}>
                  {(Array.isArray(draftRow.focusTargets) ? draftRow.focusTargets : []).map((target, index) => (
                    <HStack key={`focus-target-${index}`} align="start">
                      <Select
                        value={target.name}
                        onChange={(event) => updateDraftTarget("focusTargets", index, "name", event.target.value)}
                        bg="white"
                      >
                        <option value="">Select focus</option>
                        {taxonomyOptions.focusOptions.map((option) => (
                          <option key={`focus-${index}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={target.score}
                        onChange={(event) => updateDraftTarget("focusTargets", index, "score", event.target.value)}
                        bg="white"
                        maxW="100px"
                        placeholder="Score"
                      />
                      <Button type="button" variant="ghost" colorScheme="red" onClick={() => removeDraftTarget("focusTargets", index)}>
                        Remove
                      </Button>
                    </HStack>
                  ))}
                  <Button type="button" variant="outline" alignSelf="flex-start" onClick={() => addDraftTarget("focusTargets")}>
                    Add Focus
                  </Button>
                </VStack>
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea value={draftRow.notes} onChange={(event) => updateDraftField("notes", event.target.value)} minH="112px" />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              {editingRowIndex == null ? null : (
                <Button type="button" variant="ghost" colorScheme="red" onClick={deleteDraftRow}>
                  Delete Row
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={closeRowEditor}>
                Cancel
              </Button>
              <Button type="button" colorScheme="blue" onClick={saveDraftRow} isLoading={isSaving} loadingText="Saving">
                Save Row
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBulkRemapModalOpen} onClose={closeBulkRemapModal} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Bulk Remap Industry/Focus</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <AlertDescription>
                  Remap one Industry or Focus value across this document, then save once.
                </AlertDescription>
              </Alert>

              <FormControl>
                <FormLabel>Column</FormLabel>
                <Select
                  value={bulkRemapDraft.dimension}
                  onChange={(event) => updateBulkRemapDraft("dimension", event.target.value)}
                  bg="white"
                >
                  <option value="industry">Industry</option>
                  <option value="focus">Focus</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Find</FormLabel>
                <Input
                  value={bulkRemapDraft.findValue}
                  onChange={(event) => updateBulkRemapDraft("findValue", event.target.value)}
                  bg="white"
                  placeholder="e.g. re-commercial"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Replace With</FormLabel>
                <Input
                  value={bulkRemapDraft.replaceValue}
                  onChange={(event) => updateBulkRemapDraft("replaceValue", event.target.value)}
                  bg="white"
                  placeholder="e.g. RE Commercial"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Scope</FormLabel>
                <Select
                  value={bulkRemapDraft.scope}
                  onChange={(event) => updateBulkRemapDraft("scope", event.target.value)}
                  bg="white"
                >
                  <option value="both">Primary value and targets</option>
                  <option value="primary">Primary value only</option>
                  <option value="targets">Targets only</option>
                </Select>
              </FormControl>

              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={4} py={3}>
                <Text fontSize="sm" color="gray.700">
                  Preview: {bulkRemapPreview.changedRowCount} row
                  {bulkRemapPreview.changedRowCount === 1 ? "" : "s"} and {bulkRemapPreview.changedValueCount} value
                  {bulkRemapPreview.changedValueCount === 1 ? "" : "s"} will change.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button type="button" variant="ghost" onClick={closeBulkRemapModal}>
                Cancel
              </Button>
              <Button
                type="button"
                colorScheme="blue"
                onClick={saveBulkRemapChanges}
                isDisabled={!bulkRemapPreview.changedRowCount}
                isLoading={isSaving}
                loadingText="Saving"
              >
                Apply Remap
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isMetadataModalOpen} onClose={closeMetadataModal} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Metadata</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input value={readTrimmedString(metadata?.name)} onChange={(event) => updateMetadata("name", event.target.value)} bg="white" />
              </FormControl>

              <FormControl>
                <FormLabel>Namespace</FormLabel>
                <Input value={data.namespace || ""} isReadOnly bg="gray.50" />
              </FormControl>

              <FormControl>
                <FormLabel>Type</FormLabel>
                <Input value={readTrimmedString(metadata?.type)} onChange={(event) => updateMetadata("type", event.target.value)} bg="white" />
              </FormControl>

              <FormControl>
                <FormLabel>Editor</FormLabel>
                <Input value={editorTypeLabel} onChange={(event) => updateEditorConfig("type", event.target.value)} bg="white" />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} minH="120px" bg="white" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button type="button" variant="ghost" onClick={closeMetadataModal}>
                Cancel
              </Button>
              <Button type="button" colorScheme="blue" onClick={saveMetadataChanges} isLoading={isSaving} loadingText="Saving">
                Save
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
