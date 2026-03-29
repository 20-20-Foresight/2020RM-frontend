import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
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
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack
} from "@chakra-ui/react";
import { EditIcon, SearchIcon } from "@chakra-ui/icons";
import { Form, Link } from "@remix-run/react";
import { useEffect, useState } from "react";

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
 * @returns {{
 *   categories: string[],
 *   sector: string,
 *   industry: string,
 *   focus: string,
 *   notes: string,
 *   __branchFieldNames: string[],
 *   __extraLeafFields: Record<string, unknown>
 * }}
 */
function buildEmptySegmentationRow(categoryDepth) {
  return {
    categories: Array.from({ length: categoryDepth }, () => ""),
    sector: "",
    industry: "",
    focus: "",
    notes: "",
    __branchFieldNames: [],
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
 *   value: string,
 *   onToggle: () => void,
 *   onChange: (value: string) => void,
 *   selectOptions?: string[]|null,
 *   disabled?: boolean
 * }} props
 * @returns {JSX.Element}
 */
function SearchableHeader({ columnKey, label, isOpen, value, onToggle, onChange, selectOptions = null, disabled = false }) {
  return (
    <VStack align="stretch" spacing={2}>
      <HStack spacing={2} align="center">
        <Text>{label}</Text>
        {disabled ? null : (
          <IconButton
            aria-label={`Search ${columnKey}`}
            icon={<SearchIcon />}
            size="xs"
            variant={isOpen ? "solid" : "ghost"}
            colorScheme={isOpen ? "blue" : "gray"}
            onClick={onToggle}
          />
        )}
      </HStack>
      {isOpen ? (
        Array.isArray(selectOptions) ? (
          <Select size="xs" value={value} onChange={(event) => onChange(event.target.value)} bg="white">
            <option value="">All</option>
            {selectOptions.map((option) => (
              <option key={`${columnKey}-${option}`} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : (
          <Input size="xs" value={value} onChange={(event) => onChange(event.target.value)} bg="white" />
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
 *       rows: Array<{
 *         categories: string[],
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
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneSegmentationRows(data.segmentationDefault.rows, categoryDepth));
  const [filters, setFilters] = useState({});
  const [openFilterKeys, setOpenFilterKeys] = useState({});
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [draftRow, setDraftRow] = useState(() => buildEmptySegmentationRow(categoryDepth));
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    setDescription(data.description || "");
    setRows(cloneSegmentationRows(data.segmentationDefault.rows, categoryDepth));
    setFilters({});
    setOpenFilterKeys({});
  }, [categoryDepth, data.description, data.id, data.segmentationDefault.rows, data.version]);

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
        ? buildEmptySegmentationRow(categoryDepth)
        : cloneSegmentationRows([rows[rowIndex]], categoryDepth)[0] || buildEmptySegmentationRow(categoryDepth)
    );
    onOpen();
  }

  /**
   * Closes the row modal and resets draft state.
   */
  function closeRowEditor() {
    setEditingRowIndex(null);
    setDraftRow(buildEmptySegmentationRow(categoryDepth));
    onClose();
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
   * @param {"sector"|"industry"|"focus"|"notes"} field
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
  function updateFilter(key, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value
    }));
  }

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="md">{data.name}</Heading>
            <Text color="gray.600" mt={2}>
              {`${data.id || "Unknown id"}${data.lastmodifiedby ? ` • Last modified ${formatTimestamp(data.lastmodifieddate)} by ${data.lastmodifiedby}` : ""}`}
            </Text>
          </Box>
          <HStack spacing={3} align="center" flexWrap="wrap">
            <Link
              to="/admin/data"
              style={{
                color: "#2B6CB0",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              Back To Data Sets
            </Link>
            <Badge colorScheme="purple">{data.editorType}</Badge>
            {data.version != null ? <Badge colorScheme="gray">Version {data.version}</Badge> : null}
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
          <input type="hidden" name="editorType" value={data.editorType} />
          <input type="hidden" name="expectedVersion" value={data.version == null ? "" : String(data.version)} />
          <input type="hidden" name="document" value={JSON.stringify(data.document ?? null)} />
          <input type="hidden" name="segmentationStructure" value={data.segmentationDefault.structure} />
          <input type="hidden" name="segmentationRows" value={JSON.stringify(rows)} />

          <VStack align="stretch" spacing={4} h="100%" minH="0">
            <Flex justify="space-between" align={{ base: "stretch", xl: "end" }} gap={4} wrap="wrap">
              <FormControl maxW={{ base: "100%", xl: "420px" }}>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  resize="vertical"
                  minH="112px"
                />
              </FormControl>

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
                              value={filters[columnKey] || ""}
                              onToggle={() => toggleFilter(columnKey)}
                              onChange={(value) => updateFilter(columnKey, value)}
                            />
                          </Th>
                        );
                      })}
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        <SearchableHeader
                          columnKey="sector"
                          label="Sector"
                          isOpen={Boolean(openFilterKeys.sector)}
                          value={filters.sector || ""}
                          onToggle={() => toggleFilter("sector")}
                          onChange={(value) => updateFilter("sector", value)}
                          selectOptions={taxonomyOptions.sectorOptions}
                        />
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        <SearchableHeader
                          columnKey="industry"
                          label="Industry"
                          isOpen={Boolean(openFilterKeys.industry)}
                          value={filters.industry || ""}
                          onToggle={() => toggleFilter("industry")}
                          onChange={(value) => updateFilter("industry", value)}
                          selectOptions={taxonomyOptions.industryOptions}
                        />
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        <SearchableHeader
                          columnKey="focus"
                          label="Focus"
                          isOpen={Boolean(openFilterKeys.focus)}
                          value={filters.focus || ""}
                          onToggle={() => toggleFilter("focus")}
                          onChange={(value) => updateFilter("focus", value)}
                          selectOptions={taxonomyOptions.focusOptions}
                        />
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        <SearchableHeader
                          columnKey="notes"
                          label="Notes"
                          isOpen={false}
                          value=""
                          onToggle={() => {}}
                          onChange={() => {}}
                          disabled
                        />
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
                          <Td>{row.sector || ""}</Td>
                          <Td>{row.industry || ""}</Td>
                          <Td>{row.focus || ""}</Td>
                          <Td>{row.notes || ""}</Td>
                          <Td textAlign="right" whiteSpace="nowrap">
                            <IconButton
                              aria-label={`Edit row ${rowIndex + 1}`}
                              icon={<EditIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => openRowEditor(rows.indexOf(row))}
                            />
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={data.segmentationDefault.categoryColumns.length + 5}>
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

      <Modal isOpen={isOpen} onClose={closeRowEditor} size="4xl" scrollBehavior="inside">
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
    </Box>
  );
}
