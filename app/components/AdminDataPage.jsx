import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Spinner,
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
import { Form, Link, useLocation, useNavigation } from "@remix-run/react";
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
  const navigation = useNavigation();
  const isAdminDataNavigation =
    navigation.state !== "idle" &&
    ((typeof navigation.location?.pathname === "string" &&
      navigation.location.pathname.startsWith("/admin/data")) ||
      (typeof navigation.formAction === "string" && navigation.formAction.startsWith("/admin/data")));
  const loadingLabel = navigation.state === "submitting" ? "Saving admin data..." : "Loading admin data...";

  return (
    <VStack align="stretch" spacing={6} minH="100%">
      <Box>
        <Heading size="md">Data</Heading>
        <Text color="gray.600" mt={2}>
          Edit shared admin data sets through the backend admin data API.
        </Text>
      </Box>

      <Box position="relative" flex="1" minH={{ base: "auto", xl: "calc(100vh - 170px)" }}>
        {isAdminDataNavigation ? (
          <Center
            position="absolute"
            inset={0}
            zIndex={10}
            bg="rgba(247, 250, 252, 0.76)"
            backdropFilter="blur(2px)"
            pointerEvents="none"
          >
            <VStack spacing={3} bg="white" borderRadius="lg" shadow="md" px={6} py={5}>
              <Spinner color="blue.500" thickness="3px" size="lg" />
              <Text fontWeight="medium" color="gray.700">
                {loadingLabel}
              </Text>
            </VStack>
          </Center>
        ) : null}

        <Grid
          templateColumns={{ base: "1fr", xl: "minmax(360px, 420px) minmax(0, 1fr)" }}
          gap={6}
          alignItems="stretch"
          h="100%"
          minH="inherit"
        >
        <Box bg="white" borderRadius="lg" shadow="sm" p={5} display="flex" flexDirection="column" minH="0">
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
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" flex="1" minH="0">
              <Box h="100%" overflow="auto">
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

                      return (
                        <Tr
                          key={item.id || item.name}
                          bg={isActive ? "blue.50" : "transparent"}
                          _hover={
                            item.id
                              ? {
                                  bg: isActive ? "blue.100" : "gray.50"
                                }
                              : undefined
                          }
                        >
                          <Td verticalAlign="top">
                            {item.id ? (
                              <Link
                                to={itemPath}
                                style={{
                                  display: "block",
                                  color: isActive ? "#1A365D" : "#1A202C",
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

        <Box bg="white" borderRadius="lg" shadow="sm" p={5} display="flex" flexDirection="column" minH="0">
          <Box flex="1" minH="0">
            {children}
          </Box>
        </Box>
        </Grid>
      </Box>
    </VStack>
  );
}

/**
 * Renders the empty detail state for `/admin/data`.
 * @returns {JSX.Element}
 */
export function AdminDataIndexPanel() {
  return (
    <VStack align="stretch" spacing={4} minH="100%" justify="center">
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
    <VStack align="stretch" spacing={6} h="100%" minH="100%">
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

          <VStack align="stretch" spacing={5} h="100%" minH="0">
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

            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" flex="1" minH="0">
              <Box h="100%" overflow="auto">
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
