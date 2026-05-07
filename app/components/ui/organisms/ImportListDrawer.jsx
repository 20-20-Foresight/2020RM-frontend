import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
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
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  TableContainer,
  Tag,
  TagLabel,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  Wrap,
  WrapItem,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  MdCheck,
  MdCloudUpload,
  MdFolderOpen,
  MdOutlineArrowForward,
  MdTableChart,
} from "react-icons/md";
import {
  buildInitialColumnMapping,
  buildMappedRows,
  parseImportWorkbook,
} from "../../../models/import-list.mjs";
import {
  RESEGMENTATION_IMPORT_COLUMNS,
  buildInitialColumnMapping as buildResegmentationInitialColumnMapping,
  normalizeWebsiteToDomain,
  validateMappedValues as validateResegmentationMappedValues,
} from "../../../models/resegmentation-import.mjs";

/**
 * Default unmatched-column behavior choices.
 * @type {string[]}
 */
const DEFAULT_UNMATCHED_COLUMN_BEHAVIOR_OPTIONS = [
  "do_not_save",
  "save_as_membership_metadata",
  "save_as_membership_metadata_and_show_in_list_view",
];

/**
 * Organization import demo configuration used by the interactive playground.
 * @type {{
 *   title: string,
 *   description: string,
 *   subjectLabelSingular: string,
 *   subjectLabelPlural: string,
 *   destinationLabel: string,
 *   maxRows: number,
 *   columnDefinitions: Array<object>,
 *   destinationMode: string,
 *   destinationName: string,
 *   unmatchedColumnBehavior: string
 * }}
 */
export const RESEGMENTATION_IMPORT_DEMO_CONFIG = {
  title: "Import organizations",
  description:
    "Upload a CSV/XLSX file, map the incoming columns, review lookup outcomes, then import matched organizations into a destination list.",
  subjectLabelSingular: "organization",
  subjectLabelPlural: "organizations",
  destinationLabel: "Destination list",
  maxRows: 100,
  columnDefinitions: RESEGMENTATION_IMPORT_COLUMNS,
  destinationMode: "new",
  destinationName: "Resegmentation Test 2026-04-27",
  unmatchedColumnBehavior: "save_as_membership_metadata",
  buildInitialColumnMapping(sourceColumns, sourceRows) {
    return buildResegmentationInitialColumnMapping(sourceColumns, sourceRows);
  },
  transformValues(values) {
    const nextValues = { ...(values || {}) };
    if (nextValues.website) {
      nextValues.website = normalizeWebsiteToDomain(nextValues.website);
    }
    return nextValues;
  },
  validateValues: validateResegmentationMappedValues,
};

/**
 * Read one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Returns one status-tag config for display.
 * @param {string} status
 * @returns {{label: string, colorScheme: string}}
 */
function getStatusTag(status) {
  switch (status) {
    case "matched":
    case "imported":
    case "valid":
      return { label: status.replaceAll("_", " "), colorScheme: "green" };
    case "invalid":
    case "unmatched":
    case "lookup_error":
    case "import_error":
    case "blocked":
      return { label: status.replaceAll("_", " "), colorScheme: "red" };
    case "looking_up":
    case "importing":
    case "ready_for_lookup":
    case "ready_for_import":
      return { label: status.replaceAll("_", " "), colorScheme: "blue" };
    default:
      return { label: status.replaceAll("_", " "), colorScheme: "gray" };
  }
}

/**
 * Builds one static sample workbook for parser-fit proofing.
 * @returns {ArrayBuffer}
 */
function buildSampleWorkbookBuffer() {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Organization UUID", "Company", "Location", "LinkedIn URL", "Website", "Comment"],
    [
      "7c60d7f0-34c8-4370-84fa-12522d6100b8",
      "Rose Builders Group",
      "Greater Chicago Area",
      "https://www.linkedin.com/company/rose-builders-group/",
      "https://www.rosebuilders.com/about",
      "Priority account",
    ],
    [
      "",
      "Beacon Health Partners",
      "Nashville, TN",
      "https://www.linkedin.com/company/beacon-health-partners/",
      "beaconhealthpartners.com",
      "Bring into test list",
    ],
    [
      "",
      "Ambiguous Capital",
      "New York, NY",
      "https://www.linkedin.com/company/ambiguous-capital/",
      "ambiguous-capital.com",
      "Multiple known variants",
    ],
    [
      "",
      "",
      "Remote",
      "linkedin.com/company/not-full-url",
      "https://www.invalid example.com",
      "Should fail validation",
    ],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Organizations");
  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });
}

