import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
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
import { Form, useLocation, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";

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
  return Object.fromEntries(
    columns.map((column) => [column, ""])
  );
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
 * Renders the list/detail shell for the admin data routes.
 * @param {{
 *   items: Array<{
 *     id: string|null,
 *     name: string,
 *     description: string,
 *     lastmodifieddate: string|null,
 *     lastmodifiedby: string|null
 *   }>,
 *   error?: {message?: string}|null,
 *   children?: React.ReactNode
 * }} props
 * @returns {JSX.Element}
 */
export function AdminDataShell({ items, error, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="md">Data</Heading>
        <Text color="gray.600" mt={2}>
          Edit shared admin data sets through the backend admin data API.
        </Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", xl: "minmax(340px, 420px) minmax(0, 1fr)" }} gap={6} alignItems="start">
        <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
          <Heading size="sm" mb={4}>
            Data Sets
          </Heading>

          {error?.message ? (
            <Alert status="error" borderRadius="md" mb={4}>
              <AlertIcon />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}

          {items.length ? (
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
              <Box maxH={{ base: "none", xl: "72vh" }} overflow="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        Name
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        Description
                      </Th>
                      <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                        Modified
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {items.map((item) => {
                      const itemPath = buildAdminDataPath(item.id);
                      const isActive = location.pathname === itemPath;
                      const isClickable = Boolean(item.id);

                      return (
                        <Tr
                          key={item.id || item.name}
                          bg={isActive ? "blue.50" : "transparent"}
                          cursor={isClickable ? "pointer" : "default"}
                          _hover={
                            isClickable
                              ? {
                                  bg: isActive ? "blue.100" : "gray.50"
                                }
                              : undefined
                          }
                          onClick={() => {
                            if (isClickable) {
                              navigate(itemPath);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (!isClickable) {
                              return;
                            }

                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              navigate(itemPath);
                            }
                          }}
                          role={isClickable ? "link" : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                        >
                          <Td verticalAlign="top">
                            <Text color={isActive ? "blue.900" : "gray.800"} fontWeight="semibold">
                              {item.name}
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
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          ) : (
            <Text color="gray.600">No admin data sets were returned.</Text>
          )}
        </Box>

        <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
          {children}
        </Box>
      </Grid>
    </VStack>
  );
}

/**
 * Renders the empty detail state for `/admin/data`.
 * @returns {JSX.Element}
 */
export function AdminDataIndexPanel() {
  return (
    <VStack align="stretch" spacing={4} minH="320px" justify="center">
      <Heading size="sm">Select A Data Set</Heading>
      <Text color="gray.600">
        Choose one item from the list to review its metadata, edit the table rows, and save a new version.
      </Text>
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

  useEffect(() => {
    setDescription(data.description || "");
    setRows(cloneRows(data.editor.rows));
  }, [data.description, data.editor.rows, data.id, data.version]);

  /**
   * Updates one cell inside the editor table.
   * @param {number} rowIndex
   * @param {string} column
   * @param {string} value
   */
  function handleRowChange(rowIndex, column, value) {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [column]: value
            }
          : row
      )
    );
  }

  /**
   * Appends an empty table row.
   */
  function handleAddRow() {
    setRows((currentRows) => [...currentRows, buildEmptyRow(data.editor.columns)]);
  }

  /**
   * Removes one row from the editor.
   * @param {number} rowIndex
   */
  function handleRemoveRow(rowIndex) {
    setRows((currentRows) => currentRows.filter((_, index) => index !== rowIndex));
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <HStack justify="space-between" align="start" gap={4} flexWrap="wrap">
          <Box>
            <Heading size="md">{data.name}</Heading>
            <Text color="gray.500" mt={2}>
              {data.id || "Unknown id"}
            </Text>
          </Box>
          <HStack spacing={2} flexWrap="wrap">
            {data.shape ? <Badge colorScheme="blue">{data.shape}</Badge> : null}
            {data.version != null ? <Badge colorScheme="gray">Version {data.version}</Badge> : null}
          </HStack>
        </HStack>
        <Text color="gray.600" mt={3}>
          Last modified {formatTimestamp(data.lastmodifieddate)} by {data.lastmodifiedby || "Unknown"}.
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
            Saved version {actionData.saved?.version != null ? actionData.saved.version : "updated"} successfully.
          </AlertDescription>
        </Alert>
      ) : null}

      {data.editor.columns.length ? (
        <Form method="post">
          <input type="hidden" name="shape" value={data.shape || ""} />
          <input type="hidden" name="expectedVersion" value={data.version == null ? "" : String(data.version)} />
          <input type="hidden" name="columns" value={JSON.stringify(data.editor.columns)} />
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          <input type="hidden" name="document" value={JSON.stringify(data.document ?? null)} />

          <VStack align="stretch" spacing={5}>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                name="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                resize="vertical"
                minH="112px"
              />
            </FormControl>

            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
              <Box maxH="60vh" overflow="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      {data.editor.columns.map((column) => (
                        <Th key={column} position="sticky" top={0} bg="gray.50" zIndex={1}>
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
                      rows.map((row, rowIndex) => (
                        <Tr key={`${data.id || "row"}-${rowIndex}`}>
                          {data.editor.columns.map((column) => (
                            <Td key={`${rowIndex}-${column}`}>
                              <Input
                                size="sm"
                                value={row[column] || ""}
                                onChange={(event) => handleRowChange(rowIndex, column, event.target.value)}
                                bg="white"
                              />
                            </Td>
                          ))}
                          <Td textAlign="right" whiteSpace="nowrap">
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleRemoveRow(rowIndex)}
                            >
                              Remove
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={data.editor.columns.length + 1}>
                          <Text color="gray.500">No rows yet. Add the first row below.</Text>
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            </Box>

            <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <Button type="button" variant="outline" onClick={handleAddRow}>
                Add Row
              </Button>
              <Button type="submit" colorScheme="blue" isLoading={isSaving} loadingText="Saving">
                Save Changes
              </Button>
            </HStack>
          </VStack>
        </Form>
      ) : (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <AlertDescription>This data set does not expose editable table columns yet.</AlertDescription>
        </Alert>
      )}
    </VStack>
  );
}
