import { useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  Link,
  Spinner,
  Tab,
  TabList,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight, FiDatabase } from "react-icons/fi";
import {
  PRIMARY_RECORD_TAB_KEY,
  buildSourceDataTabs,
  buildSalesforceRecordCards,
  resolveSourceDataTabKey
} from "../models/source-data.mjs";

const BRAND_BLUE = "#0F4C81";
const BORDER_COLOR = "#D7DFEC";

function formatKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function PrimitiveValue({ value }) {
  if (value === null || value === undefined) {
    return (
      <Text fontSize="sm" color="gray.400" fontStyle="italic">
        null
      </Text>
    );
  }
  if (typeof value === "boolean") {
    return (
      <Text fontSize="sm" color={value ? "green.600" : "red.500"} fontWeight="medium">
        {value ? "true" : "false"}
      </Text>
    );
  }
  if (typeof value === "number") {
    return (
      <Text fontSize="sm" color="purple.600" fontWeight="medium">
        {value.toLocaleString()}
      </Text>
    );
  }
  if (typeof value === "string") {
    if (value === "") {
      return (
        <Text fontSize="sm" color="gray.400" fontStyle="italic">
          —
        </Text>
      );
    }
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <Link href={value} isExternal fontSize="sm" color="blue.500" _hover={{ textDecoration: "underline" }} wordBreak="break-all">
          {value}
        </Link>
      );
    }
    return (
      <Text fontSize="sm" color="gray.800" wordBreak="break-word">
        {value}
      </Text>
    );
  }
  return (
    <Text fontSize="sm" color="gray.600">
      {String(value)}
    </Text>
  );
}

