import {
  Box,
  Button,
  Heading,
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
import { buildOrganizationSegmentationViewModel } from "../models/organization-segmentation";

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
 * @returns {JSX.Element|null}
 */
function SegmentationGroup({ label, values }) {
  if (!Array.isArray(values) || !values.length) {
    return null;
  }

  return (
    <Box>
      <Text fontWeight="semibold" color="gray.800">
        {label}
      </Text>
      <Wrap spacing={2} mt={2}>
        {values.map((value) => (
          <WrapItem key={`${label}-${value}`}>
            <SegmentationChip value={value} />
          </WrapItem>
        ))}
      </Wrap>
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

/**
 * Renders one organization segmentation section and explanation modal.
 * @param {{record: object|null}} props
 * @returns {JSX.Element|null}
 */
export function OrganizationSegmentationSection({ record }) {
  const segmentation = buildOrganizationSegmentationViewModel(record);
  const { isOpen, onOpen, onClose } = useDisclosure();

  if (!segmentation) {
    return null;
  }

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
      <Heading size="sm" mb={4}>
        Segmentation
      </Heading>

      <VStack align="stretch" spacing={4}>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <SegmentationGroup label="Sector:" values={segmentation.sectors} />
          <SegmentationGroup label="Industries" values={segmentation.industries} />
        </SimpleGrid>
        <SegmentationGroup label="Focuses" values={segmentation.focuses} />
        <Button variant="link" alignSelf="flex-start" colorScheme="blue" size="sm" onClick={onOpen}>
          explain
        </Button>
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
                      <Th>Source</Th>
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
                      <Tr key={`${row.source || "source"}-${index}`}>
                        <Td>{formatExplanationCell(row.source)}</Td>
                        <Td>{formatExplanationCell(row.dimension)}</Td>
                        <Td>{formatExplanationCell(row.value)}</Td>
                        <Td>{row.score == null ? "Not set" : String(row.score)}</Td>
                        <Td>{formatExplanationCell(row.crosswalkDocumentName)}</Td>
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
