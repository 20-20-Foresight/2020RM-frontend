import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  Heading,
  Grid,
  HStack,
  Input,
  Link as ChakraLink,
  List,
  ListItem,
  Icon,
  Text,
  VStack
} from "@chakra-ui/react";
import { Form, Link as RemixLink, useLocation, useNavigation } from "@remix-run/react";
import { FaLinkedin } from "react-icons/fa";
import { buildEntityDetailPath } from "../models/entity-route";
import {
  getSearchResultFieldValue,
  resolveSchemaFieldPath
} from "../models/search-result";

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
  const isSearching =
    navigation.state !== "idle" && navigation.location?.pathname === location.pathname;
  const secondaryFieldPath = resolveSchemaFieldPath(data.schema, secondaryFieldPaths);
  const linkedInFieldPath = resolveSchemaFieldPath(data.schema, linkedInFieldPaths);
  const emptyLocationLabel = data.entityType === "organization" ? "?" : "-";

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="md">{title}</Heading>
        <Text color="gray.600" mt={2}>
          Search by name through the backend REST interface.
        </Text>
      </Box>

      <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
        <Form method="get">
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

      {data.error ? (
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
        <Text fontSize="sm" color="gray.500" mb={4}>
          {data.statusExplained}
        </Text>
        <Text fontSize="sm" color="gray.500" mb={4}>
          {data.meta?.count || 0} result{(data.meta?.count || 0) === 1 ? "" : "s"}
        </Text>

        {data.results.length ? (
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
              {data.results.map((result, index) => {
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
                    borderBottomWidth={index === data.results.length - 1 ? "0" : "1px"}
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
          <Text color="gray.600">{data.query.name ? `No results for "${data.query.name}".` : "No search yet."}</Text>
        )}
      </Box>
    </VStack>
  );
}