/**
 * Builds mock lookup outcomes from validated import rows.
 * @param {Array<object>} rows
 * @param {string} subjectLabelSingular
 * @returns {Array<object>}
 */
function buildMockLookupRows(rows, subjectLabelSingular) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    if (row.validation?.status !== "valid") {
      return row;
    }

    const subjectLabel = readTrimmedString(subjectLabelSingular) || "record";
    const companyName = readTrimmedString(row.values?.organizationName).toLowerCase();
    const website = readTrimmedString(row.values?.website).toLowerCase();
    const hasUuid = readTrimmedString(row.values?.organizationUuid);

    if (companyName.includes("ambiguous")) {
      return {
        ...row,
        lookup: {
          status: "matched",
          messages: [`Multiple ${subjectLabel} candidates existed; using the first backend result.`],
          match: {
            uuid: `match-ambiguous-${index + 1}`,
            name: "Ambiguous Capital Management",
            website,
          },
        },
      };
    }

    if (companyName.includes("missing") || website.includes("notfound")) {
      return {
        ...row,
        lookup: {
          status: "unmatched",
          messages: [`No existing ${subjectLabel} matched this row.`],
          match: null,
        },
      };
    }

    if (hasUuid) {
      console.info("[ImportListDrawer] Primary lookup key was UUID.", {
        rowNumber: row.rowNumber,
        subjectLabel,
        uuid: hasUuid,
      });
    }

    return {
      ...row,
      lookup: {
        status: "matched",
        messages: [],
        match: {
          uuid: hasUuid || `match-${index + 1}`,
          name: row.values?.organizationName || `Matched ${subjectLabel} ${index + 1}`,
          website,
        },
      },
    };
  });
}

/**
 * Builds import outcomes from matched rows.
 * @param {Array<object>} rows
 * @param {string} subjectLabelPlural
 * @returns {Array<object>}
 */
function buildMockImportRows(rows, subjectLabelPlural) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    if (row.lookup?.status !== "matched") {
      return {
        ...row,
        import: {
          status: "skipped",
          messages: [`Only matched ${subjectLabelPlural || "records"} can be imported.`],
        },
      };
    }

    return {
      ...row,
      lookup: {
        ...(row.lookup || {}),
        status: "imported",
      },
      import: {
        status: "imported",
        messages: [],
        membershipUuid: `membership-${index + 1}`,
      },
    };
  });
}

/**
 * Renders one status tag.
 * @param {{status: string}} props
 * @returns {JSX.Element}
 */
function StatusTag({ status }) {
  const config = getStatusTag(readTrimmedString(status) || "idle");
  const isBusy = ["looking_up", "importing"].includes(readTrimmedString(status));
  return (
    <Tag size="sm" colorScheme={config.colorScheme} borderRadius="full">
      {isBusy ? <Spinner size="xs" mr={1.5} /> : null}
      <TagLabel textTransform="capitalize">{config.label}</TagLabel>
    </Tag>
  );
}

/**
 * Renders one row-count summary strip.
 * @param {{rows: object[]}} props
 * @returns {JSX.Element}
 */
function RowSummary({ rows }) {
  const matchedCount = rows.filter((row) => row.lookup?.status === "matched").length;
  const invalidCount = rows.filter((row) => row.validation?.status === "invalid").length;
  const unmatchedCount = rows.filter((row) => row.lookup?.status === "unmatched").length;
  const importedCount = rows.filter((row) => row.import?.status === "imported").length;

  return (
    <Wrap spacing={2}>
      <WrapItem>
        <Tag size="sm" colorScheme="blue"><TagLabel>{rows.length} rows</TagLabel></Tag>
      </WrapItem>
      <WrapItem>
        <Tag size="sm" colorScheme="green"><TagLabel>{matchedCount} matched</TagLabel></Tag>
      </WrapItem>
      <WrapItem>
        <Tag size="sm" colorScheme="red"><TagLabel>{invalidCount} invalid</TagLabel></Tag>
      </WrapItem>
      <WrapItem>
        <Tag size="sm" colorScheme="orange"><TagLabel>{unmatchedCount} unmatched</TagLabel></Tag>
      </WrapItem>
      <WrapItem>
        <Tag size="sm" colorScheme="purple"><TagLabel>{importedCount} imported</TagLabel></Tag>
      </WrapItem>
    </Wrap>
  );
}

