import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
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
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
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
import { SearchIcon, SettingsIcon } from "@chakra-ui/icons";
import { useLocation } from "@remix-run/react";
import {
  filterAdminDataItems,
  listAdminDataTypes,
  sortAdminDataItems
} from "../models/admin-data-list.mjs";
import { rowMatchesColumnFilters } from "../models/admin-data-page.mjs";
import { RegexBuilder, RegexTokenDisplay, parseRegexToTokens } from "./ui/molecules/RegexBuilder";
import { ColumnFilterHeader } from "./ui/molecules/ColumnFilterHeader";
import { InlineSaveStatus } from "./InlineSaveStatus";
import { useQueuedDocumentSave } from "../hooks/useQueuedDocumentSave";

/**
 * Builds the route pathname for one admin data record.
 * @param {string|null|undefined} id
 * @returns {string}
 */
function buildAdminDataPath(id) {
  return id ? `/admin/data/${encodeURIComponent(id)}` : "/admin/data";
}

/**
 * Formats a timestamp for the admin list/detail views.
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
 * Returns a new empty editor row for the current columns.
 * @param {string[]} columns
 * @returns {Record<string, string>}
 */
function buildEmptyRow(columns) {
  return Object.fromEntries(columns.map((column) => [column, ""]));
}

function isSkillsDocument(data) {
  const candidates = [data?.id, data?.key, data?.name]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return candidates.some((value) => value === "skills" || value === "crm.data:skills" || value.endsWith(":skills"));
}

function createEditorRowId(prefix = "row") {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function splitEditorList(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Clones the current editor rows into mutable state.
 * @param {Record<string, string>[]} rows
 * @returns {Record<string, string>[]}
 */
function cloneRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        ...row
      }))
    : [];
}

/**
 * Returns true if the column should be treated as a regex pattern column.
 * Detects by column name or by sampling the values.
 * @param {string} columnName
 * @param {Record<string, string>[]} rows
 * @returns {boolean}
 */
