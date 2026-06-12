import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Code,
  Heading,
  HStack,
  Link as ChakraLink,
  Text,
  VStack
} from "@chakra-ui/react";
import { Link } from "@remix-run/react";
import { buildSegmentationDocumentPath } from "../models/segmentation-document.mjs";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function stringifyJson(value) {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch (_error) {
    return String(value ?? "");
  }
}

export function CompiledCrosswalkViewerPage({ data }) {
  const authoredDocumentId =
    readTrimmedString(data?.compiledCrosswalk?.authoredDocumentId) ||
    readTrimmedString(data?.document?.authoredDocumentId);
  const authoredDocumentName =
    readTrimmedString(data?.compiledCrosswalk?.authoredDocumentName) ||
    readTrimmedString(data?.document?.authoredDocumentName) ||
    authoredDocumentId;
  const jsonText = stringifyJson(data?.document);

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <HStack spacing={3} align="center" mb={2}>
          <Heading size="md">{data?.name || data?.key || "Compiled Crosswalk"}</Heading>
          <Badge colorScheme="orange" variant="subtle">
            {data?.metadata?.type || data?.type || "compiled"}
          </Badge>
        </HStack>
        <Text color="gray.600">
          This is the compiled runtime artifact. It is read-only and should be edited through its authored template crosswalk.
        </Text>
      </Box>

      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertDescription>
          No edits are allowed on compiled JSON. Update the authored template crosswalk, then save it to regenerate this runtime document.
        </AlertDescription>
      </Alert>

      <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={5}>
        <Heading size="sm" mb={4}>
          Metadata
        </Heading>
        <VStack align="stretch" spacing={2}>
          <Text>
            <Code mr={2}>ID</Code>
            {data?.id || "Unknown"}
          </Text>
          <Text>
            <Code mr={2}>Version</Code>
            {data?.version == null ? "Unknown" : String(data.version)}
          </Text>
          <Text>
            <Code mr={2}>Last Modified</Code>
            {formatTimestamp(data?.lastmodifieddate)}
          </Text>
          <Text>
            <Code mr={2}>Updated By</Code>
            {data?.lastmodifiedby || "Unknown"}
          </Text>
          <Text>
            <Code mr={2}>Authored Document</Code>
            {authoredDocumentId ? (
              <ChakraLink as={Link} color="blue.600" to={buildSegmentationDocumentPath(authoredDocumentId)}>
                {authoredDocumentName || authoredDocumentId}
              </ChakraLink>
            ) : (
              "Not linked"
            )}
          </Text>
        </VStack>
      </Box>

      <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
        <Box px={5} py={4} borderBottomWidth="1px" borderColor="gray.200" bg="gray.50">
          <Heading size="sm">JSON</Heading>
        </Box>
        <Box
          as="pre"
          m={0}
          p={5}
          overflowX="auto"
          fontSize="sm"
          lineHeight="tall"
          bg="gray.900"
          color="gray.100"
          whiteSpace="pre-wrap"
          wordBreak="break-word"
        >
          {jsonText}
        </Box>
      </Box>
    </VStack>
  );
}
