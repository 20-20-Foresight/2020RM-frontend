import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Grid,
  Icon,
  Link as ChakraLink,
  List,
  ListItem,
  Text
} from "@chakra-ui/react";
import { Link as RemixLink } from "@remix-run/react";
import { FaLinkedin } from "react-icons/fa";
import { buildEntityDetailPath } from "../models/entity-route.mjs";
import {
  getSearchResultFieldValue,
  resolveSchemaFieldPath
} from "../models/search-result.mjs";

/**
 * Format the attached related location for list display.
 * @param {unknown} relatedLocation
 * @returns {string|null}
 */
function formatRelatedLocation(relatedLocation) {
  if (!relatedLocation || typeof relatedLocation !== "object") {
    return null;
  }

  const city =
    typeof relatedLocation.city === "string" && relatedLocation.city.trim()
      ? relatedLocation.city.trim()
      : null;
  const regionCode =
    typeof relatedLocation.regionCode === "string" && relatedLocation.regionCode.trim()
      ? relatedLocation.regionCode.trim()
      : null;

  if (city && regionCode) {
    return `${city}, ${regionCode}`;
  }

  return city || regionCode || null;
}

export function DirectoryResultsContent({
  emptyLabel,
  secondaryFieldLabel,
  secondaryFieldPaths,
  linkedInFieldPaths,
  emptyStateMessage,
  data
}) {
  const results = Array.isArray(data?.results) ? data.results : [];
  const secondaryFieldPath = resolveSchemaFieldPath(data?.schema, secondaryFieldPaths);
  const linkedInFieldPath = resolveSchemaFieldPath(data?.schema, linkedInFieldPaths);
  const emptyLocationLabel = data?.entityType === "organization" ? "?" : "-";

  return (
    <>
      {data?.error ? (
        <Alert status="error" borderRadius="lg" mb={4}>
          <AlertIcon />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      <Text fontSize="sm" color="gray.500" mb={4}>
        {data?.statusExplained}
      </Text>
      <Text fontSize="sm" color="gray.500" mb={4}>
        {data?.meta?.count || 0} result{(data?.meta?.count || 0) === 1 ? "" : "s"}
      </Text>

      {results.length ? (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
          <Grid
            display={{ base: "none", md: "grid" }}
            templateColumns="minmax(0, 1.8fr) minmax(0, 1.1fr) 48px"
            px={4}
            py={2}
            bg="gray.50"
            borderBottomWidth="1px"
            borderColor="gray.200"
            align="center"
            columnGap={4}
          >
            <Text fontSize="xs" fontWeight="bold" letterSpacing="wide" textTransform="uppercase" color="gray.500">
              Name
            </Text>
            <Text fontSize="xs" fontWeight="bold" letterSpacing="wide" textTransform="uppercase" color="gray.500">
              Location
            </Text>
            <Text fontSize="xs" fontWeight="bold" letterSpacing="wide" textTransform="uppercase" color="gray.500">
              Links
            </Text>
          </Grid>
          <List spacing={0}>
            {results.map((result, index) => {
              const secondaryValue = secondaryFieldPath
                ? getSearchResultFieldValue(result, secondaryFieldPath)
                : null;
              const linkedInValue = linkedInFieldPath
                ? getSearchResultFieldValue(result, linkedInFieldPath)
                : null;
              const relatedLocationValue = formatRelatedLocation(result.relatedLocation);
              const detailPath = buildEntityDetailPath(data.entityType, result.uuid);

              return (
                <ListItem
                  key={result.uuid || result.name}
                  borderBottomWidth={index === results.length - 1 ? "0" : "1px"}
                  borderColor="gray.100"
                  px={4}
                  py={3}
                >
                  <Grid
                    templateColumns={{ base: "minmax(0, 1fr) 40px", md: "minmax(0, 1.8fr) minmax(0, 1.1fr) 48px" }}
                    templateAreas={{
                      base: "\"name links\" \"location links\"",
                      md: "\"name location links\""
                    }}
                    columnGap={4}
                    rowGap={2}
                    alignItems="start"
                  >
                    <Box minW="0" gridArea="name">
                      {detailPath ? (
                        <ChakraLink as={RemixLink} to={detailPath} color="gray.800" fontWeight="semibold">
                          {result.name || emptyLabel}
                        </ChakraLink>
                      ) : (
                        <Text fontWeight="semibold">{result.name || emptyLabel}</Text>
                      )}
                      {secondaryFieldLabel && secondaryValue ? (
                        <Text color="gray.600" fontSize="sm" mt={1}>
                          {secondaryFieldLabel}: {secondaryValue}
                        </Text>
                      ) : null}
                    </Box>
                    <Box minW="0" gridArea="location">
                      <Text
                        color={relatedLocationValue ? "gray.700" : "gray.400"}
                        fontSize="sm"
                        textAlign={{ base: "left", md: "left" }}
                      >
                        {relatedLocationValue || emptyLocationLabel}
                      </Text>
                    </Box>
                    <Box minW="32px" gridArea="links" textAlign="right">
                      {linkedInValue ? (
                        <ChakraLink
                          href={linkedInValue}
                          isExternal
                          color="linkedin.500"
                          display="inline-flex"
                          alignItems="center"
                          justifyContent="center"
                          minW="32px"
                          minH="32px"
                          borderRadius="md"
                          _hover={{ color: "linkedin.600", bg: "blue.50" }}
                          aria-label={`Open LinkedIn for ${result.name || emptyLabel}`}
                        >
                          <Icon as={FaLinkedin} boxSize={5} />
                        </ChakraLink>
                      ) : null}
                    </Box>
                  </Grid>
                </ListItem>
              );
            })}
          </List>
        </Box>
      ) : (
        <Text color="gray.600">{emptyStateMessage}</Text>
      )}
    </>
  );
}
