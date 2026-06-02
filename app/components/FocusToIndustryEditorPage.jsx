import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  InputGroup,
  InputLeftElement,
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
  VStack,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, SearchIcon } from "@chakra-ui/icons";
import { useLocation } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MdDescription } from "react-icons/md";
import { InlineSaveStatus } from "./InlineSaveStatus";
import { useQueuedDocumentSave } from "../hooks/useQueuedDocumentSave";
import { useRowSaveHighlight } from "../hooks/useRowSaveHighlight";

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
  return `focus-to-industry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Clones one scored target list into mutable state.
 * @param {unknown} value
 * @returns {Array<{name: string, score: string}>}
 */
function cloneIndustryTargets(value) {
  const entries = Array.isArray(value) ? value : [];
  return entries
    .map((entry) => {
      const name = readTrimmedString(entry?.name);
      const score = entry?.score == null ? "" : String(entry.score).trim();
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
 * Builds one empty scored industry row.
 * @returns {{name: string, score: string}}
 */
function buildEmptyIndustryTarget() {
  return {
    name: "",
    score: "3"
  };
}

/**
 * Clones focus-to-industry rows into local editor state.
 * @param {unknown[]} rows
 * @returns {Array<{
 *   rowId: string,
 *   focusSlugs: string[],
 *   industryTargets: Array<{name: string, score: string}>,
 *   notes: string,
 *   __extraFields: Record<string, unknown>,
 *   __clientKey: string
 * }>}
 */
function cloneRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        rowId: readTrimmedString(row?.rowId),
        focusSlugs: Array.isArray(row?.focusSlugs)
          ? row.focusSlugs.map((entry) => readTrimmedString(entry)).filter(Boolean)
          : Array.isArray(row?.focusIds)
            ? row.focusIds.map((entry) => readTrimmedString(entry)).filter(Boolean)
            : [],
        industryTargets: cloneIndustryTargets(row?.industryTargets),
        notes: readTrimmedString(row?.notes),
        __extraFields: row && typeof row.__extraFields === "object" && !Array.isArray(row.__extraFields) ? { ...row.__extraFields } : {},
        __clientKey: readTrimmedString(row?.__clientKey) || buildClientKey()
      }))
    : [];
}

/**
 * Builds one empty editor row.
 * @returns {{
 *   rowId: string,
 *   focusSlugs: string[],
 *   industryTargets: Array<{name: string, score: string}>,
 *   notes: string,
 *   __extraFields: Record<string, unknown>,
 *   __clientKey: string
 * }}
 */
function buildEmptyRow() {
  return {
    rowId: "",
    focusSlugs: [],
    industryTargets: [buildEmptyIndustryTarget()],
    notes: "",
    __extraFields: {},
    __clientKey: buildClientKey()
  };
}

/**
 * Removes transient client-only fields before save.
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
 * Resolves one stored focus selector to its canonical slug.
 * @param {string} value
 * @param {Map<string, string>} focusSlugByToken
 * @returns {string}
 */
function canonicalizeFocusSlug(value, focusSlugByToken) {
  const trimmed = readTrimmedString(value);
  return focusSlugByToken.get(trimmed) || trimmed;
}

/**
 * Canonicalizes focus selectors to slugs before persistence.
 * @param {Array<Record<string, unknown>>} rows
 * @param {Map<string, string>} focusSlugByToken
 * @returns {Array<Record<string, unknown>>}
 */
function canonicalizeRowsForSave(rows, focusSlugByToken) {
  return stripTransientFields(rows).map((row) => ({
    ...row,
    focusSlugs: Array.isArray(row?.focusSlugs)
      ? row.focusSlugs
          .map((entry) => canonicalizeFocusSlug(entry, focusSlugByToken))
          .filter(Boolean)
      : [],
  }));
}

/**
 * Returns whether one draft row is complete enough to save.
 * @param {{focusSlugs?: string[], industryTargets?: Array<{name?: string}>}|null|undefined} row
 * @returns {boolean}
 */
function isCompleteRow(row) {
  const focusSlugs = Array.isArray(row?.focusSlugs) ? row.focusSlugs.map((entry) => readTrimmedString(entry)).filter(Boolean) : [];
  const hasIndustry = cloneIndustryTargets(row?.industryTargets).some((entry) => readTrimmedString(entry.name));
  return focusSlugs.length > 0 && hasIndustry;
}

/**
 * Moves one array item from one index to another.
 * @param {string[]} values
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {string[]}
 */
function moveItem(values, fromIndex, toIndex) {
  const nextValues = Array.isArray(values) ? values.slice() : [];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= nextValues.length ||
    toIndex >= nextValues.length ||
    fromIndex === toIndex
  ) {
    return nextValues;
  }

  const [movedValue] = nextValues.splice(fromIndex, 1);
  nextValues.splice(toIndex, 0, movedValue);
  return nextValues;
}

/**
 * Builds one compact summary label for scored industries.
 * @param {Array<{name?: string, score?: string|number}>} values
 * @returns {string[]}
 */
function summarizeIndustryTargets(values) {
  return cloneIndustryTargets(values).map((entry) => {
    const score = readTrimmedString(entry.score);
    return score ? `${entry.name} (${score})` : entry.name;
  });
}

/**
 * Renders one display card or inline draft editor.
 * @param {{
 *   row: {
 *     focusSlugs: string[],
 *     industryTargets: Array<{name: string, score: string}>,
 *     notes: string,
 *     __clientKey: string
 *   },
 *   focusMetaByToken: Map<string, {label: string, description: string}>,
 *   industryOptions: string[],
 *   filteredFocusOptions: Array<{slug: string, label: string}>,
 *   selectedFocusSlug: string,
 *   highlightState?: "saving"|"saved",
 *   isEditing?: boolean,
 *   onEdit?: () => void,
 *   onDelete?: () => void,
 *   onSelectedFocusChange?: (value: string) => void,
 *   onAddFocus?: () => void,
 *   onRemoveFocus?: (focusSlug: string) => void,
 *   onReorderFocus?: (fromIndex: number, toIndex: number) => void,
 *   onUpdateIndustryTarget?: (index: number, field: "name"|"score", value: string) => void,
 *   onAddIndustryTarget?: () => void,
 *   onRemoveIndustryTarget?: (index: number) => void,
 *   onNotesChange?: (value: string) => void,
 *   onSave?: () => void,
 *   onCancel?: () => void
 * }} props
 * @returns {JSX.Element}
 */
function FocusToIndustryCard(props) {
  const {
    row,
    focusMetaByToken,
    industryOptions,
    filteredFocusOptions,
    selectedFocusSlug,
    highlightState,
    isEditing = false,
    onEdit,
    onDelete,
    onSelectedFocusChange,
    onAddFocus,
    onRemoveFocus,
    onReorderFocus,
    onUpdateIndustryTarget,
    onAddIndustryTarget,
    onRemoveIndustryTarget,
    onNotesChange,
    onSave,
    onCancel
  } = props;
  const [draggedFocusIndex, setDraggedFocusIndex] = useState(-1);
  const cardBackground = isEditing ? "blue.50" : highlightState === "saving" ? "blue.50" : highlightState === "saved" ? "green.50" : "white";
  const borderColor = isEditing ? "blue.200" : highlightState === "saving" ? "blue.200" : highlightState === "saved" ? "green.200" : "gray.200";
  const industrySummary = summarizeIndustryTargets(row.industryTargets);

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
      {isEditing ? (
        <VStack align="stretch" spacing={5}>
          <Flex justify="space-between" align={{ base: "stretch", md: "start" }} gap={4} wrap="wrap">
            <Box>
              <Heading size="sm">{readTrimmedString(row.rowId) ? "Edit Focus Pattern" : "New Focus Pattern"}</Heading>
              <Text color="gray.600" mt={1}>
                Add ordered Focuses on the left and scored Industry outputs on the right.
              </Text>
            </Box>
          </Flex>

          <Box borderWidth="1px" borderColor="blue.100" borderRadius="lg" bg="white" px={4} py={4}>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="semibold" color="gray.800" mb={2}>
                  Ordered Focuses
                </Text>
                <Text color="gray.600" fontSize="sm" mb={3}>
                  Drag chips to reorder. Matching uses this sequence.
                </Text>

                <VStack align="stretch" spacing={3}>
                  <HStack align="end" spacing={3} flexWrap="wrap">
                    <FormControl minW={{ base: "100%", md: "320px" }}>
                      <FormLabel mb={1}>Add Focus</FormLabel>
                      <Select
                        value={selectedFocusSlug}
                        onChange={(event) => onSelectedFocusChange?.(event.target.value)}
                        bg="white"
                      >
                        <option value="">Select one</option>
                        {filteredFocusOptions.map((option) => (
                          <option key={option.slug} value={option.slug}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <Button onClick={onAddFocus} colorScheme="blue" alignSelf={{ base: "stretch", md: "end" }} isDisabled={!selectedFocusSlug}>
                      Add Focus
                    </Button>
                  </HStack>

                  {row.focusSlugs.length ? (
                    <Wrap spacing={3}>
                      {row.focusSlugs.map((focusSlug, index) => {
                        const focusMeta = focusMetaByToken.get(focusSlug);
                        const label = focusMeta?.label || focusSlug;
                        return (
                          <WrapItem key={`${focusSlug}-${index}`}>
                            <Tooltip label={focusMeta?.description || "No description available."} hasArrow>
                              <Tag
                                size="lg"
                                borderRadius="full"
                                bg="blue.100"
                                color="blue.900"
                                cursor="grab"
                                draggable
                                onDragStart={() => setDraggedFocusIndex(index)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => {
                                  onReorderFocus?.(draggedFocusIndex, index);
                                  setDraggedFocusIndex(-1);
                                }}
                              >
                                <TagLabel>{`${index + 1}. ${label}`}</TagLabel>
                                <TagCloseButton
                                  onClick={(event) => {
                                    event.preventDefault();
                                    onRemoveFocus?.(focusSlug);
                                  }}
                                />
                              </Tag>
                            </Tooltip>
                          </WrapItem>
                        );
                      })}
                    </Wrap>
                  ) : (
                    <Box borderWidth="1px" borderStyle="dashed" borderColor="gray.300" borderRadius="lg" px={4} py={4}>
                      <Text color="gray.500">No focuses selected yet.</Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            </VStack>
          </Box>

          <Box borderWidth="1px" borderColor="blue.100" borderRadius="lg" bg="white" px={4} py={4}>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="semibold" color="gray.800" mb={2}>
                  Industry Outputs
                </Text>
                <Text color="gray.600" fontSize="sm">
                  These scored Industry values are emitted when the focus pattern matches.
                </Text>
              </Box>

              <VStack align="stretch" spacing={3}>
                {row.industryTargets.map((target, index) => (
                  <HStack key={`industry-target-${index}`} align="end" spacing={3} flexWrap="wrap">
                    <FormControl minW={{ base: "100%", md: "320px" }}>
                      <FormLabel mb={1}>{index === 0 ? "Industry" : "Additional Industry"}</FormLabel>
                      <Select
                        value={target.name}
                        onChange={(event) => onUpdateIndustryTarget?.(index, "name", event.target.value)}
                        bg="white"
                      >
                        <option value="">Select one</option>
                        {industryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl maxW="120px">
                      <FormLabel mb={1}>Score</FormLabel>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={target.score}
                        onChange={(event) => onUpdateIndustryTarget?.(index, "score", event.target.value)}
                        bg="white"
                      />
                    </FormControl>

                    <IconButton
                      aria-label="Remove industry target"
                      icon={<DeleteIcon />}
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => onRemoveIndustryTarget?.(index)}
                      alignSelf={{ base: "stretch", md: "end" }}
                    />
                  </HStack>
                ))}
              </VStack>

              <Button alignSelf="start" variant="outline" colorScheme="blue" onClick={onAddIndustryTarget}>
                Add Industry
              </Button>
            </VStack>
          </Box>

          <FormControl>
            <FormLabel>Notes</FormLabel>
            <Textarea
              value={row.notes}
              onChange={(event) => onNotesChange?.(event.target.value)}
              minH="112px"
              bg="white"
              placeholder="Optional implementation or editorial notes"
            />
            <FormHelperText>Notes stay on the document row for admin context only.</FormHelperText>
          </FormControl>

          {!isCompleteRow(row) ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription>Each row needs at least one Focus and one Industry output before it can be saved.</AlertDescription>
            </Alert>
          ) : null}

          <HStack justify="flex-end" spacing={3}>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={onSave} isDisabled={!isCompleteRow(row)}>
              Save
            </Button>
          </HStack>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4}>
          <Flex justify="space-between" align={{ base: "stretch", md: "start" }} gap={4} wrap="wrap">
            <Box>
              <Heading size="sm">Focus Pattern</Heading>
              <Text color="gray.600" mt={1}>
                {row.focusSlugs.length} focus{row.focusSlugs.length === 1 ? "" : "es"} mapped to {industrySummary.length} industry output
                {industrySummary.length === 1 ? "" : "s"}.
              </Text>
            </Box>

            <HStack spacing={2}>
              <Button size="sm" leftIcon={<EditIcon />} variant="outline" colorScheme="blue" onClick={onEdit}>
                Edit
              </Button>
              <IconButton
                aria-label="Delete focus pattern"
                icon={<DeleteIcon />}
                variant="ghost"
                colorScheme="red"
                onClick={onDelete}
              />
            </HStack>
          </Flex>

          <Box>
            <Text fontWeight="semibold" color="gray.800" mb={2}>
              Ordered Focuses
            </Text>
            <Wrap spacing={3}>
              {row.focusSlugs.map((focusSlug, index) => {
                const focusMeta = focusMetaByToken.get(focusSlug);
                const label = focusMeta?.label || focusSlug;
                return (
                  <WrapItem key={`${focusSlug}-${index}`}>
                    <Tooltip label={focusMeta?.description || "No description available."} hasArrow>
                      <Tag size="lg" borderRadius="full" bg="blue.50" color="blue.900">
                        <TagLabel>{`${index + 1}. ${label}`}</TagLabel>
                      </Tag>
                    </Tooltip>
                  </WrapItem>
                );
              })}
            </Wrap>
          </Box>

          <Box>
            <Text fontWeight="semibold" color="gray.800" mb={2}>
              Industry Outputs
            </Text>
            <Wrap spacing={3}>
              {industrySummary.map((value) => (
                <WrapItem key={value}>
                  <Tag size="lg" borderRadius="full" bg="orange.50" color="orange.900">
                    <TagLabel>{value}</TagLabel>
                  </Tag>
                </WrapItem>
              ))}
            </Wrap>
          </Box>

          {readTrimmedString(row.notes) ? (
            <Box>
              <Text fontWeight="semibold" color="gray.800" mb={2}>
                Notes
              </Text>
              <Text color="gray.700" whiteSpace="pre-wrap">
                {row.notes}
              </Text>
            </Box>
          ) : null}
        </VStack>
      )}
    </Box>
  );
}

/**
 * Renders the Focus to Industry admin-data editor.
 * @param {{
 *   data: {
 *     id: string,
 *     key?: string,
 *     name: string,
 *     description?: string,
 *     metadata?: Record<string, unknown>,
 *     version?: number|null,
 *     document?: unknown,
 *     editor?: unknown,
 *     lastmodifieddate?: string|null,
 *     lastmodifiedby?: string|null,
 *     focusToIndustry: {rows: unknown[]},
 *     focusToIndustryCatalog: {
 *       industryOptions: string[],
 *       focusOptions: Array<{id: string, slug: string, label: string, description: string}>
 *     }
 *   },
 *   actionData?: {error?: {message?: string}}|null
 * }} props
 * @returns {JSX.Element}
 */
export function FocusToIndustryEditorPage({ data, actionData }) {
  const location = useLocation();
  const addPatternDrawer = useDisclosure();
  const [metadata, setMetadata] = useState(() => (data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {}));
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneRows(data.focusToIndustry?.rows));
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRowKey, setEditingRowKey] = useState("");
  const [draftRow, setDraftRow] = useState(null);
  const [isDraftNew, setIsDraftNew] = useState(false);
  const [selectedFocusSlug, setSelectedFocusSlug] = useState("");
  const documentIdRef = useRef(readTrimmedString(data.id));
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
      formData.set("customDocumentType", "focus-to-industry");
      formData.set("description", description);
      formData.set("metadata", JSON.stringify(metadata));
      formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
      formData.set("document", JSON.stringify(data.document ?? null));
      formData.set("editor", JSON.stringify(data.editor ?? null));
      formData.set(
        "focusToIndustryRows",
        JSON.stringify(canonicalizeRowsForSave(rows, focusSlugByToken))
      );
      return formData;
    }
  });
  const { rowHighlightStateByKey, markRowsChanged } = useRowSaveHighlight({
    isSaving: isQueuedSaving,
    savedVisible,
    saveErrorMessage: saveError?.message || actionData?.error?.message || null
  });

  useEffect(() => {
    const nextDocumentId = readTrimmedString(data.id);
    if (documentIdRef.current === nextDocumentId) {
      return;
    }

    documentIdRef.current = nextDocumentId;
    setMetadata(data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {});
    setDescription(data.description || "");
    setRows(cloneRows(data.focusToIndustry?.rows));
    setSearchQuery("");
    setEditingRowKey("");
    setDraftRow(null);
    setIsDraftNew(false);
    setSelectedFocusSlug("");
    addPatternDrawer.onClose();
  }, [data.description, data.focusToIndustry?.rows, data.id, data.metadata]);

  const industryOptions = useMemo(
    () => (Array.isArray(data.focusToIndustryCatalog?.industryOptions) ? data.focusToIndustryCatalog.industryOptions : []),
    [data.focusToIndustryCatalog?.industryOptions]
  );
  const focusOptions = useMemo(
    () =>
      Array.isArray(data.focusToIndustryCatalog?.focusOptions)
        ? data.focusToIndustryCatalog.focusOptions
            .map((option) => ({
              id: readTrimmedString(option?.id),
              slug: readTrimmedString(option?.slug),
              label: readTrimmedString(option?.label),
              description: readTrimmedString(option?.description)
            }))
            .filter((option) => option.slug && option.label)
        : [],
    [data.focusToIndustryCatalog?.focusOptions]
  );
  const focusMetaByToken = useMemo(
    () =>
      new Map(
        focusOptions.flatMap((option) => [
          [option.slug, { label: option.label, description: option.description || "No description available." }],
          [option.id, { label: option.label, description: option.description || "No description available." }],
        ])
      ),
    [focusOptions]
  );
  const focusSlugByToken = useMemo(
    () =>
      new Map(
        focusOptions.flatMap((option) => [
          [option.slug, option.slug],
          [option.id, option.slug],
        ])
      ),
    [focusOptions]
  );
  const filteredFocusOptions = useMemo(() => {
    const selectedSlugs = new Set(
      Array.isArray(draftRow?.focusSlugs)
        ? draftRow.focusSlugs.map((entry) => canonicalizeFocusSlug(entry, focusSlugByToken)).filter(Boolean)
        : []
    );
    return focusOptions.filter((option) => {
      if (selectedSlugs.has(option.slug)) {
        return false;
      }
      return true;
    });
  }, [draftRow?.focusSlugs, focusOptions, focusSlugByToken]);
  const displayName = readTrimmedString(metadata?.name) || data.name;
  const visibleRows = rows.filter((row) => {
    const query = readTrimmedString(searchQuery).toLowerCase();
    if (!query) {
      return true;
    }

    const haystack = [
      ...row.focusSlugs.map((value) => focusMetaByToken.get(value)?.label || value),
      ...summarizeIndustryTargets(row.industryTargets),
      row.notes
    ]
      .map((value) => readTrimmedString(value).toLowerCase())
      .join(" ");

    return haystack.includes(query);
  });

  useEffect(() => {
    if (!selectedFocusSlug && filteredFocusOptions[0]?.slug) {
      setSelectedFocusSlug(filteredFocusOptions[0].slug);
      return;
    }

    if (selectedFocusSlug && !filteredFocusOptions.some((option) => option.slug === selectedFocusSlug)) {
      setSelectedFocusSlug(filteredFocusOptions[0]?.slug || "");
    }
  }, [filteredFocusOptions, selectedFocusSlug]);

  /**
   * Builds one background save payload from a future row state.
   * @param {{summary: {version: number|null}, nextRows?: unknown[], nextDescription?: string, nextMetadata?: Record<string, unknown>}} options
   * @returns {FormData}
   */
  function buildSaveFormData({ summary, nextRows = rows, nextDescription = description, nextMetadata = metadata }) {
    const formData = new FormData();
    formData.set("customDocumentType", "focus-to-industry");
    formData.set("description", nextDescription);
    formData.set("metadata", JSON.stringify(nextMetadata));
    formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
    formData.set("document", JSON.stringify(data.document ?? null));
    formData.set("editor", JSON.stringify(data.editor ?? null));
    formData.set(
      "focusToIndustryRows",
      JSON.stringify(canonicalizeRowsForSave(nextRows, focusSlugByToken))
    );
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
    setDraftRow(cloneRows([matchedRow])[0] || buildEmptyRow());
    setIsDraftNew(false);
    setSelectedFocusSlug("");
    addPatternDrawer.onOpen();
  }

  /**
   * Opens one unsaved row at the top of the list.
   */
  function startAddingRow() {
    const nextDraft = buildEmptyRow();
    setEditingRowKey(nextDraft.__clientKey);
    setDraftRow(nextDraft);
    setIsDraftNew(true);
    setSelectedFocusSlug("");
    addPatternDrawer.onOpen();
  }

  /**
   * Closes the active inline editor.
   */
  function cancelEditing() {
    setEditingRowKey("");
    setDraftRow(null);
    setIsDraftNew(false);
    setSelectedFocusSlug("");
    addPatternDrawer.onClose();
  }

  /**
   * Persists the current draft row.
   */
  function saveDraftRow() {
    if (!draftRow || !isCompleteRow(draftRow)) {
      return;
    }

    const nextRow = cloneRows([draftRow])[0];
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
   * Deletes one row and persists the change immediately.
   * @param {string} rowKey
   */
  function deleteRow(rowKey) {
    const nextRows = rows.filter((row) => row.__clientKey !== rowKey);
    setRows(nextRows);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );

    if (editingRowKey === rowKey) {
      cancelEditing();
    }
  }

  /**
   * Adds the selected focus to the current draft.
   */
  function addSelectedFocus() {
    const focusSlug = readTrimmedString(selectedFocusSlug);
    if (!focusSlug) {
      return;
    }

    setDraftRow((currentValue) => {
      if (!currentValue || currentValue.focusSlugs.includes(focusSlug)) {
        return currentValue;
      }

      return {
        ...currentValue,
        focusSlugs: [...currentValue.focusSlugs, focusSlug]
      };
    });
    setSelectedFocusSlug("");
  }

  /**
   * Removes one focus from the current draft.
   * @param {string} focusSlug
   */
  function removeFocus(focusSlug) {
    setDraftRow((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            focusSlugs: currentValue.focusSlugs.filter((value) => value !== focusSlug)
          }
        : currentValue
    );
  }

  /**
   * Reorders one focus chip within the current draft.
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  function reorderFocus(fromIndex, toIndex) {
    setDraftRow((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            focusSlugs: moveItem(currentValue.focusSlugs, fromIndex, toIndex)
          }
        : currentValue
    );
  }

  /**
   * Updates one industry target field in the current draft.
   * @param {number} index
   * @param {"name"|"score"} field
   * @param {string} value
   */
  function updateIndustryTarget(index, field, value) {
    setDraftRow((currentValue) => {
      if (!currentValue) {
        return currentValue;
      }

      return {
        ...currentValue,
        industryTargets: currentValue.industryTargets.map((target, targetIndex) =>
          targetIndex === index
            ? {
                ...target,
                [field]: value
              }
            : target
        )
      };
    });
  }

  /**
   * Adds one empty industry target row to the draft.
   */
  function addIndustryTarget() {
    setDraftRow((currentValue) =>
      currentValue
        ? {
            ...currentValue,
            industryTargets: [...currentValue.industryTargets, buildEmptyIndustryTarget()]
          }
        : currentValue
    );
  }

  /**
   * Removes one industry target row from the draft.
   * @param {number} index
   */
  function removeIndustryTarget(index) {
    setDraftRow((currentValue) => {
      if (!currentValue) {
        return currentValue;
      }

      const nextTargets = currentValue.industryTargets.filter((_target, targetIndex) => targetIndex !== index);
      return {
        ...currentValue,
        industryTargets: nextTargets.length ? nextTargets : [buildEmptyIndustryTarget()]
      };
    });
  }

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="md">{displayName}</Heading>
            <Text color="gray.600" mt={1}>
              Ordered Focus-to-Industry crosswalk rows for post-segmentation scoring.
            </Text>
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
            <FormControl maxW={{ base: "100%", md: "360px" }}>
              <FormLabel mb={2}>Search</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Filter by focus, industry output, or note"
                />
              </InputGroup>
            </FormControl>

            <Button colorScheme="blue" onClick={startAddingRow} isDisabled={Boolean(editingRowKey)}>
              Add Pattern
            </Button>
          </Flex>

          <Box overflow="auto" pb={1}>
            {visibleRows.length ? (
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Focuses Found (Ordered)</Th>
                    <Th>Derived Industry</Th>
                    <Th>Notes</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {visibleRows.map((row) => {
                    const notes = readTrimmedString(row.notes);
                    const highlightState = rowHighlightStateByKey[row.__clientKey];
                    const rowBackground =
                      highlightState === "saving" ? "blue.50" : highlightState === "saved" ? "green.50" : "white";
                    const rowHoverBackground =
                      highlightState === "saving" ? "blue.100" : highlightState === "saved" ? "green.100" : "blackAlpha.50";

                    return (
                      <Tr key={row.__clientKey} bg={rowBackground} _hover={{ bg: rowHoverBackground }}>
                        <Td verticalAlign="middle">
                          <Wrap spacing={2}>
                            {row.focusSlugs.map((focusSlug, index) => {
                              const focusMeta = focusMetaByToken.get(focusSlug);
                              const label = focusMeta?.label || focusSlug;
                              return (
                                <Tooltip key={`${focusSlug}-${index}`} label={focusMeta?.description || "No description available."} hasArrow>
                                  <WrapItem>
                                    <Tag size="md" borderRadius="full" bg="blue.50" color="blue.900">
                                      <TagLabel>{`${index + 1}. ${label}`}</TagLabel>
                                    </Tag>
                                  </WrapItem>
                                </Tooltip>
                              );
                            })}
                          </Wrap>
                        </Td>
                        <Td verticalAlign="middle">
                          <Wrap spacing={2}>
                            {summarizeIndustryTargets(row.industryTargets).map((value) => (
                              <WrapItem key={value}>
                                <Tag size="md" borderRadius="full" bg="orange.50" color="orange.900">
                                  <TagLabel>{value}</TagLabel>
                                </Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        </Td>
                        <Td verticalAlign="middle">
                          <Flex justify="space-between" align="center" gap={4}>
                            <Tooltip label={notes || "No notes"} hasArrow openDelay={200}>
                              <IconButton
                                aria-label="View notes"
                                icon={<MdDescription />}
                                size="sm"
                                type="button"
                                variant="ghost"
                                colorScheme={notes ? "blue" : "gray"}
                              />
                            </Tooltip>
                            <HStack spacing={2} flexShrink={0}>
                              <Button size="sm" leftIcon={<EditIcon />} variant="outline" colorScheme="blue" onClick={() => startEditingRow(row.__clientKey)}>
                                Edit
                              </Button>
                              <IconButton
                                aria-label="Delete focus pattern"
                                icon={<DeleteIcon />}
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => deleteRow(row.__clientKey)}
                              />
                            </HStack>
                          </Flex>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            ) : (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={5} py={6} bg="white">
                <Text color="gray.500">
                  {rows.length ? "No Focus to Industry patterns matched the current search." : "No Focus to Industry patterns are defined yet."}
                </Text>
              </Box>
            )}
          </Box>
        </VStack>
      </Box>

      <Drawer isOpen={addPatternDrawer.isOpen && Boolean(draftRow)} placement="right" size="lg" onClose={cancelEditing}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{isDraftNew ? "Add Pattern" : "Edit Pattern"}</DrawerHeader>
          <DrawerBody pb={6}>
            {draftRow ? (
              <FocusToIndustryCard
                row={draftRow}
                focusMetaByToken={focusMetaByToken}
                industryOptions={industryOptions}
                filteredFocusOptions={filteredFocusOptions}
                selectedFocusSlug={selectedFocusSlug}
                isEditing
                onSelectedFocusChange={setSelectedFocusSlug}
                onAddFocus={addSelectedFocus}
                onRemoveFocus={removeFocus}
                onReorderFocus={reorderFocus}
                onUpdateIndustryTarget={updateIndustryTarget}
                onAddIndustryTarget={addIndustryTarget}
                onRemoveIndustryTarget={removeIndustryTarget}
                onNotesChange={(value) => setDraftRow((currentValue) => (currentValue ? { ...currentValue, notes: value } : currentValue))}
                onSave={saveDraftRow}
                onCancel={cancelEditing}
              />
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
