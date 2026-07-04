import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Heading,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { Link } from "@remix-run/react";

import { buildSegmentationDocumentPath } from "../models/segmentation-document.mjs";

/**
 * Renders one segmentation document list page.
 * @param {{
 *   title: string,
 *   description: string,
 *   items: Array<{
 *     id: string|null,
 *     name: string,
 *     description: string,
 *     version: number|null,
 *     lastmodifiedby: string|null
 *   }>,
 *   error?: {message?: string}|null
 * }} props
 * @returns {JSX.Element}
 */
export function SegmentationDocumentListPage({
  title,
  description,
  items,
  error
}) {
  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Heading size="md">{title}</Heading>
        <Text color="gray.600" mt={2}>
          {description}
        </Text>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" display="flex" flexDirection="column">
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
                      Version
                    </Th>
                    <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                      Last Edited By
                    </Th>
                    <Th position="sticky" top={0} bg="gray.50" zIndex={1}>
                      Edit
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {items.map((item) => {
                    const itemPath = buildSegmentationDocumentPath(item.id);

                    return (
                      <Tr key={item.id || item.name} _hover={{ bg: item.id ? "gray.50" : "transparent" }}>
                        <Td verticalAlign="top">
                          <Text color="gray.800" fontWeight="semibold">
                            {item.name}
                          </Text>
                        </Td>
                        <Td verticalAlign="top">
                          <Text color={item.description ? "gray.700" : "gray.400"} noOfLines={3}>
                            {item.description || "No description"}
                          </Text>
                        </Td>
                        <Td verticalAlign="top">
                          <Text color="gray.800">{item.version == null ? "Unknown" : String(item.version)}</Text>
                        </Td>
                        <Td verticalAlign="top">
                          <Text color="gray.800">{item.lastmodifiedby || "Unknown"}</Text>
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
          <Text color="gray.600">No segmentation documents were returned.</Text>
        )}
      </Box>
    </Box>
  );
}
