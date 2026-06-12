import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Select,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { MdUpload } from "react-icons/md";
import OrganizationListImportDrawer from "./OrganizationListImportDrawer.jsx";
import {
  buildSelectedListRows,
  countRenderableListMembers,
} from "../models/resegmentation-list-detail.mjs";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Unable to load list detail.");
  }
  return payload || {};
}

export function CompanyResearchManualListsPage({
  initialLists = [],
  initialSelectedListId = "",
  initialListDetail = null,
  initialError = null,
}) {
  const [lists, setLists] = useState(Array.isArray(initialLists) ? initialLists : []);
  const [selectedListId, setSelectedListId] = useState(initialSelectedListId || "");
  const [selectedListDetail, setSelectedListDetail] = useState(initialListDetail || null);
  const [listError, setListError] = useState(initialError || "");
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listImportMessage, setListImportMessage] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const selectedListRows = buildSelectedListRows(selectedListDetail);

  async function handleSelectList(uuid) {
    setSelectedListId(uuid);
    setListImportMessage("");
    if (!uuid) {
      setSelectedListDetail(null);
      setListError("");
      return;
    }

    setIsLoadingList(true);
    setListError("");
    try {
      const response = await fetch(
        `/api/rest/resegmentation/lists/${encodeURIComponent(uuid)}`,
        {
          headers: {
            accept: "application/json",
          },
        }
      );
      const payload = await readJsonResponse(response);
      setSelectedListDetail(payload.listDetail || null);
    } catch (error) {
      setSelectedListDetail(null);
      setListError(error instanceof Error ? error.message : "Unable to load list detail.");
    } finally {
      setIsLoadingList(false);
    }
  }

  async function handleImportedList(list, details = {}) {
    if (!list?.uuid) {
      return;
    }

    setLists((currentLists) => {
      const existingIndex = currentLists.findIndex((entry) => entry?.uuid === list.uuid);
      if (existingIndex === -1) {
        return [list, ...currentLists];
      }
      const nextLists = currentLists.slice();
      nextLists[existingIndex] = {
        ...nextLists[existingIndex],
        ...list,
      };
      return nextLists;
    });

    setSelectedListId(list.uuid);
    setSelectedListDetail(details.listDetail || null);
    setListError("");
    setListImportMessage(
      details.statusExplained || `Imported list ${list.name || list.uuid}.`
    );
    onClose();
  }

  return (
    <Box px={{ base: 4, md: 8 }} pb={{ base: 6, md: 8 }}>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="lg">Manual Lists</Heading>
            <Text color="gray.600" mt={1} maxW="3xl">
              Static organization lists that operators upload and manage directly for Company Research.
            </Text>
          </Box>
          <Button
            size="sm"
            leftIcon={<Icon as={MdUpload} />}
            colorScheme="blue"
            onClick={onOpen}
          >
            Import List
          </Button>
        </Flex>

        {listError ? (
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            {listError}
          </Alert>
        ) : null}
        {listImportMessage ? (
          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            {listImportMessage}
          </Alert>
        ) : null}

        <Card bg="white">
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Box maxW="420px">
                <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                  Select a manual list
                </Text>
                <Select
                  placeholder="Choose a list..."
                  value={selectedListId}
                  onChange={(event) => handleSelectList(event.target.value)}
                  size="sm"
                >
                  {lists.map((list) => (
                    <option key={list.uuid} value={list.uuid}>
                      {list.name} ({list.memberCount || 0} orgs)
                    </option>
                  ))}
                </Select>
              </Box>

              {isLoadingList ? (
                <Box>
                  <Skeleton height="24px" mb={3} width="280px" />
                  <Skeleton height="40px" mb={2} />
                  <Skeleton height="40px" mb={2} />
                  <Skeleton height="40px" />
                </Box>
              ) : selectedListDetail?.list ? (
                <VStack align="stretch" spacing={4}>
                  <Grid templateColumns={{ base: "1fr", md: "1.1fr 1fr" }} gap={4}>
                    <GridItem>
                      <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
                        <VStack align="start" spacing={2}>
                          <Heading size="sm">{selectedListDetail.list.name}</Heading>
                          <HStack spacing={2} flexWrap="wrap">
                            <Badge colorScheme="purple" variant="subtle">
                              {selectedListDetail.list.listTypeSlug || "LIST"}
                            </Badge>
                            <Badge colorScheme="gray" variant="subtle">
                              {selectedListDetail.list.listSubTypeSlug || "ORGANIZATION"}
                            </Badge>
                            <Badge colorScheme="green" variant="subtle">
                              {selectedListDetail.list.status || "active"}
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            {selectedListDetail.list.description || "No description"}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            Updated {formatDate(selectedListDetail.list.modifiedDate)}
                          </Text>
                        </VStack>
                      </Box>
                    </GridItem>
                    <GridItem>
                      <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4}>
                        <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
                          <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                            Members
                          </Text>
                          <Heading size="md" mt={1}>
                            {countRenderableListMembers(selectedListDetail)}
                          </Heading>
                          <Text fontSize="sm" color="gray.500" mt={1}>
                            Renderable organizations
                          </Text>
                        </Box>
                        <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
                          <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                            Targets
                          </Text>
                          <Heading size="md" mt={1}>
                            {Array.isArray(selectedListDetail.targets) ? selectedListDetail.targets.length : 0}
                          </Heading>
                          <Text fontSize="sm" color="gray.500" mt={1}>
                            Attached list targets
                          </Text>
                        </Box>
                      </Grid>
                    </GridItem>
                  </Grid>

                  <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden">
                    <Table size="sm">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Organization</Th>
                          <Th>Current EM Industry</Th>
                          <Th>Current Industry</Th>
                          <Th>Current Focus</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedListRows.map((row) => (
                          <Tr key={row.membershipUUID}>
                            <Td>
                              <Text fontWeight="medium" fontSize="sm">
                                {row.name}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontSize="sm" color="gray.700">
                                {row.currentEMIndustry || "—"}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontSize="sm" color="gray.700">
                                {row.currentSegmentation.industry.join(", ") || "—"}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontSize="sm" color="gray.700">
                                {row.currentSegmentation.focus.join(", ") || "—"}
                              </Text>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              ) : (
                <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6}>
                  <Text fontSize="sm" color="gray.500">
                    Select a list to inspect its organizations, or import a new manual list.
                  </Text>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      <OrganizationListImportDrawer
        isOpen={isOpen}
        onClose={onClose}
        onImportedList={handleImportedList}
      />
    </Box>
  );
}
