import React from "react";
import {
  Alert,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
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
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link,
  Link as ChakraLink,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  Textarea,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as RemixLink, useFetcher, useRevalidator } from "@remix-run/react";
import { FaLinkedin } from "react-icons/fa";
import { MdEdit, MdSettings } from "react-icons/md";
import { FilterableDataTable } from "./ui/organisms/FilterableDataTable";
import { buildEntityDetailPath } from "../models/entity-route.mjs";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.month}/${byType.day}/${byType.year} ${byType.hour}:${byType.minute} ${byType.dayPeriod}`;
}

function buildMemberPath(member) {
  const entityType =
    member?.type === "person"
      ? "person"
      : member?.type === "organization"
        ? "organization"
        : null;
  if (!entityType) return null;
  return buildEntityDetailPath(entityType, member.uuid);
}

function renderMetaBadge(label, value) {
  return (
    <Badge colorScheme="gray" variant="subtle" textTransform="none">
      {`${label}: ${value || "—"}`}
    </Badge>
  );
}

function formatLocationSummary(value) {
  if (!value || typeof value !== "string") return "—";
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  return parts[0] || "—";
}

function ListDetailsDrawer({ isOpen, onClose, list, fetcher }) {
  const [draftSummary, setDraftSummary] = React.useState(list?.description || "");
  const isSubmitting = fetcher.state !== "idle";
  const error = fetcher.data?.ok === false ? fetcher.data?.error : null;

  React.useEffect(() => {
    setDraftSummary(list?.description || "");
  }, [list?.description, list?.uuid]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">Edit list details</DrawerHeader>
        <fetcher.Form method="post">
          <DrawerBody py={5}>
            <Stack spacing={5}>
              {error ? (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}
              <input type="hidden" name="intent" value="save_list_details" />
              <input type="hidden" name="name" value={list?.name || ""} />
              <input type="hidden" name="listTypeSlug" value={list?.listTypeSlug || ""} />
              <input type="hidden" name="listSubTypeSlug" value={list?.listSubTypeSlug || ""} />
              <input type="hidden" name="subjectType" value={list?.subjectType || ""} />
              <input type="hidden" name="membershipMode" value={list?.membershipMode || ""} />
              <input type="hidden" name="status" value={list?.status || ""} />

              <Box>
                <Text fontSize="sm" color="gray.600">
                  List details editing starts here. Summary is wired into the flyout now; additional settings can land beside it next.
                </Text>
              </Box>
              <FormControl>
                <FormLabel fontSize="sm">Summary</FormLabel>
                <Textarea
                  name="description"
                  value={draftSummary}
                  onChange={(event) => setDraftSummary(event.target.value)}
                  placeholder="Add a summary for this list"
                  minH="160px"
                  resize="vertical"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Category</FormLabel>
                <Text fontSize="sm" color="gray.800">
                  {list?.listTypeSlug || "—"}
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Subcategory</FormLabel>
                <Text fontSize="sm" color="gray.800">
                  {list?.listSubTypeSlug || "—"}
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Status</FormLabel>
                <Text fontSize="sm" color="gray.800">
                  {list?.status || "—"}
                </Text>
              </FormControl>
            </Stack>
          </DrawerBody>
          <DrawerFooter borderTopWidth="1px" gap={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" colorScheme="blue" isLoading={isSubmitting} loadingText="Saving">
              Save
            </Button>
          </DrawerFooter>
        </fetcher.Form>
      </DrawerContent>
    </Drawer>
  );
}

function buildMemberColumns(subjectType = null) {
  const columns = [
    {
      key: "member",
      label: "Member",
      width: subjectType === "person" ? "28%" : "34%",
      filter: {
        type: "text",
        getValue: (row) =>
          [
            row.member?.name || "",
            row.member?.title || "",
            row.member?.email || "",
            row.member?.location || "",
            row.memberUUID || "",
          ].join(" "),
      },
      renderCell: (row) => {
        const memberPath = buildMemberPath(row.member);
        const memberName = row.member?.name || row.memberUUID || "Unknown member";

        return (
          <VStack align="start" spacing={1}>
            <HStack spacing={2}>
              {memberPath ? (
                <Link as={RemixLink} to={memberPath} color="blue.600">
                  {memberName}
                </Link>
              ) : (
                <Text fontSize="sm" color="gray.900">
                  {memberName}
                </Text>
              )}
              {row.member?.linkedInUrl ? (
                <ChakraLink
                  href={row.member.linkedInUrl}
                  isExternal
                  color="gray.500"
                  _hover={{ color: "#0F4C81" }}
                  aria-label={`Open LinkedIn for ${memberName}`}
                >
                  <Icon as={FaLinkedin} boxSize={4} />
                </ChakraLink>
              ) : null}
            </HStack>
          </VStack>
        );
      },
    },
  ];

  if (subjectType === "person") {
    columns.push(
      {
        key: "title",
        label: "Title",
        width: "18%",
        filter: {
          type: "text",
          getValue: (row) => row.member?.title || "",
        },
        renderCell: (row) => (
          <Text fontSize="sm" color={row.member?.title ? "gray.800" : "gray.400"}>
            {row.member?.title || "—"}
          </Text>
        ),
      },
      {
        key: "email",
        label: "Email",
        width: "17%",
        filter: {
          type: "text",
          getValue: (row) => row.member?.email || "",
        },
        renderCell: (row) =>
          row.member?.email ? (
            <Link href={`mailto:${row.member.email}`} color="blue.600">
              {row.member.email}
            </Link>
          ) : (
            <Text fontSize="sm" color="gray.400">
              —
            </Text>
          ),
      },
      {
        key: "location",
        label: "Location",
        width: "15%",
        filter: {
          type: "text",
          getValue: (row) => row.member?.location || "",
        },
        renderCell: (row) => (
          <Text fontSize="sm" color={row.member?.location ? "gray.800" : "gray.400"}>
            {formatLocationSummary(row.member?.location)}
          </Text>
        ),
      }
    );
  }

  columns.push(
    {
      key: "status",
      label: "Status",
      width: "10%",
      filter: {
        type: "select",
        options: (rows) =>
          Array.from(
            new Set(
              rows
                .map((row) => row.itemStatus)
                .filter((value) => typeof value === "string" && value.trim())
            )
          ),
        getValue: (row) => row.itemStatus || "",
      },
      renderCell: (row) => (
        <Badge textTransform="none" colorScheme="gray" variant="subtle">
          {row.itemStatus || "—"}
        </Badge>
      ),
    },
    {
      key: "addedBy",
      label: "Added By",
      width: "10%",
      filter: {
        type: "text",
        getValue: (row) => row.addedBy || "",
      },
      renderCell: (row) => (
        <Text fontSize="sm" color={row.addedBy ? "gray.800" : "gray.400"}>
          {row.addedBy || "—"}
        </Text>
      ),
    },
    {
      key: "addedAt",
      label: "Added At",
      width: "12%",
      filter: {
        type: "text",
        getValue: (row) => formatDateTime(row.addedAt),
      },
      renderCell: (row) => (
        <Text fontSize="sm" color="gray.800" whiteSpace="nowrap">
          {formatDateTime(row.addedAt)}
        </Text>
      ),
    }
  );

  return columns;
}

export function ListDetailPage({ listDetail = null, error = null }) {
  const list = listDetail?.list || null;
  const members = Array.isArray(listDetail?.members) ? listDetail.members : [];
  const subjectType =
    typeof list?.subjectType === "string" && list.subjectType.trim()
      ? list.subjectType.trim().toLowerCase()
      : null;
  const detailDrawer = useDisclosure();
  const detailFetcher = useFetcher();
  const revalidator = useRevalidator();
  const [convertError, setConvertError] = React.useState("");
  const [isConverting, setIsConverting] = React.useState(false);
  const convertDialog = useDisclosure();
  const convertCancelRef = React.useRef(null);
  const lastHandledSaveResponseRef = React.useRef(null);
  const memberColumns = buildMemberColumns(subjectType);
  const memberSections = [
    {
      key: "members",
      hideHeader: true,
      title: "",
      description: null,
      rows: members,
      emptyText: "This list has no current members.",
    },
  ];
  const displayedMemberCount = members.length;

  React.useEffect(() => {
    if (
      detailFetcher.state === "idle" &&
      detailFetcher.data?.ok &&
      detailFetcher.data !== lastHandledSaveResponseRef.current
    ) {
      lastHandledSaveResponseRef.current = detailFetcher.data;
      detailDrawer.onClose();
      revalidator.revalidate();
    }
  }, [detailDrawer, detailFetcher.data, detailFetcher.state, revalidator]);

  return (
    <Stack spacing={6}>
      {error ? (
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          {error}
        </Alert>
      ) : null}

      <Flex justify="space-between" align="start" gap={4} wrap="wrap">
        <Stack spacing={3} flex="1" minW="0">
          <Heading size="lg">{list?.name || "List detail"}</Heading>
          <HStack spacing={2} flexWrap="wrap">
            {renderMetaBadge("Category", list?.listTypeSlug)}
            {renderMetaBadge("Subcategory", list?.listSubTypeSlug)}
            {renderMetaBadge("Status", list?.status)}
          </HStack>
          {list?.description ? (
            <Text color="gray.600" maxW="4xl">
              {list.description}
            </Text>
          ) : null}
          {list?.conversion?.convertedAt ? (
            <Text fontSize="sm" color="gray.500">
              Converted from {list?.conversion?.convertedFrom || "a locked list"} on {formatDateTime(list.conversion.convertedAt)}
              {list?.conversion?.convertedBy ? ` by ${list.conversion.convertedBy}` : ""}.
            </Text>
          ) : null}
        </Stack>

        <Menu placement="bottom-end">
          <MenuButton
            as={IconButton}
            aria-label="List actions"
            icon={<MdSettings />}
            variant="outline"
          />
          <MenuList minW="220px">
            <MenuItem icon={<MdEdit />} fontSize="sm" onClick={detailDrawer.onOpen}>
              Edit list details
            </MenuItem>
            {list?.capabilities?.canConvertToAdHoc && !list?.capabilities?.editableMembershipAllowed ? (
              <MenuItem fontSize="sm" onClick={() => {
                setConvertError("");
                convertDialog.onOpen();
              }}>
                Convert To Ad Hoc
              </MenuItem>
            ) : null}
          </MenuList>
        </Menu>
      </Flex>

      {convertError ? (
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          {convertError}
        </Alert>
      ) : null}

      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={5}>
          <Text color="gray.500" fontSize="sm">
            Owner
          </Text>
          <Heading size="sm" mt={2}>
            {list?.createdBy || "—"}
          </Heading>
        </Box>
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={5}>
          <Text color="gray.500" fontSize="sm">
            Members
          </Text>
          <Heading size="sm" mt={2}>
            {displayedMemberCount.toLocaleString()}
          </Heading>
        </Box>
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={5}>
          <Text color="gray.500" fontSize="sm">
            Updated
          </Text>
          <Heading size="sm" mt={2} whiteSpace="nowrap">
            {formatDateTime(list?.modifiedDate || list?.createdDate)}
          </Heading>
        </Box>
      </Grid>

      <FilterableDataTable
        columns={memberColumns}
        sections={memberSections}
        getRowKey={(row) => row.uuid}
      />

      <ListDetailsDrawer
        isOpen={detailDrawer.isOpen}
        onClose={detailDrawer.onClose}
        list={list}
        fetcher={detailFetcher}
      />
      <AlertDialog
        isOpen={convertDialog.isOpen}
        leastDestructiveRef={convertCancelRef}
        onClose={convertDialog.onClose}
      >
        <AlertDialogOverlay />
        <AlertDialogContent>
          <AlertDialogHeader>Convert To Ad Hoc</AlertDialogHeader>
          <AlertDialogBody>
            This will make the list directly editable, disable refresh, remove any schedule, and preserve the prior definition as inactive provenance.
          </AlertDialogBody>
          <AlertDialogFooter gap={3}>
            <Button ref={convertCancelRef} variant="ghost" onClick={convertDialog.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              isLoading={isConverting}
              onClick={async () => {
                if (!list?.uuid) return;
                setIsConverting(true);
                setConvertError("");
                try {
                  const response = await fetch(
                    `/api/rest/lists/${encodeURIComponent(list.uuid)}/convert-to-ad-hoc`,
                    {
                      method: "POST",
                      credentials: "same-origin",
                      headers: {
                        "content-type": "application/json",
                      },
                      body: JSON.stringify({
                        reason: "manual_conversion",
                      }),
                    }
                  );
                  const payload = await response.json();
                  if (!response.ok) {
                    throw new Error(payload?.message || payload?.statusExplained || "Unable to convert list.");
                  }
                  convertDialog.onClose();
                  revalidator.revalidate();
                } catch (requestError) {
                  setConvertError(
                    requestError instanceof Error ? requestError.message : "Unable to convert list."
                  );
                } finally {
                  setIsConverting(false);
                }
              }}
            >
              Convert
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Stack>
  );
}

export default ListDetailPage;