/**
 * Renders the top-level file intake zone.
 * @param {{
 *   title: string,
 *   helperText: string,
 *   acceptedFileLabel?: string,
 *   fileName?: string,
 *   isDragging?: boolean,
 *   onSelectFile?: () => void,
 *   onLoadSample?: () => void,
 *   onDropFile?: (file: File) => void
 * }} props
 * @returns {JSX.Element}
 */
function ImportFileDropzone({
  title,
  helperText,
  acceptedFileLabel = "Accepts .csv and .xlsx files",
  fileName = "",
  isLoading = false,
  isDragging = false,
  onSelectFile = () => {},
  onLoadSample = null,
  onDropFile = () => {},
}) {
  const [dragDepth, setDragDepth] = useState(0);
  const resolvedDragging = isDragging || dragDepth > 0;
  const background = useColorModeValue(
    resolvedDragging ? "blue.50" : "gray.50",
    resolvedDragging ? "blue.900" : "gray.700"
  );
  const borderColor = resolvedDragging ? "blue.400" : "gray.300";

  return (
    <Box
      border="2px dashed"
      borderColor={borderColor}
      borderRadius="xl"
      p={8}
      bg={background}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragDepth((currentValue) => currentValue + 1);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragDepth((currentValue) => Math.max(0, currentValue - 1));
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragDepth(0);
        const file = event.dataTransfer?.files?.[0];
        if (file) {
          onDropFile(file);
        }
      }}
    >
      <Stack spacing={4} align="center" textAlign="center">
        <Icon as={MdCloudUpload} boxSize={10} color="blue.400" />
        <Box>
          <Text fontWeight="semibold">{title}</Text>
          <Text fontSize="sm" color="gray.500" mt={2}>
            {helperText}
          </Text>
        </Box>
        <Wrap spacing={3} justify="center">
          <WrapItem>
            <Button
              size="sm"
              leftIcon={<MdFolderOpen />}
              onClick={onSelectFile}
              isLoading={isLoading}
              loadingText="Loading..."
            >
              Select file
            </Button>
          </WrapItem>
          {typeof onLoadSample === "function" ? (
            <WrapItem>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<MdTableChart />}
                onClick={onLoadSample}
                isDisabled={isLoading}
              >
                Load sample file
              </Button>
            </WrapItem>
          ) : null}
        </Wrap>
        <Text fontSize="xs" color="gray.500">
          {isLoading
            ? `Loading ${fileName || "selected file"}...`
            : fileName
              ? `Selected: ${fileName}`
              : acceptedFileLabel}
        </Text>
      </Stack>
    </Box>
  );
}

/**
 * Renders source-column mapping controls.
 * @param {{
 *   sourceColumns: Array<{sourceKey: string, sourceLabel: string}>,
 *   sourceToDestination: Record<string, string>,
 *   columnDefinitions: Array<{key: string, label: string, required?: boolean}>,
 *   onChange: (sourceKey: string, destinationKey: string) => void
 * }} props
 * @returns {JSX.Element|null}
 */
