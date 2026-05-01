import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  IconButton,
  Input,
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
import { useFetcher, useLocation } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { MdDescription } from "react-icons/md";
import { appendFocusOption, buildCreatedFocusRow, NEW_FOCUS_OPTION_VALUE } from "../models/focus-shortcut.mjs";
import {
  applyBulkSelectionUpdate,
  buildTaxonomyOptions,
  readDisplayValue,
  readRowTaxonomyWarnings,
  resolveFriendlyTaxonomyLabel,
  rowMatchesFilters
} from "../models/segmentation-default-page.mjs";
import { buildSegmentationDefaultSubmitFormData } from "../models/segmentation-default-submit.mjs";
import { InlineSaveStatus } from "./InlineSaveStatus";
import { RichTextField } from "./ui/molecules/RichTextField";
import { RegexBuilder, RegexTokenDisplay, parseRegexToTokens } from "./ui/molecules/RegexBuilder";
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
 * Builds one empty bulk-change draft.
 * @returns {{industry: string, focus: string}}
 */
function buildEmptyBulkChangeDraft() {
  return {
    industry: "",
    focus: ""
  };
}

/**
 * Builds one empty draft for inline Focus creation.
 * @returns {{label: string, description: string}}
 */
function buildEmptyNewFocusDraft() {
  return {
    label: "",
    description: ""
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
 * Renders the inline Focus-creation editor used by the row and bulk-change flyouts.
 * @param {{
 *   isVisible?: boolean,
 *   draft?: {label?: string, description?: string},
 *   errorMessage?: string,
 *   isSaving?: boolean,
 *   onDraftChange?: (field: "label"|"description", value: string) => void,
 *   onCancel?: () => void,
 *   onSave?: () => void
 * }} props
 * @returns {JSX.Element|null}
 */
function NewFocusEditorPanel({
  isVisible = false,
  draft = buildEmptyNewFocusDraft(),
  errorMessage = "",
  isSaving = false,
  onDraftChange,
  onCancel,
  onSave
}) {
  if (!isVisible) {
    return null;
  }

  return (
    <Box borderWidth="1px" borderColor="blue.200" borderRadius="lg" bg="blue.50" px={4} py={4}>
      <VStack align="stretch" spacing={4}>
        <Box>
          <Text fontWeight="semibold" color="blue.900">
            New Focus
          </Text>
          <Text fontSize="sm" color="blue.800">
            Add the Focus here and save it back to the Focus page without leaving this editor.
          </Text>
        </Box>

        {errorMessage ? (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormControl isRequired>
          <FormLabel>Focus Name</FormLabel>
          <Input
            value={draft.label || ""}
            onChange={(event) => onDraftChange?.("label", event.target.value)}
            bg="white"
            placeholder="Enter a new Focus"
          />
        </FormControl>

        <RichTextField
          label="Description"
          value={draft.description || ""}
          onChange={(value) => onDraftChange?.("description", value)}
          height="220px"
        />

        <HStack justify="flex-end" spacing={3}>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" colorScheme="blue" onClick={onSave} isLoading={isSaving} loadingText="Saving Focus">
            Save Focus
          </Button>
        </HStack>
      </VStack>
    </Box>
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
  const createFocusFetcher = useFetcher();
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
  const [selectedRowIndexes, setSelectedRowIndexes] = useState([]);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [draftRow, setDraftRow] = useState(() => buildEmptySegmentationRow(categoryDepth, defaultBranchFieldNames));
  const [focusCatalogOptions, setFocusCatalogOptions] = useState(() =>
    Array.isArray(data.categoryCatalog?.focusOptions) ? data.categoryCatalog.focusOptions : []
  );
  const [bulkChangeDraft, setBulkChangeDraft] = useState(() => buildEmptyBulkChangeDraft());
  const [newFocusContext, setNewFocusContext] = useState(null);
  const [newFocusDraft, setNewFocusDraft] = useState(() => buildEmptyNewFocusDraft());
  const [newFocusErrorMessage, setNewFocusErrorMessage] = useState("");
  const documentIdRef = useRef(readTrimmedString(data.id));
  const handledCreateFocusResponseRef = useRef(null);
  const {
    isOpen: isRowDrawerOpen,
    onOpen: openRowDrawer,
    onClose: closeRowDrawer
  } = useDisclosure();
  const {
    isOpen: isMetadataDrawerOpen,
    onOpen: openMetadataDrawer,
    onClose: closeMetadataDrawer
  } = useDisclosure();
  const {
    isOpen: isBulkChangeDrawerOpen,
    onOpen: openBulkChangeDrawer,
    onClose: closeBulkChangeDrawer
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
    const nextDocumentId = readTrimmedString(data.id);
    if (documentIdRef.current === nextDocumentId) {
      return;
    }

    documentIdRef.current = nextDocumentId;
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
    setFocusCatalogOptions(Array.isArray(data.categoryCatalog?.focusOptions) ? data.categoryCatalog.focusOptions : []);
    setFilters({});
    setDraftFilters({});
    setOpenFilterKeys({});
    setSelectedRowIndexes([]);
    setBulkChangeDraft(buildEmptyBulkChangeDraft());
    setNewFocusContext(null);
    setNewFocusDraft(buildEmptyNewFocusDraft());
    setNewFocusErrorMessage("");
    handledCreateFocusResponseRef.current = null;
  }, [categoryDepth, data.categoryCatalog?.focusOptions, data.description, data.editorType, data.id]);

  useEffect(() => {
    if (createFocusFetcher.state !== "idle") {
      return;
    }

    const payload = createFocusFetcher.data;
    if (!payload || payload.intent !== "create-focus" || handledCreateFocusResponseRef.current === payload) {
      return;
    }

    handledCreateFocusResponseRef.current = payload;
    if (!payload.ok) {
      setNewFocusErrorMessage(payload.error?.message || "Unable to create the new Focus.");
      return;
    }

    const createdFocus = buildCreatedFocusRow(payload.createdFocus);
    if (!createdFocus.label) {
      return;
    }

    setFocusCatalogOptions((currentOptions) => appendFocusOption(currentOptions, createdFocus.label));
    setNewFocusErrorMessage("");

    if (newFocusContext?.surface === "row") {
      setDraftRow((currentRow) => {
        if (!currentRow) {
          return currentRow;
        }

        const targetIndex = Number.isInteger(newFocusContext.targetIndex) ? newFocusContext.targetIndex : 0;
        const nextTargets = Array.isArray(currentRow.focusTargets) ? currentRow.focusTargets.slice() : [];
        while (nextTargets.length <= targetIndex) {
          nextTargets.push(buildEmptyTargetRow());
        }

        nextTargets[targetIndex] = {
          ...nextTargets[targetIndex],
          name: createdFocus.label
        };

        return {
          ...currentRow,
          focusTargets: nextTargets
        };
      });
    }

    if (newFocusContext?.surface === "bulk") {
      setBulkChangeDraft((currentValue) => ({
        ...currentValue,
        focus: createdFocus.label
      }));
    }

    setNewFocusContext(null);
    setNewFocusDraft(buildEmptyNewFocusDraft());
  }, [createFocusFetcher.data, createFocusFetcher.state, newFocusContext]);

  const taxonomyOptions = buildTaxonomyOptions(
    {
      ...(data.categoryCatalog || {}),
      focusOptions: focusCatalogOptions
    },
    rows
  );
  const filteredRows = rows.filter((row) => rowMatchesFilters(row, filters, taxonomyOptions));
  const selectedRowIndexSet = new Set(selectedRowIndexes);
  const filteredSourceRowIndexes = filteredRows
    .map((row) => rows.indexOf(row))
    .filter((rowIndex) => rowIndex >= 0);
  const selectedFilteredRowCount = filteredSourceRowIndexes.filter((rowIndex) => selectedRowIndexSet.has(rowIndex)).length;
  const hasSelectedRows = selectedRowIndexes.length > 0;
  const allFilteredRowsSelected =
    filteredSourceRowIndexes.length > 0 &&
    filteredSourceRowIndexes.every((rowIndex) => selectedRowIndexSet.has(rowIndex));
  const someFilteredRowsSelected =
    selectedFilteredRowCount > 0 && selectedFilteredRowCount < filteredSourceRowIndexes.length;
  const canApplyBulkChange = hasSelectedRows && (readTrimmedString(bulkChangeDraft.industry) || readTrimmedString(bulkChangeDraft.focus));

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
   * Opens the row flyout for the requested row index.
   * @param {number|null} rowIndex
   */
  function openRowEditor(rowIndex) {
    setNewFocusContext(null);
    setNewFocusDraft(buildEmptyNewFocusDraft());
    setNewFocusErrorMessage("");
    setEditingRowIndex(rowIndex);
    setDraftRow(
      rowIndex == null
        ? buildEmptySegmentationRow(categoryDepth, defaultBranchFieldNames)
        : cloneSegmentationRows([rows[rowIndex]], categoryDepth)[0] || buildEmptySegmentationRow(categoryDepth, defaultBranchFieldNames)
    );
    openRowDrawer();
  }

  /**
   * Closes the row flyout and resets draft state.
   */
  function closeRowEditor() {
    setEditingRowIndex(null);
    setDraftRow(buildEmptySegmentationRow(categoryDepth, defaultBranchFieldNames));
    setNewFocusContext(null);
    setNewFocusDraft(buildEmptyNewFocusDraft());
    setNewFocusErrorMessage("");
    closeRowDrawer();
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
    if (editingRowIndex == null) {
      setSelectedRowIndexes([]);
    }
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
    setSelectedRowIndexes([]);
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
   * Persists metadata edits and closes the metadata flyout.
   */
  function saveMetadataChanges() {
    requestSave((summary) =>
      buildSaveFormData({
        summary
      })
    );
    closeMetadataDrawer();
  }

  /**
   * Toggles one row checkbox.
   * @param {number} rowIndex
   */
  function toggleRowSelection(rowIndex) {
    setSelectedRowIndexes((currentIndexes) =>
      currentIndexes.includes(rowIndex)
        ? currentIndexes.filter((value) => value !== rowIndex)
        : [...currentIndexes, rowIndex].sort((left, right) => left - right)
    );
  }

  /**
   * Toggles all rows visible under the current filters.
   */
  function toggleSelectAllFilteredRows() {
    if (!filteredSourceRowIndexes.length) {
      return;
    }

    setSelectedRowIndexes((currentIndexes) => {
      const nextIndexes = new Set(currentIndexes);
      const shouldSelectAll = filteredSourceRowIndexes.some((rowIndex) => !nextIndexes.has(rowIndex));

      filteredSourceRowIndexes.forEach((rowIndex) => {
        if (shouldSelectAll) {
          nextIndexes.add(rowIndex);
        } else {
          nextIndexes.delete(rowIndex);
        }
      });

      return Array.from(nextIndexes).sort((left, right) => left - right);
    });
  }

  /**
   * Clears all selected rows.
   */
  function clearSelectedRows() {
    setSelectedRowIndexes([]);
  }

  /**
   * Updates one bulk-change field.
   * @param {"industry"|"focus"} key
   * @param {string} value
   */
  function updateBulkChangeDraft(key, value) {
    setBulkChangeDraft((currentValue) => ({
      ...currentValue,
      [key]: value
    }));
  }

  /**
   * Resets and closes the bulk-change flyout.
   */
  function closeBulkChangeEditor() {
    setBulkChangeDraft(buildEmptyBulkChangeDraft());
    setNewFocusContext(null);
    setNewFocusDraft(buildEmptyNewFocusDraft());
    setNewFocusErrorMessage("");
    closeBulkChangeDrawer();
  }

  /**
   * Applies the current bulk change across the selected rows and queues one save.
   */
  function saveBulkChangeChanges() {
    const result = applyBulkSelectionUpdate(rows, bulkChangeDraft, selectedRowIndexes);
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
    setSelectedRowIndexes([]);
    closeBulkChangeEditor();
  }

  /**
   * Opens the inline Focus-creation panel for the requested editor surface.
   * @param {{surface: "row"|"bulk", targetIndex?: number|null}} context
   */
  function openNewFocusEditor(context) {
    setNewFocusContext(context);
    setNewFocusDraft(buildEmptyNewFocusDraft());
    setNewFocusErrorMessage("");
  }

  /**
   * Updates one field inside the Focus-creation draft.
   * @param {"label"|"description"} field
   * @param {string} value
   */
  function updateNewFocusDraft(field, value) {
    setNewFocusDraft((currentValue) => ({
      ...currentValue,
      [field]: value
    }));
  }

  /**
   * Saves a new Focus into the Focus category document.
   */
  function saveNewFocus() {
    const label = readTrimmedString(newFocusDraft.label);
    if (!label) {
      setNewFocusErrorMessage("Focus name is required.");
      return;
    }

    setNewFocusErrorMessage("");
    const formData = new FormData();
    formData.set("intent", "create-focus");
    formData.set("focusLabel", label);
    formData.set("focusDescription", newFocusDraft.description || "");
    createFocusFetcher.submit(formData, {
      method: "post"
    });
  }

  const displayDescription = readTrimmedString(description);
  const displayName = readTrimmedString(metadata?.name) || data.name;
  const editorTypeLabel = readTrimmedString(editorConfig?.type) || data.editorType || "segmentation.default";
  const isCreatingFocus = createFocusFetcher.state !== "idle";

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white" position="sticky" top={0} zIndex={3}>
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
            <Button type="button" variant="link" size="sm" colorScheme="blue" onClick={openMetadataDrawer}>
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
                {hasSelectedRows ? (
                  <>
                    <Text fontSize="sm" color="gray.600">
                      {selectedRowIndexes.length} selected
                    </Text>
                    <Button type="button" variant="link" size="sm" colorScheme="blue" onClick={clearSelectedRows}>
                      clear selected
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNewFocusContext(null);
                    setNewFocusDraft(buildEmptyNewFocusDraft());
                    setNewFocusErrorMessage("");
                    openBulkChangeDrawer();
                  }}
                  isDisabled={!hasSelectedRows}
                >
                  Bulk Change
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
                      <Th position="sticky" top={0} left={0} bg="gray.50" zIndex={2} width="52px">
                        <Checkbox
                          isChecked={allFilteredRowsSelected}
                          isIndeterminate={someFilteredRowsSelected}
                          isDisabled={!filteredSourceRowIndexes.length}
                          onChange={toggleSelectAllFilteredRows}
                          aria-label="Select all filtered rows"
                        />
                      </Th>
                      {data.segmentationDefault.categoryColumns.map((columnLabel, index) => {
                        const columnKey = buildCategoryFilterKey(index);
                        const isRegex = columnLabel.toLowerCase() === "regex";

                        return (
                          <Th
                            key={columnKey}
                            position="sticky"
                            top={0}
                            bg={isRegex ? "blue.50" : "gray.50"}
                            color={isRegex ? "blue.700" : undefined}
                            zIndex={1}
                          >
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
                        const rowBackground =
                          rowHighlightStateByKey[String(sourceRowIndex)] === "saving"
                            ? "blue.50"
                            : rowHighlightStateByKey[String(sourceRowIndex)] === "saved"
                              ? "green.50"
                              : hasWarning
                                ? warningRowBg
                                : isIncompleteRow(row)
                                  ? voidRowBg
                                  : undefined;

                        return (
                          <Tr
                            key={row.rowId || `${data.id || "segmentation"}-${rowIndex}`}
                            bg={rowBackground}
                            transition="background-color 0.35s ease"
                          >
                            <Td position="sticky" left={0} bg={rowBackground || "white"} zIndex={1}>
                              <Checkbox
                                isChecked={selectedRowIndexSet.has(sourceRowIndex)}
                                onChange={() => toggleRowSelection(sourceRowIndex)}
                                aria-label={`Select row ${rowIndex + 1}`}
                              />
                            </Td>
                            {data.segmentationDefault.categoryColumns.map((columnLabel, categoryIndex) => (
                              <Td key={`${rowIndex}-category-${categoryIndex}`}>
                                {columnLabel.toLowerCase() === "regex"
                                  ? <RegexTokenDisplay pattern={row.categories[categoryIndex] || ""} />
                                  : row.categories[categoryIndex] || ""}
                              </Td>
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

      <Drawer isOpen={isRowDrawerOpen} onClose={closeRowEditor} placement="right" size="xl">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{editingRowIndex == null ? "Add Row" : "Edit Row"}</DrawerHeader>
          <DrawerBody pb={6}>
            <VStack align="stretch" spacing={4}>
              {isIncompleteRow(draftRow) ? (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>This row has no Industry or Focus output, so segmentation skips it until one is added.</AlertDescription>
                </Alert>
              ) : null}
              {data.segmentationDefault.categoryColumns.map((columnLabel, index) => {
                const isRegex = columnLabel.toLowerCase() === "regex";
                const parsed = isRegex ? parseRegexToTokens(draftRow.categories[index] || "") : null;
                return (
                  <FormControl key={`draft-category-${index}`}>
                    <FormLabel>{columnLabel}</FormLabel>
                    {isRegex ? (
                      <RegexBuilder
                        compact
                        initialTokens={parsed?.tokens ?? null}
                        initialAnchorStart={parsed?.anchorStart ?? false}
                        initialAnchorEnd={parsed?.anchorEnd ?? false}
                        onPatternChange={(pattern) => updateDraftCategory(index, pattern)}
                      />
                    ) : (
                      <Input
                        value={draftRow.categories[index] || ""}
                        onChange={(event) => updateDraftCategory(index, event.target.value)}
                        bg="white"
                      />
                    )}
                  </FormControl>
                );
              })}

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
                        value={resolveFriendlyTaxonomyLabel(target.name, taxonomyOptions.industryOptions) || target.name}
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
                        value={resolveFriendlyTaxonomyLabel(target.name, taxonomyOptions.focusOptions) || target.name}
                        onChange={(event) => {
                          if (event.target.value === NEW_FOCUS_OPTION_VALUE) {
                            openNewFocusEditor({
                              surface: "row",
                              targetIndex: index
                            });
                            return;
                          }

                          updateDraftTarget("focusTargets", index, "name", event.target.value);
                        }}
                        bg="white"
                      >
                        <option value="">Select focus</option>
                        {taxonomyOptions.focusOptions.map((option) => (
                          <option key={`focus-${index}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                        <option value={NEW_FOCUS_OPTION_VALUE}>New Focus</option>
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

              <NewFocusEditorPanel
                isVisible={newFocusContext?.surface === "row"}
                draft={newFocusDraft}
                errorMessage={newFocusErrorMessage}
                isSaving={isCreatingFocus}
                onDraftChange={updateNewFocusDraft}
                onCancel={() => {
                  setNewFocusContext(null);
                  setNewFocusDraft(buildEmptyNewFocusDraft());
                  setNewFocusErrorMessage("");
                }}
                onSave={saveNewFocus}
              />

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea value={draftRow.notes} onChange={(event) => updateDraftField("notes", event.target.value)} minH="112px" />
              </FormControl>
            </VStack>
          </DrawerBody>

          <DrawerFooter>
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
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={isBulkChangeDrawerOpen} onClose={closeBulkChangeEditor} placement="right" size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Bulk Change Industry/Focus</DrawerHeader>
          <DrawerBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <AlertDescription>
                  Update the selected rows in one save. Active filters will stay in place.
                </AlertDescription>
              </Alert>

              <Text fontSize="sm" color="gray.600">
                {selectedRowIndexes.length} row{selectedRowIndexes.length === 1 ? "" : "s"} selected
              </Text>

              <FormControl>
                <FormLabel>Industry</FormLabel>
                <Select
                  value={bulkChangeDraft.industry}
                  onChange={(event) => updateBulkChangeDraft("industry", event.target.value)}
                  bg="white"
                >
                  <option value="">Do not change industry</option>
                  {taxonomyOptions.industryOptions.map((option) => (
                    <option key={`bulk-industry-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Focus</FormLabel>
                <Select
                  value={bulkChangeDraft.focus}
                  onChange={(event) => {
                    if (event.target.value === NEW_FOCUS_OPTION_VALUE) {
                      openNewFocusEditor({
                        surface: "bulk"
                      });
                      return;
                    }

                    updateBulkChangeDraft("focus", event.target.value);
                  }}
                  bg="white"
                >
                  <option value="">Do not change focus</option>
                  {taxonomyOptions.focusOptions.map((option) => (
                    <option key={`bulk-focus-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                  <option value={NEW_FOCUS_OPTION_VALUE}>New Focus</option>
                </Select>
              </FormControl>

              <NewFocusEditorPanel
                isVisible={newFocusContext?.surface === "bulk"}
                draft={newFocusDraft}
                errorMessage={newFocusErrorMessage}
                isSaving={isCreatingFocus}
                onDraftChange={updateNewFocusDraft}
                onCancel={() => {
                  setNewFocusContext(null);
                  setNewFocusDraft(buildEmptyNewFocusDraft());
                  setNewFocusErrorMessage("");
                }}
                onSave={saveNewFocus}
              />
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <HStack spacing={3}>
              <Button type="button" variant="ghost" onClick={closeBulkChangeEditor}>
                Cancel
              </Button>
              <Button
                type="button"
                colorScheme="blue"
                onClick={saveBulkChangeChanges}
                isDisabled={!canApplyBulkChange}
                isLoading={isSaving}
                loadingText="Saving"
              >
                Save
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={isMetadataDrawerOpen} onClose={closeMetadataDrawer} placement="right" size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Metadata</DrawerHeader>
          <DrawerBody pb={6}>
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
          </DrawerBody>
          <DrawerFooter>
            <HStack spacing={3}>
              <Button type="button" variant="ghost" onClick={closeMetadataDrawer}>
                Cancel
              </Button>
              <Button type="button" colorScheme="blue" onClick={saveMetadataChanges} isLoading={isSaving} loadingText="Saving">
                Save
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
