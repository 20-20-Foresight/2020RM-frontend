import { useState } from "react";
import {
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
  Text,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight, FiDatabase } from "react-icons/fi";

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

/**
 * Flyout drawer that renders a readable key/value visualization of raw entity data.
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   data: object|null,
 *   entityType?: string
 * }} props
 */
export function SourceDataFlyout({ isOpen, onClose, data, entityType = "record" }) {
  const record = data?.record || null;
  const entries = record
    ? Object.entries(record).filter(([, v]) => v !== undefined && v !== null)
    : [];

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
                Source Data
              </Text>
              <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={0.5}>
                Raw external {entityType} record
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        <DrawerBody p={0} overflowY="auto">
          {entries.length === 0 ? (
            <Flex p={10} justify="center" align="center" direction="column" gap={2}>
              <Icon as={FiDatabase} color="gray.300" boxSize={8} />
              <Text color="gray.500" fontSize="sm">
                No source data available.
              </Text>
            </Flex>
          ) : (
            <Box>
              {entries.map(([key, value]) => (
                <JsonNode key={key} keyName={key} value={value} depth={0} />
              ))}
            </Box>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