function ColumnMappingTable({
  sourceColumns,
  sourceToDestination,
  columnDefinitions,
  onChange,
}) {
  if (!Array.isArray(sourceColumns) || !sourceColumns.length) {
    return null;
  }

  return (
    <TableContainer border="1px solid" borderColor="gray.200" borderRadius="md">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Source Column</Th>
            <Th>Destination</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sourceColumns.map((column) => (
            <Tr key={column.sourceKey}>
              <Td>
                <Text fontSize="sm" fontWeight="medium">{column.sourceLabel}</Text>
              </Td>
              <Td>
                <Select
                  size="sm"
                  value={sourceToDestination[column.sourceKey] || "skip"}
                  onChange={(event) => onChange(column.sourceKey, event.target.value)}
                >
                  <option value="skip">Skip</option>
                  {(Array.isArray(columnDefinitions) ? columnDefinitions : []).map((definition) => (
                    <option key={definition.key} value={definition.key}>
                      {definition.label}
                      {definition.required ? " (Required)" : ""}
                    </option>
                  ))}
                </Select>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

/**
 * Renders mapped import rows for review.
 * @param {{
 *   rows: object[],
 *   columnDefinitions: Array<{key: string, label: string}>,
 *   sourceToDestination: Record<string, string>,
 *   maxHeight?: string
 * }} props
 * @returns {JSX.Element|null}
 */
function ImportRowsTable({
  rows,
  columnDefinitions,
  sourceToDestination,
  maxHeight = "42vh",
}) {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }
  const headerBackground = useColorModeValue("white", "gray.800");

  const mappedDefinitionKeys = new Set(
    Object.values(sourceToDestination || {}).filter((value) => value && value !== "skip")
  );
  const visibleDefinitions = (Array.isArray(columnDefinitions) ? columnDefinitions : []).filter(
    (definition) => mappedDefinitionKeys.has(definition.key)
  );

  return (
    <TableContainer
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      maxH={maxHeight}
      overflowY="auto"
      overflowX="auto"
    >
      <Table size="sm">
        <Thead>
          <Tr>
            <Th position="sticky" top={0} zIndex={1} bg={headerBackground}>Status</Th>
            {visibleDefinitions.map((definition) => (
              <Th key={definition.key} position="sticky" top={0} zIndex={1} bg={headerBackground}>
                {definition.label}
              </Th>
            ))}
            <Th position="sticky" top={0} zIndex={1} bg={headerBackground}>Extras</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => {
            const status =
              row.import?.status && row.import.status !== "idle"
                ? row.import.status
                : row.lookup?.status || row.validation?.status || "idle";
            const messages = []
              .concat(row.validation?.messages || [])
              .concat(row.lookup?.messages || [])
              .concat(row.import?.messages || []);

            return (
              <Tr key={row.rowNumber}>
                <Td>
                  <Stack spacing={1}>
                    <StatusTag status={status} />
                    {messages.map((message) => (
                      <Text key={`${row.rowNumber}-import-${message}`} fontSize="xs" color="gray.600">
                        {message}
                      </Text>
                    ))}
                  </Stack>
                </Td>
                {visibleDefinitions.map((definition) => (
                  <Td key={`${row.rowNumber}-${definition.key}`}>
                    <Text fontSize="sm">
                      {row.values?.[definition.key] ? String(row.values[definition.key]) : "—"}
                    </Text>
                  </Td>
                ))}
                <Td>
                  {Object.keys(row.extraValues || {}).length ? (
                    <Tooltip
                      label={Object.entries(row.extraValues)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join("\n")}
                      hasArrow
                      whiteSpace="pre-wrap"
                    >
                      <Badge colorScheme="purple">Extra metadata</Badge>
                    </Tooltip>
                  ) : (
                    <Text fontSize="xs" color="gray.400">—</Text>
                  )}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

/**
 * Generic reusable import-list drawer.
 * @param {{
 *   isOpen?: boolean,
 *   onClose?: () => void,
 *   title?: string,
 *   description?: string,
 *   subjectLabelSingular?: string,
 *   subjectLabelPlural?: string,
 *   destinationLabel?: string,
 *   phase?: string,
 *   parsedImport?: object|null,
 *   sourceToDestination?: Record<string, string>,
 *   rows?: object[],
 *   maxRows?: number,
 *   columnDefinitions?: Array<object>,
 *   destinationMode?: string,
 *   destinationName?: string,
 *   unmatchedColumnBehavior?: string,
 *   unmatchedColumnBehaviorOptions?: string[],
 *   parserError?: string,
 *   fileName?: string,
 *   isLoadingFile?: boolean,
 *   isImporting?: boolean,
 *   isImportDisabled?: boolean,
 *   importButtonLabel?: string,
  *   completeButtonLabel?: string,
 *   statusNotice?: {status?: string, message?: string}|null,
 *   isExpanded?: boolean,
 *   expandedWidth?: string|object,
 *   onToggleExpanded?: (() => void)|null,
 *   reviewTableHeight?: string,
 *   additionalReviewControls?: React.ReactNode,
 *   onDestinationNameChange?: ((value: string) => void)|null,
 *   isDestinationNameEditable?: boolean,
 *   busyTitle?: string,
 *   busyDescription?: string,
 *   showOverlay?: boolean,
 *   allowBackgroundInteraction?: boolean,
  *   onSourceMappingChange?: (sourceKey: string, destinationKey: string) => void,
 *   onSelectFile?: () => void,
 *   onLoadSample?: (() => void)|null,
 *   onFileDropped?: (file: File) => void,
 *   onImport?: () => void
 * }} props
 * @returns {JSX.Element}
 */
export function ImportListDrawer({
  isOpen = true,
  onClose = () => {},
  title = "Import records",
  description = "",
  subjectLabelSingular = "record",
  subjectLabelPlural = "records",
  destinationLabel = "Destination list",
  phase = "upload",
  parsedImport = null,
  sourceToDestination = {},
  rows = [],
  maxRows = 100,
  columnDefinitions = [],
  destinationMode = "new",
  destinationName = "New Import List",
  unmatchedColumnBehavior = "save_as_membership_metadata",
  unmatchedColumnBehaviorOptions = DEFAULT_UNMATCHED_COLUMN_BEHAVIOR_OPTIONS,
  parserError = "",
  fileName = "",
  isLoadingFile = false,
  isImporting = false,
  isImportDisabled,
  importButtonLabel = "Import",
  completeButtonLabel = "Open List",
  statusNotice = null,
  isExpanded = false,
  expandedWidth = "100vw",
  onToggleExpanded = null,
  reviewTableHeight = "42vh",
  additionalReviewControls = null,
  onDestinationNameChange = null,
  isDestinationNameEditable = true,
  busyTitle = "Building List",
  busyDescription = "You can close this flyout, but the list will not be usable until the loading is complete.",
  showOverlay = true,
  allowBackgroundInteraction = false,
  onSourceMappingChange = () => {},
  onSelectFile = () => {},
  onLoadSample = null,
  onFileDropped = () => {},
  onImport = () => {},
}) {
  const mutedPanel = useColorModeValue("gray.50", "gray.700");
  const overlaySurface = useColorModeValue("white", "gray.800");
  const phaseIndex = ["upload", "map", "lookup", "review", "complete"].indexOf(phase);
  const phases = ["Upload", "Map", "Lookup", "Review", "Complete"];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement="right"
      size={isExpanded ? "full" : "xl"}
      trapFocus={!allowBackgroundInteraction}
      blockScrollOnMount={!allowBackgroundInteraction}
    >
      {showOverlay ? <DrawerOverlay /> : null}
      <DrawerContent
        maxW={isExpanded ? expandedWidth : undefined}
        w={isExpanded ? expandedWidth : undefined}
      >
        {typeof onToggleExpanded === "function" ? (
          <IconButton
            aria-label={isExpanded ? "Collapse drawer width" : "Expand drawer width"}
            icon={isExpanded ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            isRound
            size="sm"
            position="absolute"
            top={3}
            right={14}
            zIndex={2}
            onClick={onToggleExpanded}
          />
        ) : null}
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          <VStack align="stretch" spacing={3}>
            <Text fontSize="lg" fontWeight="bold">{title}</Text>
            {description ? (
              <Text fontSize="sm" color="gray.500">{description}</Text>
            ) : null}
            <Wrap spacing={2}>
              {phases.map((phaseLabel, index) => (
                <WrapItem key={phaseLabel}>
                  <Tag
                    size="sm"
                    colorScheme={index <= phaseIndex ? "blue" : "gray"}
                    variant={index <= phaseIndex ? "solid" : "subtle"}
                  >
                    <TagLabel>{index + 1}. {phaseLabel}</TagLabel>
                  </Tag>
                </WrapItem>
              ))}
            </Wrap>
          </VStack>
        </DrawerHeader>

        <DrawerBody py={5}>
          <Stack spacing={5}>
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                <Text fontWeight="semibold">Import limited to {maxRows}</Text>
                <Text fontSize="xs" mt={1}>
                  Any amount exceeding the cap are removed.
                </Text>
              </AlertDescription>
            </Alert>

            {!parsedImport && !fileName ? (
              <ImportFileDropzone
                title={`Drop ${subjectLabelPlural} file here`}
                helperText={`Use drag/drop or select a file to preview and map incoming ${subjectLabelPlural}.`}
                fileName={fileName}
                isLoading={isLoadingFile}
                onSelectFile={onSelectFile}
                onLoadSample={onLoadSample}
                onDropFile={onFileDropped}
              />
            ) : null}

            {fileName ? (
              <Box border="1px solid" borderColor="gray.200" borderRadius="lg" p={4}>
                <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                  <HStack spacing={3}>
                    <Icon as={isLoadingFile ? MdCloudUpload : MdCheck} color={isLoadingFile ? "blue.500" : "green.500"} />
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold">{fileName}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {isLoadingFile
                          ? "Parsing file and preparing matches..."
                          : "File loaded successfully."}
                      </Text>
                    </Box>
                  </HStack>
                  <HStack spacing={2}>
                    <Button size="sm" variant="outline" onClick={onSelectFile} isDisabled={isLoadingFile}>
                      Replace file
                    </Button>
                    {typeof onLoadSample === "function" ? (
                      <Button size="sm" variant="ghost" onClick={onLoadSample} isDisabled={isLoadingFile}>
                        Reload sample
                      </Button>
                    ) : null}
                  </HStack>
                </Flex>
              </Box>
            ) : null}

            {isLoadingFile ? (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <AlertDescription>
                  Parsing {fileName || "selected file"} and preparing the import preview.
                </AlertDescription>
              </Alert>
            ) : null}

            {parserError ? (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertDescription>{parserError}</AlertDescription>
              </Alert>
            ) : null}

            {statusNotice?.message ? (
              <Alert status={statusNotice.status || "info"} borderRadius="md">
                <AlertIcon />
                <AlertDescription>{statusNotice.message}</AlertDescription>
              </Alert>
            ) : null}

            {parsedImport ? (
              <>
                {parsedImport.omittedRowCount > 0 ? (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription>
                      {parsedImport.omittedRowCount} rows were removed because this flyout only allows
                      {` ${maxRows} `}{subjectLabelPlural}.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Column Mapping</Text>
                  <ColumnMappingTable
                    sourceColumns={parsedImport.sourceColumns}
                    sourceToDestination={sourceToDestination}
                    columnDefinitions={columnDefinitions}
                    onChange={onSourceMappingChange}
                  />
                </Box>

                <Box>
                  <Flex align="center" justify="space-between" mb={2} gap={3} wrap="wrap">
                    <Text fontSize="sm" fontWeight="semibold">Row Review</Text>
                    <RowSummary rows={rows} />
                  </Flex>
                  <ImportRowsTable
                    rows={rows}
                    columnDefinitions={columnDefinitions}
                    sourceToDestination={sourceToDestination}
                    maxHeight={reviewTableHeight}
                  />
                </Box>

                <SimpleGrid columns={{ base: 1, md: additionalReviewControls ? 3 : 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Unmatched Column Behavior</FormLabel>
                    <Select value={unmatchedColumnBehavior} size="sm" isReadOnly>
                      {unmatchedColumnBehaviorOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.replaceAll("_", " ")}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Next Action</FormLabel>
                    <Input
                      size="sm"
                      value={
                        phase === "map" || phase === "lookup"
                          ? `Auto-matching ${subjectLabelPlural}`
                          : phase === "review"
                          ? "Import and open list"
                          : phase === "complete"
                            ? "Open imported list"
                            : "Upload file"
                      }
                      isReadOnly
                    />
                  </FormControl>
                  {additionalReviewControls}
                </SimpleGrid>
              </>
            ) : null}
          </Stack>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px" py={4}>
          <Flex
            direction={{ base: "column", lg: "row" }}
            gap={4}
            w="100%"
            align={{ base: "stretch", lg: "flex-end" }}
            justify="space-between"
          >
            <Box flex="1" minW={{ base: "100%", lg: "340px" }} maxW={{ base: "100%", lg: "520px" }}>
              <FormControl>
                <FormLabel fontSize="sm" mb={1.5}>{destinationLabel}</FormLabel>
                <Input
                  size="sm"
                  value={destinationName}
                  onChange={(event) => onDestinationNameChange?.(event.target.value)}
                  isReadOnly={!isDestinationNameEditable || typeof onDestinationNameChange !== "function"}
                  isDisabled={isImporting}
                />
              </FormControl>
            </Box>
            <HStack spacing={3} justify={{ base: "space-between", lg: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
              <Button
                size="sm"
                colorScheme={phase === "complete" ? "green" : "blue"}
                leftIcon={phase === "complete" ? <MdCheck /> : <MdOutlineArrowForward />}
                isDisabled={(typeof isImportDisabled === "boolean" ? isImportDisabled : !rows.length) || isLoadingFile}
                isLoading={isImporting}
                loadingText={phase === "complete" ? completeButtonLabel : importButtonLabel}
                onClick={onImport}
              >
                {phase === "complete" ? completeButtonLabel : importButtonLabel}
              </Button>
            </HStack>
          </Flex>
        </DrawerFooter>

        {isImporting ? (
          <Flex
            position="absolute"
            inset={0}
            bg="blackAlpha.300"
            zIndex={3}
            align="center"
            justify="center"
            p={6}
          >
            <Box
              bg={overlaySurface}
              borderRadius="xl"
              boxShadow="xl"
              maxW="420px"
              w="100%"
              p={6}
            >
              <Stack spacing={4}>
                <HStack spacing={3}>
                  <Spinner color="blue.500" />
                  <Text fontSize="lg" fontWeight="bold">
                    {busyTitle}
                  </Text>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {busyDescription}
                </Text>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="gray.500">
                    This can take a moment for larger imports.
                  </Text>
                  <Button size="sm" variant="outline" onClick={onClose}>
                    Close flyout
                  </Button>
                </HStack>
              </Stack>
            </Box>
          </Flex>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Interactive Storybook playground for validating the import drawer.
 * @param {{
 *   config?: {
 *     title?: string,
 *     description?: string,
 *     subjectLabelSingular?: string,
 *     subjectLabelPlural?: string,
 *     destinationLabel?: string,
 *     maxRows?: number,
 *     columnDefinitions?: Array<object>,
 *     destinationMode?: string,
 *     destinationName?: string,
 *     unmatchedColumnBehavior?: string,
 *     transformValues?: (values: Record<string, string>) => Record<string, string>,
 *     validateValues?: (values: Record<string, string>) => {status: string, messages: string[]},
 *     buildMockLookupRows?: (rows: object[], subjectLabelSingular: string) => object[],
 *     buildMockImportRows?: (rows: object[], subjectLabelPlural: string) => object[]
 *   }
 * }} props
 * @returns {JSX.Element}
 */
export function ImportListPlayground({ config = RESEGMENTATION_IMPORT_DEMO_CONFIG }) {
  const resolvedConfig = {
    ...RESEGMENTATION_IMPORT_DEMO_CONFIG,
    ...(config || {}),
  };
  const [phase, setPhase] = useState("upload");
  const [parsedImport, setParsedImport] = useState(null);
  const [sourceToDestination, setSourceToDestination] = useState({});
  const [rows, setRows] = useState([]);
  const [parserError, setParserError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [destinationMode, setDestinationMode] = useState(resolvedConfig.destinationMode);
  const [destinationName, setDestinationName] = useState(resolvedConfig.destinationName);
  const [unmatchedColumnBehavior, setUnmatchedColumnBehavior] = useState(
    resolvedConfig.unmatchedColumnBehavior
  );
  const fileInputRef = useRef(null);

  /**
   * Applies one parsed import payload into drawer state.
   * @param {object} nextParsedImport
   * @returns {void}
   */
  function applyParsedImport(nextParsedImport) {
    const nextMapping =
      typeof resolvedConfig.buildInitialColumnMapping === "function"
        ? resolvedConfig.buildInitialColumnMapping(
            nextParsedImport.sourceColumns,
            nextParsedImport.sourceRows
          )
        : buildInitialColumnMapping(nextParsedImport.sourceColumns, resolvedConfig.columnDefinitions);
    const nextRows = buildMappedRows({
      sourceColumns: nextParsedImport.sourceColumns,
      sourceRows: nextParsedImport.sourceRows,
      sourceToDestination: nextMapping,
      transformValues: resolvedConfig.transformValues,
      validateValues: resolvedConfig.validateValues,
    });
    const lookedUpRows = (
      resolvedConfig.buildMockLookupRows || buildMockLookupRows
    )(nextRows, resolvedConfig.subjectLabelSingular);
    setParsedImport(nextParsedImport);
    setSourceToDestination(nextMapping);
    setRows(lookedUpRows);
    setParserError("");
    setPhase("review");
  }

  /**
   * Parses one uploaded file into drawer preview state.
   * @param {File} file
   * @returns {Promise<void>}
   */
  async function parseFile(file) {
    setFileName(file?.name || "");
    setIsLoadingFile(true);
    setParserError("");
    setPhase("upload");

    try {
      const buffer = await file.arrayBuffer();
      applyParsedImport(parseImportWorkbook(buffer, { maxRows: resolvedConfig.maxRows }));
    } catch (error) {
      setParserError(error instanceof Error ? error.message : "Unable to parse file.");
      setParsedImport(null);
      setRows([]);
    } finally {
      setIsLoadingFile(false);
    }
  }

  /**
   * Rebuilds mapped rows from the current source mapping.
   * @param {Record<string, string>} nextMapping
   * @returns {void}
   */
  function rebuildRows(nextMapping) {
    if (!parsedImport) {
      return;
    }

    setRows(
      (resolvedConfig.buildMockLookupRows || buildMockLookupRows)(
        buildMappedRows({
          sourceColumns: parsedImport.sourceColumns,
          sourceRows: parsedImport.sourceRows,
          sourceToDestination: nextMapping,
          transformValues: resolvedConfig.transformValues,
          validateValues: resolvedConfig.validateValues,
        }),
        resolvedConfig.subjectLabelSingular
      )
    );
    setPhase("review");
  }

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.100", "gray.900")} p={8}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            parseFile(file);
          }
          event.target.value = "";
        }}
      />

      <Stack spacing={4} maxW="640px">
        <Text fontSize="lg" fontWeight="bold">Reusable Import Drawer Playground</Text>
        <Text fontSize="sm" color="gray.600">
          This proof uses a generic drawer shell plus a use-case config. The drawer itself
          stays reusable while the mapped fields, labels, and destination defaults come from
          the supplied configuration.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Destination Mode</FormLabel>
            <Select
              size="sm"
              value={destinationMode}
              onChange={(event) => setDestinationMode(event.target.value)}
            >
              <option value="new">New</option>
              <option value="select">Select</option>
              <option value="fixed">Fixed</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Destination Name</FormLabel>
            <Input
              size="sm"
              value={destinationName}
              onChange={(event) => setDestinationName(event.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Unmatched Columns</FormLabel>
            <Select
              size="sm"
              value={unmatchedColumnBehavior}
              onChange={(event) => setUnmatchedColumnBehavior(event.target.value)}
            >
              {DEFAULT_UNMATCHED_COLUMN_BEHAVIOR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </FormControl>
        </SimpleGrid>
      </Stack>

      <ImportListDrawer
        isOpen
        onClose={() => {}}
        title={resolvedConfig.title}
        description={resolvedConfig.description}
        subjectLabelSingular={resolvedConfig.subjectLabelSingular}
        subjectLabelPlural={resolvedConfig.subjectLabelPlural}
        destinationLabel={resolvedConfig.destinationLabel}
        phase={phase}
        parsedImport={parsedImport}
        sourceToDestination={sourceToDestination}
        rows={rows}
        maxRows={resolvedConfig.maxRows}
        columnDefinitions={resolvedConfig.columnDefinitions}
        destinationMode={destinationMode}
        destinationName={destinationName}
        unmatchedColumnBehavior={unmatchedColumnBehavior}
        parserError={parserError}
        fileName={fileName}
        isLoadingFile={isLoadingFile}
        showOverlay={false}
        allowBackgroundInteraction
        onSourceMappingChange={(sourceKey, destinationKey) => {
          const nextMapping = {
            ...sourceToDestination,
            [sourceKey]: destinationKey,
          };
          setSourceToDestination(nextMapping);
          rebuildRows(nextMapping);
        }}
        onSelectFile={() => fileInputRef.current?.click()}
        onLoadSample={() => {
          (async function loadSample() {
            setFileName("storybook-sample.xlsx");
            setIsLoadingFile(true);
            setParserError("");
            setPhase("upload");
            await new Promise((resolve) => setTimeout(resolve, 120));
            applyParsedImport(
              parseImportWorkbook(buildSampleWorkbookBuffer(), {
                maxRows: resolvedConfig.maxRows,
              })
            );
            setIsLoadingFile(false);
          })().catch((error) => {
            setParserError(error instanceof Error ? error.message : "Unable to load sample file.");
            setIsLoadingFile(false);
          });
        }}
        onFileDropped={parseFile}
        onImport={() => {
          setRows(
            (resolvedConfig.buildMockImportRows || buildMockImportRows)(
              rows,
              resolvedConfig.subjectLabelPlural
            )
          );
          setPhase("complete");
        }}
      />
    </Box>
  );
}
