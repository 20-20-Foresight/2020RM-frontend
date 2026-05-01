import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
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
import { SearchIcon } from "@chakra-ui/icons";
import { Form, Link, useLocation } from "@remix-run/react";
import {
  filterAdminDataItems,
  listAdminDataTypes,
  sortAdminDataItems
} from "../models/admin-data-list.mjs";
import { RegexBuilder, RegexTokenDisplay, parseRegexToTokens } from "./ui/molecules/RegexBuilder";

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
function isRegexColumn(columnName, rows, shape, allColumns) {
  const lcName = columnName.toLowerCase();
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
  return (
    <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
      <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
        <Box>
          <Heading size="md">{title}</Heading>
          <Text color="gray.600" mt={2}>
            {description}
          </Text>
        </Box>
        {children}
      </Flex>
    </Box>
  );
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
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneRows(data.editor.rows));
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [pendingRegex, setPendingRegex] = useState({});

  const regexColumns = useMemo(
    () => new Set(data.editor.columns.filter((c) => isRegexColumn(c, data.editor.rows, data.shape, data.editor.columns))),
    [data.editor.columns, data.editor.rows, data.shape]
  );

  useEffect(() => {
    setDescription(data.description || "");
    setRows(cloneRows(data.editor.rows));
    setEditingRowIndex(null);
    setEditingRow(null);
    setPendingRegex({});
  }, [data.description, data.editor.rows, data.id, data.version]);

  function handleStartEdit(rowIndex) {
    const editRow = { ...rows[rowIndex] };
    const pending = {};
    for (const col of regexColumns) {
      pending[col] = editRow[col] || "";
    }
    setEditingRowIndex(rowIndex);
    setEditingRow(editRow);
    setPendingRegex(pending);
  }

  function handleCancelEdit() {
    setEditingRowIndex(null);
    setEditingRow(null);
    setPendingRegex({});
  }

  function handleEditRowChange(column, value) {
    setEditingRow((r) => ({ ...r, [column]: value }));
  }

  function handleEditDone() {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === editingRowIndex ? { ...editingRow, ...pendingRegex } : row
      )
    );
    setEditingRowIndex(null);
    setEditingRow(null);
    setPendingRegex({});
  }

  function handleAddRow() {
    setRows((currentRows) => [...currentRows, buildEmptyRow(data.editor.columns)]);
  }

  function handleRemoveRow(rowIndex) {
    setRows((currentRows) => currentRows.filter((_, index) => index !== rowIndex));
  }

  const isEditing = editingRowIndex !== null;
  const colCount = data.editor.columns.length + 1;
  const nonRegexColumns = data.editor.columns.filter((c) => !regexColumns.has(c));
  const regexColumnsArr = [...regexColumns];

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <AdminDataPageHeader
        title={data.name}
        description={`${data.id || "Unknown id"}${data.lastmodifiedby ? ` • Last modified ${formatTimestamp(data.lastmodifieddate)} by ${data.lastmodifiedby}` : ""}`}
      >
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
          {data.shape ? <Badge colorScheme="blue">{data.shape}</Badge> : null}
          {data.version != null ? <Badge colorScheme="gray">Version {data.version}</Badge> : null}
        </HStack>
      </AdminDataPageHeader>

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

        {data.editor.columns.length ? (
          <Form
            method="post"
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0
            }}
          >
            <input type="hidden" name="shape" value={data.shape || ""} />
            <input type="hidden" name="expectedVersion" value={data.version == null ? "" : String(data.version)} />
            <input type="hidden" name="columns" value={JSON.stringify(data.editor.columns)} />
            <input type="hidden" name="rows" value={JSON.stringify(rows)} />
            <input type="hidden" name="document" value={JSON.stringify(data.document ?? null)} />

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
                  <Button type="button" variant="outline" onClick={handleAddRow} isDisabled={isEditing}>
                    Add Row
                  </Button>
                  <Button
                    type="submit"
                    colorScheme="blue"
                    isLoading={isSaving}
                    loadingText="Saving"
                    isDisabled={isEditing}
                  >
                    Save Changes
                  </Button>
                </HStack>
              </Flex>

              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" flex="1" minH="0">
                <Box h="100%" overflow="auto">
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        {data.editor.columns.map((column) => (
                          <Th
                            key={column}
                            position="sticky"
                            top={0}
                            bg={regexColumns.has(column) ? "blue.50" : "gray.50"}
                            color={regexColumns.has(column) ? "blue.700" : undefined}
                            zIndex={1}
                          >
                            {column}
                          </Th>
                        ))}
                        <Th position="sticky" top={0} bg="gray.50" zIndex={1} textAlign="right">
                          Actions
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rows.length ? (
                        rows.map((row, rowIndex) => {
                          const isThisRowEditing = editingRowIndex === rowIndex;
                          return (
                            <React.Fragment key={`${data.id || "row"}-${rowIndex}`}>
                              {/* View row */}
                              <Tr bg={isThisRowEditing ? "blue.50" : undefined}>
                                {data.editor.columns.map((column) => (
                                  <Td key={`${rowIndex}-${column}`} verticalAlign="middle" py={isThisRowEditing ? 2 : undefined}>
                                    {regexColumns.has(column) ? (
                                      <RegexTokenDisplay
                                        pattern={
                                          isThisRowEditing
                                            ? (pendingRegex[column] ?? row[column])
                                            : row[column]
                                        }
                                      />
                                    ) : (
                                      <Text
                                        fontSize="sm"
                                        color={
                                          (isThisRowEditing ? editingRow[column] : row[column])
                                            ? "gray.800"
                                            : "gray.400"
                                        }
                                      >
                                        {(isThisRowEditing ? editingRow[column] : row[column]) || "—"}
                                      </Text>
                                    )}
                                  </Td>
                                ))}
                                <Td textAlign="right" whiteSpace="nowrap" verticalAlign="middle">
                                  {isThisRowEditing ? (
                                    <HStack spacing={1} justify="flex-end">
                                      <Button
                                        type="button"
                                        size="xs"
                                        variant="ghost"
                                        onClick={handleCancelEdit}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        type="button"
                                        size="xs"
                                        colorScheme="blue"
                                        onClick={handleEditDone}
                                      >
                                        Done
                                      </Button>
                                    </HStack>
                                  ) : (
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
                                  )}
                                </Td>
                              </Tr>

                              {/* Edit expansion row */}
                              {isThisRowEditing && (
                                <Tr>
                                  <Td colSpan={colCount} py={3} px={4} bg="blue.50" borderTop="none">
                                    <Box
                                      bg="white"
                                      border="1px solid"
                                      borderColor="blue.100"
                                      borderRadius="lg"
                                      p={4}
                                    >
                                      <VStack align="stretch" spacing={4}>
                                        {/* Non-regex columns */}
                                        {nonRegexColumns.length > 0 && (
                                          <HStack align="flex-start" spacing={4} flexWrap="wrap">
                                            {nonRegexColumns.map((column) => (
                                              <FormControl key={column} flex="1" minW="160px" maxW="320px">
                                                <FormLabel fontSize="xs" mb={1}>{column}</FormLabel>
                                                <Input
                                                  size="sm"
                                                  value={editingRow[column] || ""}
                                                  onChange={(e) => handleEditRowChange(column, e.target.value)}
                                                  bg="white"
                                                />
                                              </FormControl>
                                            ))}
                                          </HStack>
                                        )}

                                        {/* Regex columns */}
                                        {regexColumnsArr.map((column) => {
                                          const currentPattern = pendingRegex[column] || "";
                                          const parsed = (() => {
                                            try { return parseRegexToTokens(currentPattern); }
                                            catch { return null; }
                                          })();
                                          return (
                                            <Box key={column}>
                                              <Text
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                color="gray.500"
                                                mb={2}
                                                textTransform="uppercase"
                                                letterSpacing="wide"
                                              >
                                                {column}
                                              </Text>
                                              {parsed === null && currentPattern && (
                                                <Alert status="warning" borderRadius="md" mb={3} py={2}>
                                                  <AlertIcon boxSize={4} />
                                                  <AlertDescription fontSize="xs">
                                                    Pattern uses constructs that can't be shown visually. Editing will replace it.
                                                  </AlertDescription>
                                                </Alert>
                                              )}
                                              <RegexBuilder
                                                key={`edit-${rowIndex}-${column}`}
                                                compact
                                                initialTokens={parsed?.tokens ?? []}
                                                initialAnchorStart={parsed?.anchorStart ?? false}
                                                initialAnchorEnd={parsed?.anchorEnd ?? false}
                                                onPatternChange={(p) =>
                                                  setPendingRegex((prev) => ({ ...prev, [column]: p }))
                                                }
                                              />
                                            </Box>
                                          );
                                        })}
                                      </VStack>
                                    </Box>
                                  </Td>
                                </Tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <Tr>
                          <Td colSpan={colCount}>
                            <Text color="gray.500">No rows yet. Add the first row above.</Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            </VStack>
          </Form>
        ) : (
          <AdminDataEditorFallback data={data} />
        )}
      </Box>
    </Box>
  );
}
