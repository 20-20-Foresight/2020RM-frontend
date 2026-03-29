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
import { Form } from "@remix-run/react";
import { useEffect, useState } from "react";
import { MdDescription } from "react-icons/md";

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
 * Formats a timestamp for the editor header.
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

/**
 * Clones one editable row list into mutable state.
 * @param {Array<{
 *   categories?: string[],
 *   description?: string,
 *   sector?: string,
 *   industry?: string,
 *   focus?: string,
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
    notes: "",
    __branchFieldNames: Array.isArray(branchFieldNames) ? branchFieldNames.slice(0, categoryDepth) : [],
    __extraLeafFields: {}
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
 * Builds all searchable taxonomy options from the SIF taxonomy plus current rows.
 * @param {Record<string, unknown>|null|undefined} taxonomyDocument
 * @param {Array<{sector: string, industry: string, focus: string}>} rows
 * @returns {{
 *   sectorOptions: string[],
 *   industryOptions: string[],
 *   focusOptions: string[],
 *   industriesBySector: Record<string, string[]>,
 *   focusesBySectorIndustry: Record<string, string[]>
 * }}
 */
function buildTaxonomyOptions(taxonomyDocument, rows) {
  /** @type {Set<string>} */
  const sectorSet = new Set();
  /** @type {Set<string>} */
  const industrySet = new Set();
  /** @type {Set<string>} */
  const focusSet = new Set();
  /** @type {Record<string, Set<string>>} */
  const industriesBySector = {};
  /** @type {Record<string, Set<string>>} */
  const focusesBySectorIndustry = {};

  function addIndustry(sector, industry) {
    const normalizedSector = readTrimmedString(sector);
    const normalizedIndustry = readTrimmedString(industry);
    if (!normalizedSector || !normalizedIndustry) {
      return;
    }

    if (!industriesBySector[normalizedSector]) {
      industriesBySector[normalizedSector] = new Set();
    }

    industriesBySector[normalizedSector].add(normalizedIndustry);
  }

  function addFocus(sector, industry, focus) {
    const normalizedSector = readTrimmedString(sector);
    const normalizedIndustry = readTrimmedString(industry);
    const normalizedFocus = readTrimmedString(focus);
    if (!normalizedSector || !normalizedIndustry || !normalizedFocus) {
      return;
    }

    const key = `${normalizedSector}::${normalizedIndustry}`;
    if (!focusesBySectorIndustry[key]) {
      focusesBySectorIndustry[key] = new Set();
    }

    focusesBySectorIndustry[key].add(normalizedFocus);
  }

  for (const sector of Array.isArray(taxonomyDocument?.sectors) ? taxonomyDocument.sectors : []) {
    const sectorLabel = readTrimmedString(sector?.label);
    if (!sectorLabel) {
      continue;
    }

    sectorSet.add(sectorLabel);

    for (const industry of Array.isArray(sector?.industries) ? sector.industries : []) {
      const industryLabel = readTrimmedString(industry?.label);
      if (!industryLabel) {
        continue;
      }

      industrySet.add(industryLabel);
      addIndustry(sectorLabel, industryLabel);

      for (const focus of Array.isArray(industry?.focuses) ? industry.focuses : []) {
        const focusLabel = readTrimmedString(focus?.label);
        if (!focusLabel) {
          continue;
        }

        focusSet.add(focusLabel);
        addFocus(sectorLabel, industryLabel, focusLabel);
      }
    }
  }

  for (const row of Array.isArray(rows) ? rows : []) {
    const sector = readTrimmedString(row.sector);
    const industry = readTrimmedString(row.industry);
    const focus = readTrimmedString(row.focus);

    if (sector) {
      sectorSet.add(sector);
    }

    if (industry) {
      industrySet.add(industry);
      addIndustry(sector, industry);
    }

    if (focus) {
      focusSet.add(focus);
      addFocus(sector, industry, focus);
    }
  }

  return {
    sectorOptions: Array.from(sectorSet).sort((left, right) => left.localeCompare(right)),
    industryOptions: Array.from(industrySet).sort((left, right) => left.localeCompare(right)),
    focusOptions: Array.from(focusSet).sort((left, right) => left.localeCompare(right)),
    industriesBySector: Object.fromEntries(
      Object.entries(industriesBySector).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])
    ),
    focusesBySectorIndustry: Object.fromEntries(
      Object.entries(focusesBySectorIndustry).map(([key, values]) => [key, Array.from(values).sort((left, right) => left.localeCompare(right))])
    )
  };
}

/**
 * Returns whether one row matches the active filter set.
 * @param {{
 *   categories: string[],
 *   description?: string,
 *   sector: string,
 *   industry: string,
 *   focus: string
 * }} row
 * @param {Record<string, string>} filters
 * @returns {boolean}
 */
