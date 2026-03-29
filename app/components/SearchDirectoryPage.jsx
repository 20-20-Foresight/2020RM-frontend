import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Heading,
  HStack,
  Input,
  Text,
  VStack
} from "@chakra-ui/react";
import { Form, useLocation, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { BlockingLoadingOverlay } from "./BlockingLoadingOverlay";
import { DirectoryResultsContent } from "./DirectoryResultsContent";
import {
  getDirectorySearchLoadingLabel,
  isDirectorySearchLoading
} from "../models/directory-search-loading";

export function SearchDirectoryPage({
  title,
  emptyLabel,
  searchPlaceholder,
  secondaryFieldLabel,
  secondaryFieldPaths,
  linkedInFieldPaths,
  data
}) {
  const location = useLocation();
  const navigation = useNavigation();
  const [pendingSearchName, setPendingSearchName] = useState(null);
  const isSearching = isDirectorySearchLoading({
    currentPathname: location.pathname,
    navigationState: navigation.state,
    navigationPathname: navigation.location?.pathname || null,
    hasPendingSearchSubmit: Boolean(pendingSearchName)
  });
  const searchLoadingLabel = getDirectorySearchLoadingLabel(data.entityType);

  useEffect(() => {
    if (!pendingSearchName) {
      return;
    }

    if (navigation.state === "idle" && data.query?.name === pendingSearchName) {
      setPendingSearchName(null);
    }
  }, [data.query?.name, navigation.state, pendingSearchName]);

  /**
   * Tracks one local search submit so the blocking modal appears immediately.
   * @param {import("react").FormEvent<HTMLFormElement>} event
   */
  function handleSubmit(event) {
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    const trimmedName = typeof name === "string" ? name.trim() : "";
    setPendingSearchName(trimmedName || null);
  }

  return (
    <Box position="relative">
      {isSearching ? (
        <BlockingLoadingOverlay
          label={searchLoadingLabel}
          zIndex={2}
          position="absolute"
          borderRadius="24px"
        />
      ) : null}
      <VStack align="stretch" spacing={6}>
        <Box>
          <Heading size="md">{title}</Heading>
          <Text color="gray.600" mt={2}>
            Search by name through the backend REST interface.
          </Text>
        </Box>

        <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
          <Form method="get" onSubmit={handleSubmit}>
            <HStack align="end" spacing={3}>
              <FormControl>
                <Input
                  name="name"
                  placeholder={searchPlaceholder}
                  defaultValue={data.query.name}
                  bg="gray.50"
                />
                <FormHelperText>Only name search is available in the current RPC source.</FormHelperText>
              </FormControl>
              <Button type="submit" colorScheme="blue" minW="112px" isLoading={isSearching} loadingText="Searching">
                Search
              </Button>
            </HStack>
          </Form>
        </Box>

        <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
          <DirectoryResultsContent
            emptyLabel={emptyLabel}
            secondaryFieldLabel={secondaryFieldLabel}
            secondaryFieldPaths={secondaryFieldPaths}
            linkedInFieldPaths={linkedInFieldPaths}
            emptyStateMessage={data.query.name ? `No results for "${data.query.name}".` : "No search yet."}
            data={data}
          />
        </Box>
      </VStack>
    </Box>
  );
}
