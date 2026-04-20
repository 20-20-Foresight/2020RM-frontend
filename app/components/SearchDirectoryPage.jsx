import {
  Box,
  Button,
  FormControl,
  Heading,
  HStack,
  Input,
  VStack
} from "@chakra-ui/react";
import { Form, useLocation, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { DirectoryResultsContent } from "./DirectoryResultsContent";
import { DirectoryShimmer } from "./DirectoryShimmer";

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

  // pendingSearch: the query term the user just submitted.
  // We show the shimmer whenever this is set AND the loaded data hasn't caught
  // up to it yet. This is intentionally data-driven so that React 18's
  // startTransition batching of navigation state can't cause the shimmer to
  // be skipped — only an actual data update clears it.
  const [pendingSearch, setPendingSearch] = useState(null);
  const loadedQuery = data.query?.name ?? null;
  const isSearching =
    pendingSearch !== null &&
    pendingSearch !== loadedQuery;

  // Also treat an in-flight navigation to the same pathname as searching,
  // so the shimmer catches cases triggered from outside this component
  // (e.g. a link with a ?name= query from another page).
  const navPathname = navigation.location?.pathname ?? null;
  const isNavigatingHere =
    navigation.state !== "idle" &&
    navPathname === location.pathname;

  const showShimmer = isSearching || isNavigatingHere;

  // Once data reflects our pending search, clear it.
  useEffect(() => {
    if (pendingSearch !== null && pendingSearch === loadedQuery) {
      setPendingSearch(null);
    }
  }, [pendingSearch, loadedQuery]);

  function handleSubmit(event) {
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (trimmedName) {
      setPendingSearch(trimmedName);
    }
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="md">{title}</Heading>
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
            </FormControl>
            <Button type="submit" colorScheme="blue" minW="112px" isLoading={showShimmer} loadingText="Searching">
              Search
            </Button>
          </HStack>
        </Form>
      </Box>

      <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
        {showShimmer ? (
          <DirectoryShimmer />
        ) : (
          <DirectoryResultsContent
            emptyLabel={emptyLabel}
            secondaryFieldLabel={secondaryFieldLabel}
            secondaryFieldPaths={secondaryFieldPaths}
            linkedInFieldPaths={linkedInFieldPaths}
            emptyStateMessage={data.query.name ? `No results for "${data.query.name}".` : "No search yet."}
            data={data}
          />
        )}
      </Box>
    </VStack>
  );
}
