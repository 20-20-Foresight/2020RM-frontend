import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Checkbox,
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
import { ArrowDownIcon, ArrowUpIcon, EditIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "@remix-run/react";
import { InlineSaveStatus } from "./InlineSaveStatus";
import { useQueuedDocumentSave } from "../hooks/useQueuedDocumentSave";
import { useRowSaveHighlight } from "../hooks/useRowSaveHighlight";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cloneRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        id: readTrimmedString(row.id),
        label: readTrimmedString(row.label),
        description: readTrimmedString(row.description),
        examplesText: readTrimmedString(row.examplesText),
        dimensionId: readTrimmedString(row.dimensionId),
        preference: row.preference == null ? null : Number(row.preference),
        deletedOn: readTrimmedString(row.deletedOn),
        __extraFields: row && typeof row.__extraFields === "object" && !Array.isArray(row.__extraFields) ? { ...row.__extraFields } : {}
      }))
    : [];
}

function buildEmptyRow(defaultDimensionId = "") {
  return {
    id: "",
    label: "",
    description: "",
    examplesText: "",
    dimensionId: defaultDimensionId,
    preference: null,
    deletedOn: "",
    __extraFields: {}
  };
}

function isRetiredRow(row) {
  return Boolean(readTrimmedString(row?.deletedOn));
}

