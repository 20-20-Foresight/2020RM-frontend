import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
import { EditIcon } from "@chakra-ui/icons";
import { Form } from "@remix-run/react";
import { useEffect, useState } from "react";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cloneRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        id: readTrimmedString(row.id),
        key: readTrimmedString(row.key),
        label: readTrimmedString(row.label),
        description: readTrimmedString(row.description),
        examplesText: readTrimmedString(row.examplesText),
        __extraFields: row && typeof row.__extraFields === "object" && !Array.isArray(row.__extraFields) ? { ...row.__extraFields } : {}
      }))
    : [];
}

function buildEmptyRow() {
  return {
    id: "",
    key: "",
    label: "",
    description: "",
    examplesText: "",
    __extraFields: {}
  };
}

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

export function DimensionDefinitionEditorPage({ data, actionData, isSaving = false }) {
  const [metadata, setMetadata] = useState(() => (data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {}));
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneRows(data.dimensionDefinition.rows));
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [draftRow, setDraftRow] = useState(buildEmptyRow);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    setMetadata(data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {});
    setDescription(data.description || "");
    setRows(cloneRows(data.dimensionDefinition.rows));
  }, [data.description, data.dimensionDefinition.rows, data.id, data.metadata, data.version]);

  function openEditor(rowIndex) {
    setEditingRowIndex(rowIndex);
    setDraftRow(rowIndex == null ? buildEmptyRow() : cloneRows([rows[rowIndex]])[0] || buildEmptyRow());
    onOpen();
  }

  function closeEditor() {
    setEditingRowIndex(null);
    setDraftRow(buildEmptyRow());
    onClose();
  }

  function saveDraftRow() {
    const nextRow = cloneRows([draftRow])[0];
    if (editingRowIndex == null) {
      setRows((currentRows) => [...currentRows, nextRow]);
    } else {
      setRows((currentRows) => currentRows.map((row, index) => (index === editingRowIndex ? nextRow : row)));
    }
    closeEditor();
  }

  function deleteDraftRow() {
    if (editingRowIndex == null) {
      closeEditor();
      return;
    }
    setRows((currentRows) => currentRows.filter((_, index) => index !== editingRowIndex));
    closeEditor();
  }

  function updateDraftField(field, value) {
    setDraftRow((currentRow) => ({
      ...currentRow,
      [field]: value
    }));
  }

  function updateMetadata(key, value) {
    setMetadata((currentMetadata) => ({
      ...(currentMetadata && typeof currentMetadata === "object" ? currentMetadata : {}),
      [key]: value
    }));
  }

  const displayName = readTrimmedString(metadata?.name) || data.name;

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="md">{displayName}</Heading>
            {data.lastmodifiedby ? (
              <Text color="gray.600" mt={2}>
                {`Last modified ${formatTimestamp(data.lastmodifieddate)} by ${data.lastmodifiedby}`}
              </Text>
            ) : null}
          </Box>
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
          <input type="hidden" name="customDocumentType" value="dimension-definition" />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="metadata" value={JSON.stringify(metadata)} />
          <input type="hidden" name="expectedVersion" value={data.version == null ? "" : String(data.version)} />
          <input type="hidden" name="document" value={JSON.stringify(data.document ?? null)} />
          <input type="hidden" name="dimensionDefinitionRows" value={JSON.stringify(rows)} />
          <input type="hidden" name="editor" value={JSON.stringify(data.editor ?? null)} />

          <VStack align="stretch" spacing={4} h="100%" minH="0">
            {description ? (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={4} py={3}>
                <Text color="gray.700" whiteSpace="pre-wrap">
                  {description}
                </Text>
              </Box>
            ) : null}

            <Flex justify="space-between" align={{ base: "stretch", xl: "end" }} gap={4} wrap="wrap">
              <Box />
              <HStack spacing={3}>
                <Button type="button" variant="outline" onClick={() => openEditor(null)}>
                  Add Dimension
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
                      <Th>Key</Th>
                      <Th>Label</Th>
                      <Th>Description</Th>
                      <Th>Examples</Th>
                      <Th textAlign="right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {rows.length ? (
                      rows.map((row, rowIndex) => (
                        <Tr key={row.id || `dimension-row-${rowIndex}`}>
                          <Td>{row.key}</Td>
                          <Td>{row.label}</Td>
                          <Td>{row.description || ""}</Td>
                          <Td whiteSpace="pre-wrap">{row.examplesText || ""}</Td>
                          <Td textAlign="right">
                            <IconButton
                              aria-label={`Edit dimension ${row.label || row.key || rowIndex + 1}`}
                              icon={<EditIcon />}
                              size="sm"
                              type="button"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => openEditor(rowIndex)}
                            />
                          </Td>
                        </Tr>
                      ))
                    ) : (
                      <Tr>
                        <Td colSpan={5}>
                          <Text color="gray.500">No dimensions are defined yet.</Text>
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

      <Modal isOpen={isOpen} onClose={closeEditor} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingRowIndex == null ? "Add Dimension" : "Edit Dimension"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel>Key</FormLabel>
                <Input value={draftRow.key} onChange={(event) => updateDraftField("key", event.target.value)} bg="white" />
              </FormControl>
              <FormControl>
                <FormLabel>Label</FormLabel>
                <Input value={draftRow.label} onChange={(event) => updateDraftField("label", event.target.value)} bg="white" />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea value={draftRow.description} onChange={(event) => updateDraftField("description", event.target.value)} minH="112px" bg="white" />
              </FormControl>
              <FormControl>
                <FormLabel>Examples</FormLabel>
                <Textarea value={draftRow.examplesText} onChange={(event) => updateDraftField("examplesText", event.target.value)} minH="112px" bg="white" />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              {editingRowIndex == null ? null : (
                <Button variant="ghost" colorScheme="red" onClick={deleteDraftRow}>
                  Delete Dimension
                </Button>
              )}
              <Button variant="ghost" onClick={closeEditor}>
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
