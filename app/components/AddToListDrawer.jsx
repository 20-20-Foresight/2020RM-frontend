import React from "react";
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
  FormControl,
  FormLabel,
  HStack,
  Input,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";

function buildDefaultCreateState(entityType) {
  return {
    name: "",
    listTypeSlug: "LIST",
    listSubTypeSlug: entityType === "organization" ? "ORGANIZATION" : "PERSON",
  };
}

function readErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_error) {
    return {};
  }
}

export function AddToListDrawer({
  isOpen,
  onClose,
  entityType,
  entityUUID,
  onAdded = () => {},
}) {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [selectedRow, setSelectedRow] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [createMode, setCreateMode] = React.useState(false);
  const [createState, setCreateState] = React.useState(() => buildDefaultCreateState(entityType));

  const loadDestinations = React.useCallback(async (query = "") => {
    if (!entityUUID) return;
    setLoading(true);
    setError("");
    try {
      const target = new URL(
        `/api/rest/${entityType}/${encodeURIComponent(entityUUID)}/list-destinations`,
        window.location.origin
      );
      if (query.trim()) {
        target.searchParams.set("search", query.trim());
      }
      const response = await fetch(target.toString(), {
        credentials: "same-origin",
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load eligible lists.");
      }
      setRows(Array.isArray(payload?.rows) ? payload.rows : []);
    } catch (requestError) {
      setRows([]);
      setError(readErrorMessage(requestError, "Unable to load eligible lists."));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityUUID]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setRows([]);
      setSelectedRow(null);
      setError("");
      setSuccessMessage("");
      setCreateMode(false);
      setCreateState(buildDefaultCreateState(entityType));
      return;
    }

    loadDestinations("");
  }, [entityType, isOpen, loadDestinations]);

  async function handleAddToExisting() {
    if (!selectedRow?.list?.uuid) return;
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/rest/${entityType}/${encodeURIComponent(entityUUID)}/lists`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            listUUID: selectedRow.list.uuid,
            allowConversion: selectedRow.requiresConversion === true,
            reason: "manual_add",
          }),
        }
      );
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload?.message || payload?.statusExplained || "Unable to add to list.");
      }

      const nextMessage =
        payload?.statusExplained ||
        `Added to ${payload?.list?.name || selectedRow.list.name || "the selected list"}.`;
      setSuccessMessage(nextMessage);
      await onAdded(payload);
      if (selectedRow?.alreadyMember !== true) {
        setSelectedRow((current) => current ? { ...current, alreadyMember: true } : current);
      }
    } catch (requestError) {
      setError(readErrorMessage(requestError, "Unable to add to list."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAndAdd() {
    if (!createState.name.trim()) {
      setError("A list name is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await fetch(
        `/api/rest/${entityType}/${encodeURIComponent(entityUUID)}/lists`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            createList: true,
            name: createState.name.trim(),
            listTypeSlug: createState.listTypeSlug.trim() || "LIST",
            listSubTypeSlug: createState.listSubTypeSlug.trim(),
          }),
        }
      );
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(payload?.message || payload?.statusExplained || "Unable to create the list.");
      }

      setSuccessMessage(
        payload?.statusExplained ||
          `Created ${payload?.list?.name || createState.name.trim()} and added the ${entityType}.`
      );
      await onAdded(payload);
      setCreateMode(false);
      setCreateState(buildDefaultCreateState(entityType));
      await loadDestinations(search);
    } catch (requestError) {
      setError(readErrorMessage(requestError, "Unable to create the list."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">Add To List</DrawerHeader>
        <DrawerBody py={5}>
          <Stack spacing={5}>
            {error ? (
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {successMessage ? (
              <Alert status="success" borderRadius="lg">
                <AlertIcon />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            ) : null}

            <HStack justify="space-between" align="end">
              <FormControl>
                <FormLabel fontSize="sm" mb={1}>Search Lists</FormLabel>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by list name"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      loadDestinations(search);
                    }
                  }}
                />
              </FormControl>
              <Button variant="outline" onClick={() => loadDestinations(search)} isLoading={loading}>
                Search
              </Button>
            </HStack>

            <Button
              alignSelf="flex-start"
              variant={createMode ? "solid" : "outline"}
              colorScheme="blue"
              onClick={() => {
                setCreateMode((current) => !current);
                setSelectedRow(null);
                setError("");
                setSuccessMessage("");
              }}
            >
              {createMode ? "Select Existing List" : "Create New List"}
            </Button>

            {createMode ? (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" mb={1}>List Name</FormLabel>
                  <Input
                    value={createState.name}
                    onChange={(event) =>
                      setCreateState((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="New list name"
                  />
                </FormControl>
                <HStack align="start" spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>Category</FormLabel>
                    <Input
                      value={createState.listTypeSlug}
                      onChange={(event) =>
                        setCreateState((current) => ({ ...current, listTypeSlug: event.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm" mb={1}>Subcategory</FormLabel>
                    <Input
                      value={createState.listSubTypeSlug}
                      onChange={(event) =>
                        setCreateState((current) => ({ ...current, listSubTypeSlug: event.target.value }))
                      }
                    />
                  </FormControl>
                </HStack>
                <Button
                  colorScheme="blue"
                  alignSelf="flex-start"
                  onClick={handleCreateAndAdd}
                  isLoading={submitting}
                >
                  Create List And Add
                </Button>
              </Stack>
            ) : (
              <VStack align="stretch" spacing={3}>
                {rows.length ? (
                  rows.map((row) => {
                    const isSelected = row?.list?.uuid === selectedRow?.list?.uuid;
                    return (
                      <Box
                        key={row?.list?.uuid || row?.list?.name}
                        borderWidth="1px"
                        borderColor={isSelected ? "blue.300" : "gray.200"}
                        borderRadius="lg"
                        p={4}
                        bg={isSelected ? "blue.50" : "white"}
                      >
                        <HStack justify="space-between" align="start" spacing={3}>
                          <Box minW="0">
                            <Text fontWeight="semibold" color="gray.900">
                              {row?.list?.name || row?.list?.uuid || "Unnamed list"}
                            </Text>
                            <HStack spacing={2} mt={2} flexWrap="wrap">
                              {row?.list?.listTypeSlug ? (
                                <Badge textTransform="none">{row.list.listTypeSlug}</Badge>
                              ) : null}
                              {row?.list?.listSubTypeSlug ? (
                                <Badge textTransform="none" colorScheme="gray">
                                  {row.list.listSubTypeSlug}
                                </Badge>
                              ) : null}
                              {row?.requiresConversion ? (
                                <Badge textTransform="none" colorScheme="orange">
                                  Converts to ad hoc
                                </Badge>
                              ) : null}
                              {row?.alreadyMember ? (
                                <Badge textTransform="none" colorScheme="green">
                                  Already a member
                                </Badge>
                              ) : null}
                            </HStack>
                          </Box>
                          <Button
                            size="sm"
                            variant={isSelected ? "solid" : "outline"}
                            colorScheme="blue"
                            onClick={() => {
                              setSelectedRow(row);
                              setError("");
                              setSuccessMessage("");
                            }}
                            isDisabled={row?.alreadyMember === true}
                          >
                            {row?.alreadyMember ? "Already Added" : "Select"}
                          </Button>
                        </HStack>
                      </Box>
                    );
                  })
                ) : (
                  <Alert status="info" borderRadius="lg">
                    <AlertIcon />
                    <AlertDescription>
                      {loading ? "Loading eligible lists..." : "No eligible lists matched this search."}
                    </AlertDescription>
                  </Alert>
                )}
              </VStack>
            )}

            {!createMode && selectedRow ? (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={4} bg="gray.50">
                <Text fontWeight="semibold" color="gray.900">
                  {selectedRow.list?.name || "Selected list"}
                </Text>
                {selectedRow.requiresConversion ? (
                  <Alert status="warning" borderRadius="lg" mt={3}>
                    <AlertIcon />
                    <AlertDescription fontSize="sm">
                      Adding here will convert the list to ad hoc. Refresh will be disabled, any schedule will be removed, and the prior definition will be preserved as inactive provenance.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <Button
                  mt={4}
                  colorScheme="blue"
                  onClick={handleAddToExisting}
                  isLoading={submitting}
                  isDisabled={selectedRow.alreadyMember === true}
                >
                  {selectedRow.requiresConversion ? "Convert And Add" : "Add To List"}
                </Button>
              </Box>
            ) : null}
          </Stack>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default AddToListDrawer;
