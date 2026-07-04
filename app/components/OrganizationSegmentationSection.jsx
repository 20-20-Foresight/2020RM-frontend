import {
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import { MdOpenInNew } from "react-icons/md";
import { buildOrganizationSegmentationViewModel } from "../models/organization-segmentation.mjs";
import { buildSegmentationDocumentPath } from "../models/segmentation-document.mjs";

/**
 * Renders one segmentation chip.
 * @param {{value: string}} props
 * @returns {JSX.Element}
 */
function SegmentationChip({ value }) {
  return (
    <Box
      as="span"
      px={3}
      py={1}
      borderRadius="full"
      bg="gray.200"
      color="gray.800"
      fontSize="sm"
      fontWeight="medium"
      lineHeight="short"
    >
      {value}
    </Box>
  );
}

/**
 * Renders one labeled segmentation group.
 * @param {{label: string, values: string[]}} props
 * @returns {JSX.Element}
 */
function SegmentationGroup({ label, values }) {
  const hasValues = Array.isArray(values) && values.length;

  return (
    <Box>
      <Text fontWeight="semibold" color="gray.800">
        {label}
      </Text>
      {hasValues ? (
        <Wrap spacing={2} mt={2}>
          {values.map((value) => (
            <WrapItem key={`${label}-${value}`}>
              <SegmentationChip value={value} />
            </WrapItem>
          ))}
        </Wrap>
      ) : (
        <Text color="gray.500" fontSize="sm" mt={2}>
          No entries
        </Text>
      )}
    </Box>
  );
}

/**
 * Returns one table cell label with an empty fallback.
 * @param {string|null} value
 * @returns {string}
 */
function formatExplanationCell(value) {
  return value || "Not set";
}

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readExplanationFieldLabel(row) {
  return (
    readTrimmedString(row?.sourceField) ||
    readTrimmedString(row?.source) ||
    "Not set"
  );
}

function renderExplanationCrosswalk(row) {
  const crosswalkName = readTrimmedString(row?.crosswalkDocumentName);
  const crosswalkId = readTrimmedString(row?.crosswalkDocumentId);
  const label = crosswalkName || crosswalkId;

  if (!label) {
    return "Not set";
  }

  if (!crosswalkId) {
    return label;
  }

  return (
    <HStack spacing={1} align="center">
      <Text as="span" fontSize="sm">
        {label}
      </Text>
      <Link
        href={buildSegmentationDocumentPath(crosswalkId)}
        isExternal
        color="blue.500"
        aria-label={`Open ${label} crosswalk`}
      >
        <Icon as={MdOpenInNew} boxSize={3.5} />
      </Link>
    </HStack>
  );
}

/**
 * Renders one organization segmentation section and explanation modal.
 * @param {{record: object|null}} props
 * @returns {JSX.Element}
 */
export function OrganizationSegmentationSection({ record }) {
  const segmentation = buildOrganizationSegmentationViewModel(record) || {
    industries: [],
    focuses: [],
    explanations: []
  };
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
      <Heading size="sm" mb={4}>
        Segmentation
      </Heading>

      <VStack align="stretch" spacing={4}>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <SegmentationGroup label="Industries" values={segmentation.industries} />
          <SegmentationGroup label="Focuses" values={segmentation.focuses} />
        </SimpleGrid>
        {segmentation.explanations.length ? (
          <Button variant="link" alignSelf="flex-start" colorScheme="blue" size="sm" onClick={onOpen}>
            explain
          </Button>
        ) : null}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Segmentation Explanation</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {segmentation.explanations.length ? (
              <TableContainer>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Field</Th>
                      <Th>Dimension</Th>
                      <Th>Value</Th>
                      <Th>Score</Th>
                      <Th>Crosswalk</Th>
                      <Th>Rule</Th>
                      <Th>How Derived</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {segmentation.explanations.map((row, index) => (
                      <Tr key={`${row.sourceField || row.source || "source"}-${index}`}>
                        <Td>{readExplanationFieldLabel(row)}</Td>
                        <Td>{formatExplanationCell(row.dimension)}</Td>
                        <Td whiteSpace="pre-line">{formatExplanationCell(row.value)}</Td>
                        <Td>{row.score == null ? "Not set" : String(row.score)}</Td>
                        <Td>{renderExplanationCrosswalk(row)}</Td>
                        <Td>{formatExplanationCell(row.rule)}</Td>
                        <Td>
                          <Box
                            fontSize="sm"
                            color="gray.700"
                            sx={{
                              mark: {
                                bg: "yellow.100",
                                px: 1,
                                borderRadius: "sm"
                              }
                            }}
                            dangerouslySetInnerHTML={{
                              __html: row.reasonHtml || "Not provided"
                            }}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <Text color="gray.500">No segmentation reasoning is available for this organization.</Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
