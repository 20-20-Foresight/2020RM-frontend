import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Grid,
  Heading,
  HStack,
  Link as ChakraLink,
  SimpleGrid,
  Text,
  VStack
} from "@chakra-ui/react";
import { Link as RemixLink } from "@remix-run/react";
import {
  getSearchResultFieldValue,
  resolveSchemaFieldPath
} from "../models/search-result";
import {
  buildEntityListPath
} from "../models/entity-route";

const DESCRIPTION_FIELD_PATHS = [
  "description",
  "metadata.description",
  "metadata.summary",
  "metadata.about"
];

const HIGHLIGHT_FIELD_CONFIG = {
  organization: [
    {
      key: "linkedin",
      label: "LinkedIn",
      preferredPaths: ["metadata.socials.linkedin", "linkedin"],
      valueType: "link"
    },
    {
      key: "website",
      label: "Website",
      preferredPaths: ["metadata.website", "metadata.domain", "website", "domain"],
      valueType: "link"
    }
  ],
  person: [
    {
      key: "linkedin",
      label: "LinkedIn",
      preferredPaths: ["metadata.socials.linkedin", "linkedin"],
      valueType: "link"
    },
    {
      key: "email",
      label: "Email",
      preferredPaths: [
        "metadata.primaryemail",
        "metadata.workemail",
        "metadata.email.work",
        "metadata.email.personal",
        "metadata.email",
        "email"
      ],
      valueType: "email"
    }
  ]
};

/**
 * Returns the label for one entity type.
 * @param {"organization"|"person"} entityType
 * @returns {string}
 */
function getEntityLabel(entityType) {
  return entityType === "person" ? "Person" : "Organization";
}

/**
 * Resolves one preferred field value using schema first, then path fallback.
 * @param {object|null} record
 * @param {object|null} schema
 * @param {string[]} preferredPaths
 * @returns {string|null}
 */