function isRegexColumn(columnName, rows, shape, allColumns, documentContext = {}) {
  const lcName = String(columnName || "").trim().toLowerCase();
  const normalizedDocumentContext = [
    documentContext?.name,
    documentContext?.key,
    documentContext?.id
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  if (
    lcName === "name" &&
    normalizedDocumentContext.some((value) => value === "countries" || value.endsWith(":countries"))
  ) {
    return false;
  }
  if (lcName.includes("regex") || lcName.includes("pattern") || lcName.includes("regexp")) {
    return true;
  }
  // Crosswalk: detected by shape, or inferred from a ["source","target"] column pair
  if (columnName === "source") {
    if (shape === "crosswalk") return true;
    const cols = allColumns || [];
    if (cols.length === 2 && cols.includes("target")) return true;
  }
  // Heuristic: any value that looks like a regex pattern
  const nonEmpty = rows.map((r) => r[columnName]).filter(Boolean);
  return nonEmpty.some(
    (v) => v.startsWith("^") || v.endsWith("$") || /\(\?:|\\[sdbwS]|\[[A-Za-z]/.test(v)
  );
}

/**
 * Renders the top bar shared by admin data pages.
 * @param {{
 *   title: string,
 *   description: string,
 *   children?: React.ReactNode
 * }} props
 * @returns {JSX.Element}
 */
function AdminDataPageHeader({ title, description, children }) {
  const hasHeading = Boolean(String(title || "").trim());
  const hasDescription = Boolean(String(description || "").trim());

  return (
    <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
      <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
        {hasHeading || hasDescription ? (
          <Box>
            {hasHeading ? <Heading size="md">{title}</Heading> : null}
            {hasDescription ? (
              <Text color="gray.600" mt={2}>
                {description}
              </Text>
            ) : null}
          </Box>
        ) : null}
        {children}
      </Flex>
    </Box>
  );
}

function getDocumentPresentation(data) {
  if (isSkillsDocument(data)) {
    return {
      visibleColumns: ["label", "domains", "also known as", "description"],
      hiddenColumns: ["id", "commonality"],
      badgeColumns: new Set(["domains"]),
      textareaColumns: new Set(["description", "also known as"]),
      wrappedColumns: new Set(["description"])
    };
  }

  return {
    visibleColumns: data.editor.columns,
    hiddenColumns: [],
    badgeColumns: new Set(),
    textareaColumns: new Set(),
    wrappedColumns: new Set()
  };
}

/**
 * Renders the list page for `/admin/data`.
 * @param {{
 *   items: Array<{
 *     id: string|null,
 *     type: string|null,
 *     name: string,
 *     description: string,
 *     lastmodifieddate: string|null,
 *     lastmodifiedby: string|null
 *   }>,
 *   selectedType?: string,
 *   searchQuery?: string,
 *   error?: {message?: string}|null
 * }} props
 * @returns {JSX.Element}
 */
export function AdminDataListPage({
  items,
  selectedType = "",
  searchQuery = "",
  error
}) {
  const location = useLocation();
  const sortedItems = useMemo(() => sortAdminDataItems(items), [items]);
  const knownTypes = useMemo(() => listAdminDataTypes(items), [items]);
  const [activeSearchQuery, setActiveSearchQuery] = useState(searchQuery);
  const [activeType, setActiveType] = useState(selectedType);

  useEffect(() => {
    setActiveSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setActiveType(selectedType);
  }, [selectedType]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const trimmedType = activeType.trim();
    const trimmedQuery = activeSearchQuery.trim();

    if (trimmedType) {
      searchParams.set("type", trimmedType);
    } else {
      searchParams.delete("type");
    }

    if (trimmedQuery) {
      searchParams.set("q", trimmedQuery);
    } else {
      searchParams.delete("q");
    }

    const nextSearch = searchParams.toString();
    const currentUrl = `${location.pathname}${location.search}`;
    const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [activeSearchQuery, activeType, location.pathname, location.search]);

  const filteredItems = useMemo(
    () =>
      filterAdminDataItems(sortedItems, {
        type: activeType,
        query: activeSearchQuery
      }),
    [activeSearchQuery, activeType, sortedItems]
  );
  const hasActiveFilters = Boolean(activeType.trim() || activeSearchQuery.trim());

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <AdminDataPageHeader
        title="Data"
        description="Browse shared admin data sets, filter by type, and open one in the full-page editor."
      />

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" display="flex" flexDirection="column">
        {error?.message ? (
          <Alert status="error" borderRadius="md" mb={4}>
            <AlertIcon />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        <Box mb={4}>
          <HStack align="end" spacing={3} flexWrap="wrap">
            <FormControl maxW={{ base: "100%", md: "360px" }}>
              <FormLabel mb={2}>Search</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Filter by name, description, key, or type"
                  value={activeSearchQuery}
                  onChange={(event) => setActiveSearchQuery(event.target.value)}
                />
              </InputGroup>
            </FormControl>

            <FormControl maxW={{ base: "100%", md: "260px" }}>
              <FormLabel mb={2}>Type</FormLabel>
              <Select value={activeType} onChange={(event) => setActiveType(event.target.value)}>
                <option value="">All Types</option>
                {knownTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FormControl>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveSearchQuery("");
                setActiveType("");
              }}
              isDisabled={!hasActiveFilters}
            >
              Clear
            </Button>
          </HStack>
        </Box>

        {filteredItems.length ? (
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" flex="1" minH="0">
            <Box h="100%" overflow="auto">
              <Table size="sm" variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                      Name
                    </Th>
                    <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                      Type
                    </Th>
                    <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                      Description
                    </Th>
                    <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                      Modified
                    </Th>
                    <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                      Edit
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredItems.map((item) => {
                    const itemPath = buildAdminDataPath(item.id);

                    return (
                      <Tr key={item.id || item.name} _hover={{ bg: item.id ? "gray.50" : "transparent" }}>
                        <Td verticalAlign="top">
                          {item.id ? (
                            <Link
                              to={itemPath}
                              style={{
                                display: "inline-block",
                                color: "#1A202C",
                                fontWeight: 600,
                                textDecoration: "none"
                              }}
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <Text color="gray.800" fontWeight="semibold">
                              {item.name}
                            </Text>
                          )}
                        </Td>
                        <Td verticalAlign="top">
                          <Text color={item.type ? "gray.800" : "gray.400"} fontSize="sm">
                            {item.type || "Unknown"}
                          </Text>
                        </Td>
                        <Td verticalAlign="top">
                          <Text color={item.description ? "gray.700" : "gray.400"} noOfLines={3}>
                            {item.description || "No description"}
                          </Text>
                        </Td>
                        <Td verticalAlign="top">
                          <Text fontSize="sm">{formatTimestamp(item.lastmodifieddate)}</Text>
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            {item.lastmodifiedby || "Unknown"}
                          </Text>
                        </Td>
                        <Td verticalAlign="top">
                          {item.id ? (
                            <Button as={Link} to={itemPath} size="sm" colorScheme="blue" variant="outline">
                              Edit
                            </Button>
                          ) : (
                            <Text color="gray.400">Unavailable</Text>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>
        ) : (
          <Text color="gray.600">
            {items.length ? "No admin data sets matched the current filter." : "No admin data sets were returned."}
          </Text>
        )}
      </Box>
    </Box>
  );
}

/**
 * Renders a fallback panel when no safe table editor can be built.
 * @param {{data: {document: unknown}}} props
 * @returns {JSX.Element}
 */
function AdminDataEditorFallback({ data }) {
  return (
    <VStack align="stretch" spacing={4}>
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertDescription>
          This data set did not include an explicit editor payload, and the frontend could not safely infer one from
          the returned document.
        </AlertDescription>
      </Alert>

      <Text color="gray.600">
        The editor expects either `editor.columns` plus `editor.rows`, or a recognizable document shape such as
        `crosswalk`, `list`, `keyvalue`, or `object`.
      </Text>

      <Box
        as="pre"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        bg="gray.50"
        p={4}
        overflow="auto"
        fontSize="sm"
        whiteSpace="pre-wrap"
      >
        {JSON.stringify(data.document ?? null, null, 2)}
      </Box>
    </VStack>
  );
}

/**
 * Renders the detail editor for one admin data document.
 * @param {{
 *   data: {
 *     id: string|null,
 *     name: string,
 *     description: string,
 *     shape: string|null,
 *     version: number|null,
 *     lastmodifieddate: string|null,
 *     lastmodifiedby: string|null,
 *     document: unknown,
 *     editor: {columns: string[], rows: Record<string, string>[]}
 *   },
 *   actionData?: {ok?: boolean, error?: {message?: string}|null, saved?: {version?: number|null}|null}|undefined,
 *   isSaving?: boolean
 * }} props
 * @returns {JSX.Element}
 */
export function AdminDataDetailEditor({ data, actionData, isSaving = false }) {
  const location = useLocation();
  const documentPresentation = useMemo(() => getDocumentPresentation(data), [data]);
  const [metadata, setMetadata] = useState(() => (data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {}));
  const [draftMetadata, setDraftMetadata] = useState(() => (data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {}));
  const [draftDescription, setDraftDescription] = useState(data.description || "");
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneRows(data.editor.rows));
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [pendingRegex, setPendingRegex] = useState({});
  const [filters, setFilters] = useState({});
  const [draftFilters, setDraftFilters] = useState({});
  const [openFilterKeys, setOpenFilterKeys] = useState({});
  const skipDescriptionAutoSaveRef = useRef(true);
  const {
    isOpen: isRowDrawerOpen,
    onOpen: openRowDrawer,
    onClose: closeRowDrawer
  } = useDisclosure();
  const {
    isOpen: isMetadataDrawerOpen,
    onOpen: openMetadataDrawerState,
    onClose: closeMetadataDrawerState
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
      const formData = new FormData();
      formData.set("shape", data.shape || "");
      formData.set("description", description);
      formData.set("metadata", JSON.stringify(metadata));
      formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
      formData.set("columns", JSON.stringify(data.editor.columns));
      formData.set("rows", JSON.stringify(rows));
      formData.set("document", JSON.stringify(data.document ?? null));
      return formData;
    }
  });

  const regexColumns = useMemo(
    () =>
      new Set(
        data.editor.columns.filter((c) =>
          isRegexColumn(c, data.editor.rows, data.shape, data.editor.columns, {
            id: data.id,
            key: data.key,
            name: data.name
          })
        )
      ),
    [data.editor.columns, data.editor.rows, data.shape, data.id, data.key, data.name]
  );

  useEffect(() => {
    setMetadata(data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {});
    setDraftMetadata(data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {});
    setDescription(data.description || "");
    setDraftDescription(data.description || "");
    setRows(cloneRows(data.editor.rows));
    setEditingRowIndex(null);
    setEditingRow(null);
    setPendingRegex({});
    setFilters({});
    setDraftFilters({});
    setOpenFilterKeys({});
    skipDescriptionAutoSaveRef.current = true;
  }, [data.description, data.editor.rows, data.id, data.version]);

  useEffect(() => {
    if (skipDescriptionAutoSaveRef.current) {
      skipDescriptionAutoSaveRef.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      requestSave();
    }, 350);

    return () => clearTimeout(timer);
  }, [description]);

  function buildSaveFormData(summary, nextRows = rows, nextDescription = description, nextMetadata = metadata) {
    const formData = new FormData();
    formData.set("shape", data.shape || "");
    formData.set("description", nextDescription);
    formData.set("metadata", JSON.stringify(nextMetadata));
    formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
    formData.set("columns", JSON.stringify(data.editor.columns));
    formData.set("rows", JSON.stringify(nextRows));
    formData.set("document", JSON.stringify(data.document ?? null));
    return formData;
  }

  function handleStartEdit(rowIndex) {
    const editRow = { ...rows[rowIndex] };
    const pending = {};
    for (const col of regexColumns) {
      pending[col] = editRow[col] || "";
    }
    setEditingRowIndex(rowIndex);
    setEditingRow(editRow);
    setPendingRegex(pending);
    openRowDrawer();
  }

  function handleCancelEdit() {
    setEditingRowIndex(null);
    setEditingRow(null);
    setPendingRegex({});
    closeRowDrawer();
  }

  function handleEditRowChange(column, value) {
    setEditingRow((r) => ({ ...r, [column]: value }));
  }

  function handleEditDone() {
    const nextRow = { ...editingRow, ...pendingRegex };
    if (isSkillsDocument(data)) {
      nextRow.id = String(nextRow.id || createEditorRowId("skill"));
    }
    const nextRows =
      editingRowIndex == null || editingRowIndex >= rows.length
        ? [...rows, nextRow]
        : rows.map((row, index) => (index === editingRowIndex ? nextRow : row));
    setRows(nextRows);
    setEditingRowIndex(null);
    setEditingRow(null);
    setPendingRegex({});
    requestSave((summary) => buildSaveFormData(summary, nextRows));
    closeRowDrawer();
  }

  function handleAddRow() {
    const nextRow = buildEmptyRow(data.editor.columns);
    if (isSkillsDocument(data)) {
      nextRow.id = createEditorRowId("skill");
    }
    const pending = {};
    for (const col of regexColumns) {
      pending[col] = nextRow[col] || "";
    }
    setEditingRowIndex(rows.length);
    setEditingRow(nextRow);
    setPendingRegex(pending);
    openRowDrawer();
  }

  function handleRemoveRow(rowIndex) {
    const nextRows = rows.filter((_, index) => index !== rowIndex);
    setRows(nextRows);
    requestSave((summary) => buildSaveFormData(summary, nextRows));
    if (editingRowIndex === rowIndex) {
      handleCancelEdit();
    }
  }

  function toggleFilter(key) {
    setOpenFilterKeys((currentKeys) => ({
      ...currentKeys,
      [key]: !currentKeys[key]
    }));
  }

  function updateDraftFilter(key, value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value
    }));
  }

  function applyFilter(key, explicitValue) {
    const nextValue = String(typeof explicitValue === "string" ? explicitValue : draftFilters[key] || "").trim();

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

  function openMetadataDrawer() {
    setDraftMetadata(metadata && typeof metadata === "object" ? { ...metadata } : {});
    setDraftDescription(description);
    openMetadataDrawerState();
  }

  function closeMetadataDrawer() {
    setDraftMetadata(metadata && typeof metadata === "object" ? { ...metadata } : {});
    setDraftDescription(description);
    closeMetadataDrawerState();
  }

  function updateMetadataField(key, value) {
    setDraftMetadata((currentValue) => ({
      ...(currentValue && typeof currentValue === "object" ? currentValue : {}),
      [key]: value
    }));
  }

  function saveMetadataChanges() {
    const nextMetadata = draftMetadata && typeof draftMetadata === "object" ? { ...draftMetadata } : {};
    const nextDescription = draftDescription;
    skipDescriptionAutoSaveRef.current = true;
    setMetadata(nextMetadata);
    setDescription(nextDescription);
    requestSave((summary) => buildSaveFormData(summary, rows, nextDescription, nextMetadata));
    closeMetadataDrawerState();
  }

  const isEditing = editingRowIndex !== null;
  const visibleColumns = documentPresentation.visibleColumns.filter((column) => data.editor.columns.includes(column));
  const colCount = visibleColumns.length + 1;
  const nonRegexColumns = visibleColumns.filter((c) => !regexColumns.has(c));
  const regexColumnsArr = [...regexColumns];
  const filteredRows = rows.filter((row) => rowMatchesColumnFilters(row, filters));
  const displayName = String(metadata?.name || data.name || "").trim() || data.name;
  const displayDescription = String(description || "").trim();

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <AdminDataPageHeader
        title=""
        description=""
      >
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap" w="full">
          <Box>
            <HStack spacing={3} align="center" flexWrap="wrap">
              <Heading size="md">{displayName}</Heading>
              {data.version != null ? <Badge colorScheme="gray">Version {data.version}</Badge> : null}
            </HStack>
            {displayDescription ? (
              <Text color="gray.600" mt={2}>
                {displayDescription}
              </Text>
            ) : null}
          </Box>

          <HStack spacing={2} align="center">
            <Menu placement="bottom-end">
              <MenuButton
                as={Button}
                variant="ghost"
                size="sm"
                minW="auto"
                px={2}
                aria-label="Editor actions"
              >
                <SettingsIcon />
              </MenuButton>
              <MenuList>
                <MenuItem onClick={openMetadataDrawer}>Edit Metadata</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </AdminDataPageHeader>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" display="flex" flexDirection="column">
        {saveError?.message || actionData?.error?.message ? (
          <Alert status="error" borderRadius="md" mb={4}>
            <AlertIcon />
            <AlertDescription>{saveError?.message || actionData.error.message}</AlertDescription>
          </Alert>
        ) : null}

        {data.editor.columns.length ? (
          <Box
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0
            }}
          >
            <VStack align="stretch" spacing={4} h="100%" minH="0">
              <Flex justify="space-between" align={{ base: "stretch", xl: "end" }} gap={4} wrap="wrap">
                <Box />
                <HStack spacing={3} align="center" flexWrap="wrap">
                  <Button type="button" variant="outline" onClick={handleAddRow} isDisabled={isEditing}>
                    Add Row
                  </Button>
                </HStack>
              </Flex>

              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" flex="1" minH="0">
                <Box h="100%" overflow="auto">
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        {visibleColumns.map((column) => (
                          <Th
                            key={column}
                            position="sticky"
                            top={0}
                            bg={regexColumns.has(column) ? "blue.50" : "gray.50"}
                            color={regexColumns.has(column) ? "blue.700" : undefined}
                            zIndex={1}
                          >
                            <ColumnFilterHeader
                              columnKey={column}
                              label={column}
                              isOpen={Boolean(openFilterKeys[column])}
                              activeValue={filters[column] || ""}
                              draftValue={draftFilters[column] || ""}
                              onToggle={() => toggleFilter(column)}
                              onDraftChange={(value) => updateDraftFilter(column, value)}
                              onApply={() => applyFilter(column)}
                              onClear={() => clearFilter(column)}
                            />
                          </Th>
                        ))}
                        <Th position="sticky" top={0} bg="gray.50" zIndex={1} textAlign="right">
                          Actions
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredRows.length ? (
                        filteredRows.map((row) => {
                          const rowIndex = rows.indexOf(row);
                          return (
                            <Tr key={`${data.id || "row"}-${rowIndex}`}>
                                {visibleColumns.map((column) => (
                                  <Td key={`${rowIndex}-${column}`} verticalAlign="middle">
                                    {regexColumns.has(column) ? (
                                      <RegexTokenDisplay pattern={row[column]} />
                                    ) : documentPresentation.badgeColumns.has(column) ? (
                                      row[column] ? (
                                        <HStack spacing={2} flexWrap="wrap">
                                          {splitEditorList(row[column]).map((item) => (
                                            <Badge key={`${rowIndex}-${column}-${item}`} colorScheme="blue" variant="subtle" textTransform="none">
                                              {item}
                                            </Badge>
                                          ))}
                                        </HStack>
                                      ) : (
                                        <Text fontSize="sm" color="gray.400">
                                          —
                                        </Text>
                                      )
                                    ) : (
                                      <Text
                                        fontSize="sm"
                                        color={row[column] ? "gray.800" : "gray.400"}
                                        whiteSpace={documentPresentation.wrappedColumns.has(column) ? "pre-wrap" : "normal"}
                                      >
                                        {row[column] || "—"}
                                      </Text>
                                    )}
                                  </Td>
                                ))}
                                <Td textAlign="right" whiteSpace="nowrap" verticalAlign="middle">
                                  <HStack spacing={1} justify="flex-end">
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="ghost"
                                      colorScheme="blue"
                                      onClick={() => handleStartEdit(rowIndex)}
                                      isDisabled={isEditing}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="ghost"
                                      colorScheme="red"
                                      onClick={() => handleRemoveRow(rowIndex)}
                                      isDisabled={isEditing}
                                    >
                                      Remove
                                    </Button>
                                  </HStack>
                                </Td>
                              </Tr>
                          );
                        })
                      ) : (
                        <Tr>
                          <Td colSpan={colCount}>
                            <Text color="gray.500">
                              {rows.length ? "No rows matched the current column filters." : "No rows yet. Add the first row above."}
                            </Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Box>

              <InlineSaveStatus
                isSaving={isQueuedSaving || isSaving}
                savedVisible={savedVisible}
                lastmodifieddate={saveSummary.lastmodifieddate || data.lastmodifieddate}
                lastmodifiedby={saveSummary.lastmodifiedby || data.lastmodifiedby}
              />
            </VStack>
          </Box>
        ) : (
          <AdminDataEditorFallback data={data} />
        )}
      </Box>

      <Drawer isOpen={isRowDrawerOpen} onClose={handleCancelEdit} placement="right" size="lg">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{editingRowIndex == null || editingRowIndex >= rows.length ? "Add Row" : "Edit Row"}</DrawerHeader>
          <DrawerBody pb={6}>
            <VStack align="stretch" spacing={4}>
              {nonRegexColumns.map((column) => (
                <FormControl key={column}>
                  <FormLabel>{column}</FormLabel>
                  {documentPresentation.textareaColumns.has(column) ? (
                    <Textarea
                      value={editingRow?.[column] || ""}
                      onChange={(event) => handleEditRowChange(column, event.target.value)}
                      bg="white"
                      minH={column === "description" ? "140px" : "96px"}
                    />
                  ) : (
                    <Input
                      value={editingRow?.[column] || ""}
                      onChange={(event) => handleEditRowChange(column, event.target.value)}
                      bg="white"
                    />
                  )}
                </FormControl>
              ))}

              {regexColumnsArr.map((column) => {
                const currentPattern = pendingRegex[column] || "";
                const parsed = (() => {
                  try {
                    return parseRegexToTokens(currentPattern);
                  } catch {
                    return null;
                  }
                })();

                return (
                  <Box key={column}>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={2}>
                      {column}
                    </Text>
                    {parsed === null && currentPattern ? (
                      <Alert status="warning" borderRadius="md" mb={3} py={2}>
                        <AlertIcon boxSize={4} />
                        <AlertDescription fontSize="xs">
                          Pattern uses constructs that cannot be shown visually. Editing will replace it.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <RegexBuilder
                      compact
                      initialTokens={parsed?.tokens ?? []}
                      initialAnchorStart={parsed?.anchorStart ?? false}
                      initialAnchorEnd={parsed?.anchorEnd ?? false}
                      onPatternChange={(pattern) => setPendingRegex((currentValue) => ({ ...currentValue, [column]: pattern }))}
                    />
                  </Box>
                );
              })}
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <HStack spacing={3}>
              <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button type="button" colorScheme="blue" onClick={handleEditDone} isLoading={isSaving}>
                Save Row
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
                <Input value={String(draftMetadata?.name || "")} onChange={(event) => updateMetadataField("name", event.target.value)} bg="white" />
              </FormControl>

              <FormControl>
                <FormLabel>Type</FormLabel>
                <Input value={String(draftMetadata?.type || "")} onChange={(event) => updateMetadataField("type", event.target.value)} bg="white" />
              </FormControl>

              <FormControl>
                <FormLabel>Shape</FormLabel>
                <Input value={data.shape || ""} isReadOnly bg="gray.50" />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} minH="120px" bg="white" />
              </FormControl>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <HStack spacing={3}>
              <Button type="button" variant="ghost" onClick={closeMetadataDrawer}>
                Cancel
              </Button>
              <Button type="button" colorScheme="blue" onClick={saveMetadataChanges} isLoading={isSaving}>
                Save
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