function rowMatchesFilters(row, filters) {
  for (const [key, value] of Object.entries(filters)) {
    const normalizedFilter = readTrimmedString(value);
    if (!normalizedFilter) {
      continue;
    }

    if (key.startsWith("category-")) {
      const index = Number(key.slice("category-".length));
      const cellValue = readTrimmedString(row.categories?.[index]).toLowerCase();
      if (!cellValue.includes(normalizedFilter.toLowerCase())) {
        return false;
      }
      continue;
    }

    if (key === "description") {
      const cellValue = readTrimmedString(row.description).toLowerCase();
      if (!cellValue.includes(normalizedFilter.toLowerCase())) {
        return false;
      }
      continue;
    }

    const rowValue = readTrimmedString(row[key]).toLowerCase();
    if (rowValue !== normalizedFilter.toLowerCase()) {
      return false;
    }
  }

  return true;
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
 *     taxonomyDocument: Record<string, unknown>|null
 *   },
 *   actionData?: {ok?: boolean, error?: {message?: string}|null, saved?: {version?: number|null}|null}|undefined,
 *   isSaving?: boolean
 * }} props
 * @returns {JSX.Element}
 */
export function SegmentationDefaultEditorPage({ data, actionData, isSaving = false }) {
  const categoryDepth = data.segmentationDefault.categoryColumns.length;
  const defaultBranchFieldNames = Array.isArray(data.segmentationDefault.categoryFieldNames)
    ? data.segmentationDefault.categoryFieldNames
    : [];
  const valueColumns = Array.isArray(data.segmentationDefault.valueColumns) ? data.segmentationDefault.valueColumns : [];
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

  useEffect(() => {
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
  }, [categoryDepth, data.description, data.editor, data.editorType, data.id, data.segmentationDefault.rows, data.version]);

  const taxonomyOptions = buildTaxonomyOptions(data.taxonomyDocument, rows);
  const filteredRows = rows.filter((row) => rowMatchesFilters(row, filters));
  const selectedSector = readTrimmedString(draftRow.sector);
  const selectedIndustry = readTrimmedString(draftRow.industry);
  const industryOptionsForSector = selectedSector ? taxonomyOptions.industriesBySector[selectedSector] || [] : [];
  const focusOptionsForSelection =
    selectedSector && selectedIndustry
      ? taxonomyOptions.focusesBySectorIndustry[`${selectedSector}::${selectedIndustry}`] || []
      : [];

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
    if (editingRowIndex == null) {
      setRows((currentRows) => [...currentRows, cloneSegmentationRows([draftRow], categoryDepth)[0]]);
    } else {
      setRows((currentRows) =>
        currentRows.map((row, index) => (index === editingRowIndex ? cloneSegmentationRows([draftRow], categoryDepth)[0] : row))
      );
    }

    closeRowEditor();
  }

  /**
   * Deletes the currently selected draft row.
   */
  function deleteDraftRow() {
    if (editingRowIndex == null) {
      closeRowEditor();
      return;
    }

    setRows((currentRows) => currentRows.filter((_, index) => index !== editingRowIndex));
    closeRowEditor();
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
   * Updates one SIF field on the draft row.
   * @param {"description"|"sector"|"industry"|"focus"|"notes"} field
   * @param {string} value
   */
  function updateDraftField(field, value) {
    setDraftRow((currentRow) => {
      if (field === "sector") {
        const nextIndustryOptions = value ? taxonomyOptions.industriesBySector[value] || [] : [];
        const nextIndustry = nextIndustryOptions.includes(currentRow.industry) ? currentRow.industry : "";
        const nextFocusOptions =
          value && nextIndustry ? taxonomyOptions.focusesBySectorIndustry[`${value}::${nextIndustry}`] || [] : [];
        const nextFocus = nextFocusOptions.includes(currentRow.focus) ? currentRow.focus : "";

        return {
          ...currentRow,
          sector: value,
          industry: nextIndustry,
          focus: nextFocus
        };
      }

      if (field === "industry") {
        const nextFocusOptions =
          currentRow.sector && value ? taxonomyOptions.focusesBySectorIndustry[`${currentRow.sector}::${value}`] || [] : [];
        const nextFocus = nextFocusOptions.includes(currentRow.focus) ? currentRow.focus : "";

        return {
          ...currentRow,
          industry: value,
          focus: nextFocus
        };
      }

      return {
        ...currentRow,
        [field]: value
      };
    });
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

  const displayDescription = readTrimmedString(description);
  const editorTypeLabel = readTrimmedString(editorConfig?.type) || data.editorType || "segmentation.default";

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="md">{data.name}</Heading>
            {data.lastmodifiedby ? (
              <Text color="gray.600" mt={2}>
                {`Last modified ${formatTimestamp(data.lastmodifieddate)} by ${data.lastmodifiedby}`}
              </Text>
            ) : null}
          </Box>
          <HStack spacing={3} align="center" flexWrap="wrap">
            <Button variant="link" size="sm" colorScheme="blue" onClick={openMetadataModal}>
              edit metadata
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" display="flex" flexDirection="column">
        {actionData?.error?.message ? (
          <Alert status="error" borderRadius="md" mb={4}>
            <AlertIcon />
            <AlertDescription>{actionData.error.message}</AlertDescription>
          </Alert>
        ) : null}

        {actionData?.ok ? (
          <Alert status="success" borderRadius="md" mb={4}>
            <AlertIcon />
            <AlertDescription>
              Saved version {actionData.saved?.version != null ? actionData.saved.version : "updated"} successfully.
            </AlertDescription>
          </Alert>
        ) : null}

        <Form
          method="post"
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0
          }}
        >
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="editor" value={JSON.stringify(editorConfig)} />
          <input type="hidden" name="editorType" value={data.editorType} />
          <input type="hidden" name="expectedVersion" value={data.version == null ? "" : String(data.version)} />
          <input type="hidden" name="document" value={JSON.stringify(data.document ?? null)} />
          <input type="hidden" name="segmentationStructure" value={data.segmentationDefault.structure} />
          <input type="hidden" name="segmentationRows" value={JSON.stringify(rows)} />

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
                <Button type="button" variant="outline" onClick={() => openRowEditor(null)}>
                  Add Row
                </Button>
                <Button type="submit" colorScheme="blue" isLoading={isSaving} loadingText="Saving">
                  Save Changes
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
                          columnKey="sector"
                          label="Sector"
                          isOpen={Boolean(openFilterKeys.sector)}
                          activeValue={filters.sector || ""}
                          draftValue={draftFilters.sector || ""}
                          onToggle={() => toggleFilter("sector")}
                          onDraftChange={(value) => updateDraftFilter("sector", value)}
                          onApply={(value) => applyFilter("sector", value)}
                          onClear={() => clearFilter("sector")}
                          selectOptions={taxonomyOptions.sectorOptions}
                        />
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
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
                      filteredRows.map((row, rowIndex) => (
                        <Tr key={`${data.id || "segmentation"}-${rowIndex}`}>
                          {data.segmentationDefault.categoryColumns.map((_, categoryIndex) => (
                            <Td key={`${rowIndex}-category-${categoryIndex}`}>{row.categories[categoryIndex] || ""}</Td>
                          ))}
                          {valueColumns.map((column) => (
                            <Td key={`${rowIndex}-${column.key}`}>{readTrimmedString(row[column.key])}</Td>
                          ))}
                          <Td sx={{ borderLeft: "4px double", borderLeftColor: "#CBD5E0" }}>{row.sector || ""}</Td>
                          <Td>{row.industry || ""}</Td>
                          <Td>{row.focus || ""}</Td>
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
                          </Td>
                          <Td textAlign="right" whiteSpace="nowrap">
                            <IconButton
                              aria-label={`Edit row ${rowIndex + 1}`}
                              icon={<EditIcon />}
                              size="sm"
                              type="button"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => openRowEditor(rows.indexOf(row))}
                            />
                          </Td>
                        </Tr>
                      ))
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
        </Form>
      </Box>

      <Modal isOpen={isRowModalOpen} onClose={closeRowEditor} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingRowIndex == null ? "Add Row" : "Edit Row"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
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
                <FormLabel>Sector</FormLabel>
                <Select value={draftRow.sector} onChange={(event) => updateDraftField("sector", event.target.value)} bg="white">
                  <option value="">Select sector</option>
                  {taxonomyOptions.sectorOptions.map((option) => (
                    <option key={`sector-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Industry</FormLabel>
                <Select
                  value={draftRow.industry}
                  onChange={(event) => updateDraftField("industry", event.target.value)}
                  bg="white"
                >
                  <option value="">Select industry</option>
                  {industryOptionsForSector.map((option) => (
                    <option key={`industry-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Focus</FormLabel>
                <Select value={draftRow.focus} onChange={(event) => updateDraftField("focus", event.target.value)} bg="white">
                  <option value="">Select focus</option>
                  {focusOptionsForSelection.map((option) => (
                    <option key={`focus-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
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
                <Button variant="ghost" colorScheme="red" onClick={deleteDraftRow}>
                  Delete Row
                </Button>
              )}
              <Button variant="ghost" onClick={closeRowEditor}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={saveDraftRow}>
                Apply
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
                <Input value={data.name} isReadOnly bg="gray.50" />
              </FormControl>

              <FormControl>
                <FormLabel>Namespace</FormLabel>
                <Input value={data.namespace || ""} isReadOnly bg="gray.50" />
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
            <Button onClick={closeMetadataModal}>Done</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