function resolvePreferredFieldValue(record, schema, preferredPaths) {
  const schemaFieldPath = resolveSchemaFieldPath(schema, preferredPaths);
  if (schemaFieldPath) {
    const schemaValue = getSearchResultFieldValue(record, schemaFieldPath);
    if (schemaValue) {
      return schemaValue;
    }
  }

  for (const path of Array.isArray(preferredPaths) ? preferredPaths : []) {
    const value = getSearchResultFieldValue(record, path);
    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * Ensures URLs render as clickable links even when the source stores a bare domain.
 * @param {string|null} value
 * @returns {string|null}
 */
function normalizeUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Builds the universal highlight rows for one detail page.
 * @param {"organization"|"person"} entityType
 * @param {object|null} record
 * @param {object|null} schema
 * @returns {Array<{key: string, label: string, value: string|null, valueType: string}>}
 */
function buildHighlights(entityType, record, schema) {
  return (HIGHLIGHT_FIELD_CONFIG[entityType] || []).map((field) => ({
    key: field.key,
    label: field.label,
    value: resolvePreferredFieldValue(record, schema, field.preferredPaths),
    valueType: field.valueType
  }));
}

/**
 * Formats one location heading.
 * @param {object|null} location
 * @returns {string}
 */
function formatLocationHeading(location) {
  const city =
    typeof location?.city === "string" && location.city.trim()
      ? location.city.trim()
      : null;
  const regionCode =
    typeof location?.regionCode === "string" && location.regionCode.trim()
      ? location.regionCode.trim()
      : null;
  const address =
    typeof location?.address === "string" && location.address.trim()
      ? location.address.trim()
      : null;

  if (city && regionCode) {
    return `${city}, ${regionCode}`;
  }

  return city || regionCode || address || "Unnamed location";
}

/**
 * Formats supporting location text.
 * @param {object|null} location
 * @returns {string|null}
 */
function formatLocationDetails(location) {
  const address =
    typeof location?.address === "string" && location.address.trim()
      ? location.address.trim()
      : null;
  const countryCode =
    typeof location?.countryCode === "string" && location.countryCode.trim()
      ? location.countryCode.trim()
      : null;
  const heading = formatLocationHeading(location);

  if (address && address !== heading) {
    return countryCode ? `${address} • ${countryCode}` : address;
  }

  return countryCode || null;
}

/**
 * Formats one relationship badge label.
 * @param {object|null} location
 * @returns {string|null}
 */
function formatLocationBadge(location) {
  if (location?.relationship?.metadata?.isHQ) {
    return "HQ";
  }

  const relation =
    typeof location?.relationship?.relation === "string" && location.relationship.relation.trim()
      ? location.relationship.relation.trim()
      : null;
  if (!relation) {
    return null;
  }

  return relation
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/**
 * Renders one highlight value without using a table layout.
 * @param {{label: string, value: string|null, valueType: string}} field
 * @returns {JSX.Element}
 */
function HighlightField({ field }) {
  const normalizedUrl = field.valueType === "link" ? normalizeUrl(field.value) : null;

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
      <Text fontSize="xs" fontWeight="bold" letterSpacing="wide" textTransform="uppercase" color="gray.500">
        {field.label}
      </Text>
      {field.valueType === "email" && field.value ? (
        <ChakraLink href={`mailto:${field.value}`} color="blue.600" fontWeight="medium" mt={2} display="inline-block">
          {field.value}
        </ChakraLink>
      ) : field.valueType === "link" && normalizedUrl ? (
        <ChakraLink href={normalizedUrl} isExternal color="blue.600" fontWeight="medium" mt={2} display="inline-block">
          {field.value}
        </ChakraLink>
      ) : (
        <Text color="gray.400" mt={2}>
          Not available
        </Text>
      )}
    </Box>
  );
}

/**
 * Renders the shared detail page shell for organizations and people.
 * @param {{
 *   entityType: "organization"|"person",
 *   tabs?: Array<{key: string, label: string, to?: string|null}>,
 *   activeTabKey?: string,
 *   data: {
 *     status: string,
 *     statusExplained: string,
 *     record: object|null,
 *     locations: object[],
 *     schema: object|null,
 *     error: string|null
 *   },
 *   children?: import("react").ReactNode
 * }} props
 * @returns {JSX.Element}
 */
export function EntityDetailPage({ entityType, tabs = null, activeTabKey = "info", data, children = null }) {
  const listPath = buildEntityListPath(entityType);
  const record = data.record && typeof data.record === "object" ? data.record : null;
  const entityLabel = getEntityLabel(entityType);
  const name =
    typeof record?.name === "string" && record.name.trim()
      ? record.name.trim()
      : `Unnamed ${entityType}`;
  const description =
    resolvePreferredFieldValue(record, data.schema, DESCRIPTION_FIELD_PATHS) || "No description available.";
  const highlights = buildHighlights(entityType, record, data.schema);

  return (
    <VStack align="stretch" spacing={6}>
      <Box bg="white" borderRadius="lg" shadow="sm" p={6}>
        <ChakraLink as={RemixLink} to={listPath} color="blue.600" fontWeight="semibold">
          Back to {entityType === "person" ? "People" : "Organizations"}
        </ChakraLink>
        <Heading as="h1" size="lg" mt={3}>
          {name}
        </Heading>
        <Text color="gray.600" mt={2}>
          {record ? data.statusExplained : `${entityLabel} detail is unavailable.`}
        </Text>

        <SimpleGrid as="div" id="highlights" columns={{ base: 1, md: 2 }} spacing={4} mt={6}>
          {highlights.map((field) => (
            <HighlightField key={field.key} field={field} />
          ))}
        </SimpleGrid>
      </Box>

      {data.error ? (
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 4fr) minmax(260px, 1fr)" }}
        columnGap={6}
        rowGap={6}
        alignItems="start"
      >
        <Box bg="white" borderRadius="lg" shadow="sm" p={6}>
          <Box borderBottomWidth="1px" borderColor="gray.200">
            <HStack spacing={2} align="flex-end">
              {(Array.isArray(tabs) && tabs.length
                ? tabs
                : [
                    {
                      key: "info",
                      label: "Info",
                      to: null
                    }
                  ]).map((tab) => {
                const isActive = tab.key === activeTabKey;
                const sharedProps = {
                  px: 4,
                  py: 2,
                  fontWeight: "semibold",
                  borderTopRadius: "md",
                  borderWidth: "1px",
                  borderColor: isActive ? "gray.200" : "transparent",
                  borderBottomColor: isActive ? "white" : "transparent",
                  bg: isActive ? "white" : "transparent",
                  color: isActive ? "gray.800" : "gray.600",
                  mb: "-1px"
                };

                if (tab.to) {
                  return (
                    <ChakraLink
                      key={tab.key}
                      as={RemixLink}
                      to={tab.to}
                      _hover={{ textDecoration: "none", color: "gray.800", bg: "gray.50" }}
                      {...sharedProps}
                    >
                      {tab.label}
                    </ChakraLink>
                  );
                }

                return (
                  <Box key={tab.key} {...sharedProps}>
                    {tab.label}
                  </Box>
                );
              })}
            </HStack>
          </Box>

          <Box pt={6}>
            {children || (
              <Text color={record ? "gray.700" : "gray.400"} whiteSpace="pre-wrap">
                {description}
              </Text>
            )}
          </Box>
        </Box>

        <Box bg="white" borderRadius="lg" shadow="sm" p={6}>
          <Heading size="sm" mb={4}>
            Locations
          </Heading>
          {Array.isArray(data.locations) && data.locations.length ? (
            <VStack align="stretch" spacing={3}>
              {data.locations.map((location, index) => {
                const badge = formatLocationBadge(location);
                const details = formatLocationDetails(location);

                return (
                  <Box
                    key={location.uuid || location.address || `${entityType}-location-${index}`}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    p={3}
                  >
                    <Text fontWeight="semibold">{formatLocationHeading(location)}</Text>
                    {details ? (
                      <Text fontSize="sm" color="gray.600" mt={1}>
                        {details}
                      </Text>
                    ) : null}
                    {badge ? (
                      <Badge colorScheme="blue" mt={2}>
                        {badge}
                      </Badge>
                    ) : null}
                  </Box>
                );
              })}
            </VStack>
          ) : (
            <Text color="gray.500">No locations available.</Text>
          )}
        </Box>
      </Grid>
    </VStack>
  );
}
