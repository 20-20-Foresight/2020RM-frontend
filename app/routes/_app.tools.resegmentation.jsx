/**
 * Resegmentation tool — production route.
 * Loaders and actions are stubs until backend APIs are wired.
 * See /design/tools-resegmentation for the interactive design mock.
 */
import { Box, Heading, Text, Alert, AlertIcon, Link } from "@chakra-ui/react";
import { Link as RemixLink } from "@remix-run/react";

export default function ResegmentationToolPage() {
  return (
    <Box>
      <Heading size="md" mb={1}>Resegmentation</Heading>
      <Text color="gray.500" fontSize="sm" mb={6}>
        Re-run segmentation for one or more organizations to update their industry and focus classifications.
      </Text>
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        This tool is under active development. View the{" "}
        <Link as={RemixLink} to="/design/tools-resegmentation" color="blue.600" mx={1} fontWeight="medium">
          interactive design mock
        </Link>{" "}
        to see the planned interface.
      </Alert>
    </Box>
  );
}