function JsonNode({ keyName, value, depth }) {
  const [isOpen, setIsOpen] = useState(false);
  const indent = depth * 20;
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object" && !isArray;
  const isExpandable = isObject || isArray;

  if (isExpandable) {
    const entries = isArray
      ? value.map((v, i) => [String(i), v])
      : Object.entries(value).filter(([, v]) => v !== undefined);

    if (entries.length === 0) {
      return (
        <Flex
          pl={`${indent + 28}px`}
          pr={4}
          py={2}
          align="center"
          gap={4}
          borderBottomWidth="1px"
          borderColor="gray.100"
        >
          <Text fontSize="sm" fontWeight="medium" color="gray.500" flex="1">
            {formatKey(keyName)}
          </Text>
          <Text fontSize="xs" color="gray.400">
            {isArray ? "empty list" : "no data"}
          </Text>
        </Flex>
      );
    }

    return (
      <Box>
        <Flex
          pl={`${indent + 4}px`}
          pr={4}
          py={2.5}
          align="center"
          gap={2}
          cursor="pointer"
          onClick={() => setIsOpen((v) => !v)}
          _hover={{ bg: "gray.50" }}
          borderBottomWidth="1px"
          borderColor="gray.100"
          transition="background 0.1s"
        >
          <Icon
            as={isOpen ? FiChevronDown : FiChevronRight}
            color="gray.400"
            boxSize={4}
            flexShrink={0}
          />
          <Text fontSize="sm" fontWeight="semibold" color="gray.700" flex="1">
            {formatKey(keyName)}
          </Text>
          <Text fontSize="xs" color="gray.400" bg="gray.100" px={2} py={0.5} borderRadius="full">
            {isArray
              ? `${entries.length} item${entries.length !== 1 ? "s" : ""}`
              : `${entries.length} field${entries.length !== 1 ? "s" : ""}`}
          </Text>
        </Flex>
        {isOpen && (
          <Box borderLeftWidth="2px" borderColor="blue.100" ml={`${indent + 16}px`}>
            {entries.map(([k, v]) => (
              <JsonNode key={k} keyName={k} value={v} depth={depth + 1} />
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Flex
      pl={`${indent + 28}px`}
      pr={4}
      py={2}
      align="flex-start"
      gap={4}
      borderBottomWidth="1px"
      borderColor="gray.100"
      _hover={{ bg: "gray.50" }}
      transition="background 0.1s"
    >
      <Text
        fontSize="sm"
        fontWeight="medium"
        color="gray.500"
        flexShrink={0}
        w="140px"
        pt="1px"
      >
        {formatKey(keyName)}
      </Text>
      <Box flex="1" minW={0}>
        <PrimitiveValue value={value} />
      </Box>
    </Flex>
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRenderableEntries(value) {
  if (!isPlainObject(value)) {
    return [];
  }

  return Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
}

function SalesforceRecordCards({ records }) {
  if (!Array.isArray(records) || !records.length) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={4} px={{ base: 4, md: 6 }} py={5}>
      {records.map((record) => (
        <Box
          key={record.key}
          borderWidth="1px"
          borderColor={BORDER_COLOR}
          borderRadius="20px"
          bg="white"
          p={{ base: 4, md: 5 }}
          shadow="sm"
        >
          <VStack align="stretch" spacing={3}>
            <Flex
              align={{ base: "flex-start", md: "center" }}
              justify="space-between"
              gap={3}
              direction={{ base: "column", md: "row" }}
            >
              <Box minW={0}>
                {record.href ? (
                  <Link
                    href={record.href}
                    isExternal
                    color={BRAND_BLUE}
                    fontWeight="bold"
                    fontSize="md"
                    wordBreak="break-word"
                    _hover={{ textDecoration: "underline" }}
                  >
                    {record.name}
                  </Link>
                ) : (
                  <Text color="gray.900" fontWeight="bold" fontSize="md" wordBreak="break-word">
                    {record.name}
                  </Text>
                )}
              </Box>

              {record.typeLabel ? (
                <Badge
                  alignSelf="flex-start"
                  colorScheme="blue"
                  variant="subtle"
                  borderRadius="full"
                  px={2.5}
                  py={1}
                  fontSize="11px"
                  textTransform="none"
                >
                  {record.typeLabel}
                </Badge>
              ) : null}
            </Flex>

            <Text fontSize="sm" color={record.locationLabel ? "gray.600" : "gray.400"}>
              {record.locationLabel || "Location unavailable"}
            </Text>

            {record.websiteUrl || record.linkedInUrl ? (
              <HStack spacing={4} flexWrap="wrap">
                {record.websiteUrl ? (
                  <Link
                    href={record.websiteUrl}
                    isExternal
                    color="blue.500"
                    fontSize="sm"
                    _hover={{ textDecoration: "underline" }}
                  >
                    {record.websiteLabel || "Website"}
                  </Link>
                ) : null}
                {record.linkedInUrl ? (
                  <Link
                    href={record.linkedInUrl}
                    isExternal
                    color="blue.500"
                    fontSize="sm"
                    _hover={{ textDecoration: "underline" }}
                  >
                    {record.linkedInLabel || "LinkedIn"}
                  </Link>
                ) : null}
              </HStack>
            ) : null}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

/**
 * Flyout drawer that renders a readable key/value visualization of raw entity data.
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   data: object|null,
 *   entityType?: string,
 *   preferredView?: "primary"|"source",
 *   externalSourcesRequestPath?: string|null
 * }} props
 */
export function SourceDataFlyout({
  isOpen,
  onClose,
  data,
  entityType = "record",
  preferredView = "primary",
  externalSourcesRequestPath = null
}) {
  const [externalSourcesState, setExternalSourcesState] = useState({
    requestPath: null,
    status: "idle",
    externalOrganizations: [],
    error: null
  });

  useEffect(() => {
    if (!isOpen || entityType !== "organization") {
      return undefined;
    }

    const requestPath =
      typeof externalSourcesRequestPath === "string" && externalSourcesRequestPath.trim()
        ? externalSourcesRequestPath.trim()
        : null;
    if (!requestPath) {
      return undefined;
    }

    if (
      externalSourcesState.requestPath === requestPath &&
      externalSourcesState.status === "loaded"
    ) {
      return undefined;
    }

    let isCancelled = false;
    setExternalSourcesState({
      requestPath,
      status: "loading",
      externalOrganizations: [],
      error: null
    });

    fetch(requestPath, {
      headers: {
        accept: "application/json"
      }
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            payload && typeof payload.message === "string"
              ? payload.message
              : "Unable to load source data.";
          throw new Error(message);
        }

        return Array.isArray(payload?.externalOrganizations) ? payload.externalOrganizations : [];
      })
      .then((externalOrganizations) => {
        if (isCancelled) {
          return;
        }

        setExternalSourcesState({
          requestPath,
          status: "loaded",
          externalOrganizations,
          error: null
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setExternalSourcesState({
          requestPath,
          status: "error",
          externalOrganizations: [],
          error: error instanceof Error ? error.message : "Unable to load source data."
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, entityType, externalSourcesRequestPath]);

  const resolvedData =
    externalSourcesState.status === "loaded"
      ? {
          ...(data && typeof data === "object" ? data : {}),
          externalOrganizations: externalSourcesState.externalOrganizations
        }
      : data;
  const tabs = buildSourceDataTabs({
    data: resolvedData,
    entityType
  });
  const resolvedTabKey = resolveSourceDataTabKey(tabs, preferredView);
  const [activeTabKey, setActiveTabKey] = useState(resolvedTabKey);

  useEffect(() => {
    if (isOpen) {
      setActiveTabKey(resolvedTabKey);
    }
  }, [isOpen, resolvedTabKey]);

  const activeTab =
    tabs.find((tab) => tab.key === activeTabKey) ||
    tabs.find((tab) => tab.key === PRIMARY_RECORD_TAB_KEY) ||
    tabs[0] ||
    null;
  const activeValue = activeTab?.value ?? null;
  const isSalesforceCardsTab = activeTab?.renderMode === "salesforce-cards";
  const salesforceCards = isSalesforceCardsTab ? buildSalesforceRecordCards(activeValue) : [];
  const entries = getRenderableEntries(activeValue);
  const isStructuredObject = isPlainObject(activeValue);
  const hasTabData = isSalesforceCardsTab
    ? salesforceCards.length > 0
    : entries.length > 0 || Array.isArray(activeValue);
  const isLoadingExternalSources =
    entityType === "organization" && externalSourcesState.status === "loading";
  const externalSourcesError =
    entityType === "organization" && externalSourcesState.status === "error"
      ? externalSourcesState.error
      : null;
  const activeTabIndex = Math.max(
    tabs.findIndex((tab) => tab.key === activeTab?.key),
    0
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="lg" placement="right">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton mt={1} />
        <DrawerHeader borderBottomWidth="1px" borderColor={BORDER_COLOR} pb={4}>
          <HStack spacing={3}>
            <Flex
              boxSize={9}
              borderRadius="lg"
              bg="#EEF4FF"
              align="center"
              justify="center"
              borderWidth="1px"
              borderColor={BORDER_COLOR}
              flexShrink={0}
            >
              <Icon as={FiDatabase} color={BRAND_BLUE} boxSize={4} />
            </Flex>
            <Box>
              <Text fontSize="md" fontWeight="bold" color="gray.900" lineHeight="shorter">
                {activeTab?.label || "Source Data"}
              </Text>
              <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={0.5}>
                {activeTab?.description || `Raw external ${entityType} record`}
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        <DrawerBody p={0} overflowY="auto">
          {entityType === "organization" && (isLoadingExternalSources || externalSourcesError) ? (
            <Box
              px={{ base: 4, md: 6 }}
              py={3}
              borderBottomWidth="1px"
              borderColor="gray.100"
              bg="gray.50"
            >
              {isLoadingExternalSources ? (
                <HStack spacing={3}>
                  <Spinner size="sm" color="blue.500" thickness="2.5px" />
                  <Text fontSize="sm" color="gray.600" fontWeight="medium">
                    Loading additional source tabs...
                  </Text>
                </HStack>
              ) : null}
              {externalSourcesError ? (
                <Alert status="error" borderRadius="16px">
                  <AlertIcon />
                  <AlertDescription>{externalSourcesError}</AlertDescription>
                </Alert>
              ) : null}
            </Box>
          ) : null}

          {tabs.length > 1 ? (
            <Box borderBottomWidth="1px" borderColor={BORDER_COLOR}>
              <Tabs
                index={activeTabIndex}
                onChange={(nextIndex) => setActiveTabKey(tabs[nextIndex]?.key || PRIMARY_RECORD_TAB_KEY)}
                variant="unstyled"
              >
                <TabList
                  gap={{ base: 1, md: 3 }}
                  px={{ base: 3, md: 6 }}
                  overflowX="auto"
                  whiteSpace="nowrap"
                >
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.key}
                      px={3}
                      py={4}
                      fontSize="sm"
                      fontWeight={tab.key === activeTab?.key ? "bold" : "semibold"}
                      color={tab.key === activeTab?.key ? BRAND_BLUE : "gray.600"}
                      borderBottomWidth="3px"
                      borderColor={tab.key === activeTab?.key ? BRAND_BLUE : "transparent"}
                      borderRadius="0"
                      _selected={{}}
                      _hover={{
                        color: tab.key === activeTab?.key ? BRAND_BLUE : "gray.800",
                        bg: "transparent"
                      }}
                      whiteSpace="nowrap"
                    >
                      {tab.label}
                    </Tab>
                  ))}
                </TabList>
              </Tabs>
            </Box>
          ) : null}

          {!hasTabData ? (
            <Flex p={10} justify="center" align="center" direction="column" gap={2}>
              <Icon as={FiDatabase} color="gray.300" boxSize={8} />
              <Text color="gray.500" fontSize="sm">
                No source data available.
              </Text>
            </Flex>
          ) : isSalesforceCardsTab ? (
            <SalesforceRecordCards records={salesforceCards} />
          ) : (
            <Box>
              {isStructuredObject
                ? entries.map(([key, value]) => (
                    <JsonNode key={key} keyName={key} value={value} depth={0} />
                  ))
                : (
                    <JsonNode
                      key={activeTab?.key || PRIMARY_RECORD_TAB_KEY}
                      keyName={activeTab?.label || "Source Data"}
                      value={activeValue}
                      depth={0}
                    />
                  )}
            </Box>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
