import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { useFetcher, useRevalidator } from "@remix-run/react";
import { MdAdd, MdArrowDropDown, MdUpload } from "react-icons/md";
import { FeedEditPage, FeedNewPage } from "./FeedEditorPage.jsx";
import OrganizationListImportDrawer from "./OrganizationListImportDrawer.jsx";
import { getFeedSourceColor, getFeedSourceLabel } from "../models/feed-sources.mjs";

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

function sortStreams(streams = []) {
  return [...streams].sort((a, b) => {
    const percentageDiff = Number(b.percentage || 0) - Number(a.percentage || 0);
    if (percentageDiff !== 0) return percentageDiff;
    const aTime = Date.parse(a.updatedAt || 0);
    const bTime = Date.parse(b.updatedAt || 0);
    if (aTime !== bTime) return bTime - aTime;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function StreamTypeBadge({ stream }) {
  if (stream.streamType === "feed") {
    return (
      <Badge colorScheme={getFeedSourceColor(stream.source)} variant="subtle" fontSize="xs">
        {String(stream.source || "").toLowerCase() === "salesforce" ? "Query Feed" : "Source Feed"}
      </Badge>
    );
  }
  if (stream.streamType === "manual_list") {
    return (
      <Badge colorScheme="purple" variant="subtle" fontSize="xs">
        Manual List
      </Badge>
    );
  }
  return (
    <Badge colorScheme="orange" variant="subtle" fontSize="xs">
      Special Stream
    </Badge>
  );
}

function StreamStatusBadge({ stream }) {
  const normalized = String(stream.status || "").toLowerCase();
  const colorScheme =
    normalized.includes("fail") ? "red" :
    normalized.includes("run") || normalized.includes("active") ? "green" :
    normalized.includes("pause") ? "gray" :
    "orange";
  return (
    <Badge colorScheme={colorScheme} variant="subtle" fontSize="xs">
      {stream.status || "—"}
    </Badge>
  );
}

function NewStreamMenu({ onImportList, onNewFeed }) {
  return (
    <Menu>
      <MenuButton
        as={Button}
        colorScheme="blue"
        leftIcon={<MdAdd />}
        rightIcon={<MdArrowDropDown />}
        size="sm"
      >
        Add Feed
      </MenuButton>
      <MenuList>
        {["preqin", "biscred", "revenuebase"].map((source) => (
          <MenuItem
            key={source}
            onClick={() => onNewFeed(source)}
            fontSize="sm"
          >
            <HStack spacing={2}>
              <Badge colorScheme={getFeedSourceColor(source)} fontSize="xs">
                {getFeedSourceLabel(source)}
              </Badge>
              <Text>feed</Text>
            </HStack>
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => onNewFeed("salesforce")}
          fontSize="sm"
        >
          <HStack spacing={2}>
            <Badge colorScheme="orange" fontSize="xs">
              Salesforce
            </Badge>
            <Text>Add Query</Text>
          </HStack>
        </MenuItem>
        <MenuItem onClick={onImportList} fontSize="sm">
          <HStack spacing={2}>
            <Icon as={MdUpload} boxSize={4} />
            <Text>Import List</Text>
          </HStack>
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

function redistributePercentages(streams = [], targetId, nextPercentage) {
  const normalizedTarget = Math.max(0, Math.min(100, Number(nextPercentage) || 0));
  const target = streams.find((stream) => stream.id === targetId);
  const others = streams.filter((stream) => stream.id !== targetId);
  if (!target) return streams;
  if (!others.length) {
    return streams.map((stream) =>
      stream.id === targetId ? { ...stream, percentage: 100 } : stream
    );
  }

  const desiredOtherTotal = 100 - normalizedTarget;
  const currentOtherTotal = others.reduce(
    (sum, stream) => sum + Number(stream.percentage || 0),
    0
  );
  let nextOthers = others.map((stream) => ({
    ...stream,
    percentage: Number(stream.percentage || 0),
  }));

  if (desiredOtherTotal > currentOtherTotal) {
    let diff = desiredOtherTotal - currentOtherTotal;
    for (let index = 0; index < nextOthers.length; index += 1) {
      const remainingSlots = nextOthers.length - index;
      const increment = Math.ceil(diff / remainingSlots);
      nextOthers[index].percentage += increment;
      diff -= increment;
    }
  } else if (desiredOtherTotal < currentOtherTotal) {
    let diff = currentOtherTotal - desiredOtherTotal;
    while (diff > 0) {
      const adjustable = nextOthers.filter((stream) => stream.percentage > 0);
      if (!adjustable.length) break;
      const decrement = Math.max(1, Math.floor(diff / adjustable.length));
      for (const stream of nextOthers) {
        if (diff <= 0) break;
        if (stream.percentage <= 0) continue;
        const applied = Math.min(stream.percentage, decrement, diff);
        stream.percentage -= applied;
        diff -= applied;
      }
    }
  }

  const result = streams.map((stream) => {
    if (stream.id === targetId) {
      return { ...stream, percentage: normalizedTarget };
    }
    const nextStream = nextOthers.find((entry) => entry.id === stream.id);
    return nextStream ? { ...stream, percentage: nextStream.percentage } : stream;
  });

  const total = result.reduce((sum, stream) => sum + Number(stream.percentage || 0), 0);
  if (total !== 100) {
    const correctionTarget =
      result.find((stream) => stream.id !== targetId) || result.find((stream) => stream.id === targetId);
    if (correctionTarget) {
      correctionTarget.percentage = Math.max(
        0,
        Math.min(100, Number(correctionTarget.percentage || 0) + (100 - total))
      );
    }
  }
  return sortStreams(result);
}

function StreamDetailDrawer({
  stream,
  selectedFeed,
  selectedRun,
  availableLists = [],
  actionData = null,
  newFeedSource = null,
  newFeedActionData = null,
  newFeedFormComponent = null,
  newFeedFormAction = null,
  newFeedSubmission = null,
  isOpen,
  onClose,
}) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size={selectedFeed || newFeedSource ? "xl" : "md"}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        {!selectedFeed && !newFeedSource ? <DrawerHeader borderBottomWidth="1px">{stream?.name || "Feed"}</DrawerHeader> : null}
        <DrawerBody py={selectedFeed || newFeedSource ? 0 : 5} px={selectedFeed || newFeedSource ? 0 : 6}>
          {selectedFeed ? (
            <FeedEditPage
              feed={selectedFeed}
              initialRun={selectedRun}
              actionData={editFeedFetcher.data || actionData}
              availableLists={availableLists}
              backPath="/tools/company-research/feeds"
              backLabel="Feeds"
              embedded
              formComponent={editFeedFetcher.Form}
              formAction="/tools/company-research/feeds"
              submission={editFeedFetcher}
              extraHiddenFields={<input type="hidden" name="embeddedMode" value="true" />}
            />
          ) : newFeedSource ? (
            <FeedNewPage
              initialSource={newFeedSource}
              actionData={newFeedActionData}
              availableLists={availableLists}
              backPath="/tools/company-research/feeds"
              backLabel="Feeds"
              embedded
              formComponent={newFeedFormComponent}
              formAction={newFeedFormAction}
              submission={newFeedSubmission}
              extraHiddenFields={<input type="hidden" name="embeddedMode" value="true" />}
            />
          ) : stream ? (
            <VStack align="stretch" spacing={5}>
              <VStack align="start" spacing={1}>
                <StreamTypeBadge stream={stream} />
                {stream.description ? (
                  <Text fontSize="sm" color="gray.600">
                    {stream.description}
                  </Text>
                ) : null}
              </VStack>
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                  Status
                </Text>
                <Box mt={2}>
                  <StreamStatusBadge stream={stream} />
                </Box>
              </Box>
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                  Percentage
                </Text>
                <Text mt={1} fontSize="sm" color="gray.800">
                  {`${stream.percentage || 0}%`}
                </Text>
              </Box>
              {stream.streamType === "manual_list" ? (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                    List UUID
                  </Text>
                  <Text mt={1} fontSize="sm" color="gray.800">
                    {stream.listUuid || "—"}
                  </Text>
                </Box>
              ) : null}
              {stream.streamType === "special_stream" ? (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                    Stream Key
                  </Text>
                  <Text mt={1} fontSize="sm" color="gray.800">
                    {stream.specialStreamKey || "—"}
                  </Text>
                </Box>
              ) : null}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
                  Updated
                </Text>
                <Text mt={1} fontSize="sm" color="gray.800">
                  {formatDate(stream.updatedAt)}
                </Text>
              </Box>
            </VStack>
          ) : null}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export function CompanyResearchFeedsPage({
  streams = [],
  feeds = [],
  availableLists = [],
  selectedFeed = null,
  selectedRun = null,
  actionData = null,
  error = null,
}) {
  const importDrawer = useDisclosure();
  const revalidator = useRevalidator();
  const newFeedFetcher = useFetcher();
  const editFeedFetcher = useFetcher();
  const [selectedStream, setSelectedStream] = useState(null);
  const [newFeedSource, setNewFeedSource] = useState(null);
  const [pendingFeedId, setPendingFeedId] = useState(null);
  const [dismissedFeedId, setDismissedFeedId] = useState(null);
  const [editingStreamId, setEditingStreamId] = useState(null);
  const [draftPercentage, setDraftPercentage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [localStreams, setLocalStreams] = useState(sortStreams(streams));

  useEffect(() => {
    setLocalStreams(sortStreams(streams));
  }, [streams]);

  useEffect(() => {
    if (selectedFeed?.id) {
      if (String(selectedFeed.id) === String(dismissedFeedId || "")) {
        return;
      }
      const nextStream =
        streams.find((stream) => String(stream.feedId) === String(selectedFeed.id)) || null;
      setSelectedStream(nextStream);
      return;
    }
    setDismissedFeedId(null);
  }, [dismissedFeedId, selectedFeed, streams]);

  useEffect(() => {
    if (!newFeedFetcher.data?.ok || !newFeedFetcher.data?.feed?.id) {
      return;
    }
    setPendingFeedId(String(newFeedFetcher.data.feed.id));
    setNewFeedSource(null);
    revalidator.revalidate();
  }, [newFeedFetcher.data, revalidator]);

  useEffect(() => {
    if (!pendingFeedId) return;
    const nextStream =
      streams.find((stream) => String(stream.feedId) === pendingFeedId) || null;
    if (!nextStream) return;
    setSelectedStream(nextStream);
    setPendingFeedId(null);
  }, [pendingFeedId, streams]);

  useEffect(() => {
    if (!editFeedFetcher.data?.ok) {
      return;
    }
    revalidator.revalidate();
  }, [editFeedFetcher.data, revalidator]);

  function openStream(stream) {
    if (!stream) return;
    setDismissedFeedId(null);
    setPendingFeedId(null);
    setNewFeedSource(null);
    setSelectedStream(stream);
  }

  function closeDrawer() {
    setDismissedFeedId(selectedFeed?.id ? String(selectedFeed.id) : null);
    setPendingFeedId(null);
    setSelectedStream(null);
    setNewFeedSource(null);
  }

  function openNewFeed(source) {
    setDismissedFeedId(null);
    setPendingFeedId(null);
    setSelectedStream(null);
    setNewFeedSource(source);
  }

  async function persistPercentages(nextStreams) {
    const response = await fetch("/api/rest/company-research/streams/percentages", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        updates: nextStreams.map((stream) => ({
          id: stream.id,
          percentage: stream.percentage || 0,
        })),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to update stream percentages.");
    }
  }

  async function handlePercentageSubmit(stream) {
    const nextValue = Number.parseInt(draftPercentage, 10);
    if (!Number.isInteger(nextValue) || nextValue < 0 || nextValue > 100) {
      setSaveError("Percentage must be a whole number between 0 and 100.");
      return;
    }
    const nextStreams = redistributePercentages(localStreams, stream.id, nextValue);
    setLocalStreams(nextStreams);
    setEditingStreamId(null);
    setDraftPercentage("");
    setSaveError("");
    try {
      await persistPercentages(nextStreams);
      revalidator.revalidate();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to update percentages.");
    }
  }

  async function handleImportedList(list) {
    if (!list?.uuid) return;
    const response = await fetch("/api/rest/company-research/streams", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        streamType: "manual_list",
        listUuid: list.uuid,
        name: list.name,
        description: list.description || "",
        percentage: 0,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Unable to add imported list to feeds.");
    }
    importDrawer.onClose();
    revalidator.revalidate();
  }

  const sortedStreams = useMemo(() => sortStreams(localStreams), [localStreams]);
  const activeFeed =
    selectedStream?.streamType === "feed" && selectedStream?.feedId
      ? (selectedFeed?.id && String(selectedFeed.id) === String(selectedStream.feedId)
          ? selectedFeed
          : feeds.find((feed) => String(feed.id) === String(selectedStream.feedId))) || null
      : null;
  const activeRun =
    activeFeed && selectedFeed?.id && String(selectedFeed.id) === String(activeFeed.id)
      ? selectedRun
      : null;

  return (
    <Box px={{ base: 4, md: 8 }} pb={{ base: 6, md: 8 }}>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="lg">Feeds</Heading>
            <Text color="gray.600" mt={1} maxW="4xl">
              Managed queue inputs for Company Research. Only explicitly managed feeds, lists, and special streams appear here.
            </Text>
          </Box>
          <NewStreamMenu onImportList={importDrawer.onOpen} onNewFeed={openNewFeed} />
        </Flex>

        {error ? (
          <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={4}>
            <Text color="red.700" fontSize="sm">
              {error}
            </Text>
          </Box>
        ) : null}
        {saveError ? (
          <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={4}>
            <Text color="red.700" fontSize="sm">
              {saveError}
            </Text>
          </Box>
        ) : null}

        <Card bg="white">
          <CardBody>
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
              <Table size="sm" sx={{ tableLayout: "fixed", width: "100%" }}>
                <Thead bg="gray.50">
                  <Tr>
                    <Th w="38%">Feed</Th>
                    <Th w="16%">Type</Th>
                    <Th w="12%">Percentage</Th>
                    <Th w="16%">Status</Th>
                    <Th w="12rem" textAlign="right">Updated</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedStreams.map((stream) => (
                    <Tr key={stream.id}>
                      <Td>
                        <Button
                          variant="link"
                          color="gray.900"
                          fontWeight="semibold"
                          fontSize="sm"
                          justifyContent="flex-start"
                          whiteSpace="normal"
                          textAlign="left"
                          height="auto"
                          minH="unset"
                          onClick={() => openStream(stream)}
                        >
                          {stream.name}
                        </Button>
                        {stream.description ? (
                          <Text mt={1} fontSize="xs" color="gray.500" noOfLines={1}>
                            {stream.description}
                          </Text>
                        ) : null}
                      </Td>
                      <Td>
                        <StreamTypeBadge stream={stream} />
                      </Td>
                      <Td>
                        {editingStreamId === stream.id ? (
                          <Input
                            size="sm"
                            width="5rem"
                            value={draftPercentage}
                            onChange={(event) => setDraftPercentage(event.target.value)}
                            onBlur={() => {
                              setEditingStreamId(null);
                              setDraftPercentage("");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handlePercentageSubmit(stream);
                              }
                              if (event.key === "Escape") {
                                setEditingStreamId(null);
                                setDraftPercentage("");
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            px={2}
                            onClick={() => {
                              setEditingStreamId(stream.id);
                              setDraftPercentage(String(stream.percentage || 0));
                            }}
                          >
                            <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                              {`${stream.percentage || 0}%`}
                            </Text>
                          </Button>
                        )}
                      </Td>
                      <Td>
                        <StreamStatusBadge stream={stream} />
                      </Td>
                      <Td textAlign="right">
                        <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                          {formatDate(stream.updatedAt)}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </CardBody>
        </Card>
      </VStack>

      <StreamDetailDrawer
        stream={selectedStream}
        selectedFeed={activeFeed}
        selectedRun={activeRun}
        availableLists={availableLists}
        actionData={actionData}
        newFeedSource={newFeedSource}
        newFeedActionData={newFeedFetcher.data?.ok ? null : newFeedFetcher.data}
        newFeedFormComponent={newFeedFetcher.Form}
        newFeedFormAction={newFeedSource ? `/tools/company-research/feeds/new?source=${encodeURIComponent(newFeedSource)}` : null}
        newFeedSubmission={newFeedFetcher}
        isOpen={Boolean(selectedStream || newFeedSource)}
        onClose={closeDrawer}
      />

      <OrganizationListImportDrawer
        isOpen={importDrawer.isOpen}
        onClose={importDrawer.onClose}
        onImportedList={handleImportedList}
      />
    </Box>
  );
}