export function CategoryEditorPage({ data, actionData, isSaving = false }) {
  const location = useLocation();
  const supportsPreference = data.categoryEditor.supportsPreference === true;
  const defaultDimensionId = data.dimensionCatalog[0]?.id || "";
  const [metadata, setMetadata] = useState(() => (data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {}));
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneRows(data.categoryEditor.rows));
  const [showRetired, setShowRetired] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [draftRow, setDraftRow] = useState(() => buildEmptyRow(defaultDimensionId));
  const { isOpen, onOpen, onClose } = useDisclosure();
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
      formData.set("customDocumentType", "categories");
      formData.set("description", description);
      formData.set("metadata", JSON.stringify(metadata));
      formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
      formData.set("document", JSON.stringify(data.document ?? null));
      formData.set("categoryRows", JSON.stringify(rows));
      formData.set("supportsPreference", supportsPreference ? "true" : "");
      formData.set("editor", JSON.stringify(data.editor ?? null));
      return formData;
    }
  });
  const { rowHighlightStateByKey, markRowsChanged } = useRowSaveHighlight({
    isSaving: isQueuedSaving,
    savedVisible,
    saveErrorMessage: saveError?.message || actionData?.error?.message || null
  });

  /**
   * Builds one background save payload for the current editor state.
   * @param {{
   *   summary: {version: number|null},
   *   nextRows?: unknown[],
   *   nextDescription?: string,
   *   nextMetadata?: Record<string, unknown>
   * }} options
   * @returns {FormData}
   */
  function buildSaveFormData({ summary, nextRows = rows, nextDescription = description, nextMetadata = metadata }) {
    const formData = new FormData();
    formData.set("customDocumentType", "categories");
    formData.set("description", nextDescription);
    formData.set("metadata", JSON.stringify(nextMetadata));
    formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
    formData.set("document", JSON.stringify(data.document ?? null));
    formData.set("categoryRows", JSON.stringify(nextRows));
    formData.set("supportsPreference", supportsPreference ? "true" : "");
    formData.set("editor", JSON.stringify(data.editor ?? null));
    return formData;
  }

  useEffect(() => {
    setMetadata(data.metadata && typeof data.metadata === "object" ? { ...data.metadata } : {});
    setDescription(data.description || "");
    setRows(cloneRows(data.categoryEditor.rows));
    setShowRetired(false);
  }, [data.categoryEditor.rows, data.description, data.id, data.metadata, data.version]);

  const visibleRows = useMemo(
    () => rows.filter((row) => showRetired || !isRetiredRow(row)),
    [rows, showRetired]
  );

  function openEditor(rowIndex) {
    setEditingRowIndex(rowIndex);
    setDraftRow(rowIndex == null ? buildEmptyRow(defaultDimensionId) : cloneRows([rows[rowIndex]])[0] || buildEmptyRow(defaultDimensionId));
    onOpen();
  }

  function closeEditor() {
    setEditingRowIndex(null);
    setDraftRow(buildEmptyRow(defaultDimensionId));
    onClose();
  }

  function saveDraftRow() {
    const nextRow = cloneRows([draftRow])[0];
    const nextRows =
      editingRowIndex == null
        ? [...rows, nextRow]
        : rows.map((row, index) => (index === editingRowIndex ? nextRow : row));

    setRows(nextRows);
    markRowsChanged([editingRowIndex == null ? nextRows.length - 1 : editingRowIndex]);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
    closeEditor();
  }

  function moveRow(rowIndex, direction) {
    const nextRows = rows.slice();
    const targetIndex = direction === "up" ? rowIndex - 1 : rowIndex + 1;
    if (targetIndex < 0 || targetIndex >= nextRows.length) {
      return;
    }
    const [movedRow] = nextRows.splice(rowIndex, 1);
    nextRows.splice(targetIndex, 0, movedRow);
    setRows(nextRows);
    markRowsChanged([targetIndex]);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
  }

  function retireRow(rowIndex) {
    const nextRows = rows.map((row, index) =>
      index === rowIndex
        ? {
            ...row,
            deletedOn: row.deletedOn || new Date().toISOString()
          }
        : row
    );
    setRows(nextRows);
    markRowsChanged([rowIndex]);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
  }

  function restoreRow(rowIndex) {
    const nextRows = rows.map((row, index) =>
      index === rowIndex
        ? {
            ...row,
            deletedOn: ""
          }
        : row
    );
    setRows(nextRows);
    markRowsChanged([rowIndex]);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
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

        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0
          }}
        >
          <VStack align="stretch" spacing={4} h="100%" minH="0">
            {description ? (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={4} py={3}>
                <Text color="gray.700" whiteSpace="pre-wrap">
                  {description}
                </Text>
              </Box>
            ) : null}

            <Flex justify="space-between" align={{ base: "stretch", xl: "end" }} gap={4} wrap="wrap">
              <Checkbox isChecked={showRetired} onChange={(event) => setShowRetired(event.target.checked)}>
                Show retired
              </Checkbox>
              <HStack spacing={3}>
                <Button type="button" variant="outline" onClick={() => openEditor(null)}>
                  Add Value
                </Button>
              </HStack>
            </Flex>

            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" flex="1" minH="0">
              <Box h="100%" overflow="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Label</Th>
                      <Th>Dimension</Th>
                      {supportsPreference ? <Th>Preference</Th> : null}
                      <Th>Description</Th>
                      <Th>Examples</Th>
                      <Th>Status</Th>
                      <Th textAlign="right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {visibleRows.length ? (
                      visibleRows.map((row) => {
                        const rowIndex = rows.indexOf(row);
                        const retired = isRetiredRow(row);
                        const dimensionLabel = data.dimensionCatalog.find((item) => item.id === row.dimensionId)?.label || row.dimensionId;

                        return (
                          <Tr
                            key={row.id || `category-row-${rowIndex}`}
                            bg={
                              rowHighlightStateByKey[String(rowIndex)] === "saving"
                                ? "blue.50"
                                : rowHighlightStateByKey[String(rowIndex)] === "saved"
                                  ? "green.50"
                                  : retired
                                    ? "gray.50"
                                    : undefined
                            }
                            transition="background-color 0.35s ease"
                          >
                            <Td>{row.label}</Td>
                            <Td>{dimensionLabel || ""}</Td>
                            {supportsPreference ? <Td>{retired ? "" : row.preference || ""}</Td> : null}
                            <Td>{row.description || ""}</Td>
                            <Td whiteSpace="pre-wrap">{row.examplesText || ""}</Td>
                            <Td>{retired ? <Text color="gray.600">Retired</Text> : <Text color="green.600">Active</Text>}</Td>
                            <Td textAlign="right" whiteSpace="nowrap">
                              {supportsPreference && !retired ? (
                                <>
                                  <IconButton
                                    aria-label={`Move ${row.label} up`}
                                    icon={<ArrowUpIcon />}
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                    onClick={() => moveRow(rowIndex, "up")}
                                  />
                                  <IconButton
                                    aria-label={`Move ${row.label} down`}
                                    icon={<ArrowDownIcon />}
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                    onClick={() => moveRow(rowIndex, "down")}
                                  />
                                </>
                              ) : null}
                              <IconButton
                                aria-label={`Edit ${row.label || rowIndex + 1}`}
                                icon={<EditIcon />}
                                size="sm"
                                type="button"
                                variant="ghost"
                                colorScheme="blue"
                                onClick={() => openEditor(rowIndex)}
                              />
                              {retired ? (
                                <Button size="sm" variant="ghost" colorScheme="green" onClick={() => restoreRow(rowIndex)}>
                                  Restore
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" colorScheme="red" onClick={() => retireRow(rowIndex)}>
                                  Retire
                                </Button>
                              )}
                            </Td>
                          </Tr>
                        );
                      })
                    ) : (
                      <Tr>
                        <Td colSpan={supportsPreference ? 7 : 6}>
                          <Text color="gray.500">No values are available for this category document.</Text>
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

      <Modal isOpen={isOpen} onClose={closeEditor} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingRowIndex == null ? "Add Value" : "Edit Value"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel>Label</FormLabel>
                <Input value={draftRow.label} onChange={(event) => updateDraftField("label", event.target.value)} bg="white" />
              </FormControl>
              <FormControl>
                <FormLabel>Dimension</FormLabel>
                <Select value={draftRow.dimensionId} onChange={(event) => updateDraftField("dimensionId", event.target.value)} bg="white">
                  <option value="">Select dimension</option>
                  {data.dimensionCatalog.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
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
              <Button variant="ghost" onClick={closeEditor}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={saveDraftRow}>
                Save
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
