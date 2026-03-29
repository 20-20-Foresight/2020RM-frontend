import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
  SimpleGrid,
  Switch,
  Text,
  Textarea,
  VStack
} from "@chakra-ui/react";
import { Form, Link } from "@remix-run/react";
import { useEffect } from "react";

import { writeCachedSifTaxonomy } from "../models/sif-taxonomy-cache";
import { buildSegmentationDocumentPath } from "../models/segmentation-document";
import { buildSegmentationPath } from "../models/sif-taxonomy";

/**
 * Formats a timestamp for the segmentation editor header.
 * @param {string|null|undefined} value
 * @returns {string}
 */
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

/**
 * Joins one string list for textarea defaults.
 * @param {string[]|null|undefined} values
 * @returns {string}
 */
function joinList(values) {
  return Array.isArray(values) ? values.join("\n") : "";
}

/**
 * Renders one expandable paragraph block for long descriptions.
 * @param {{text: string}} props
 * @returns {JSX.Element}
 */
function ExpandableDescription({ text }) {
  const description = typeof text === "string" ? text.trim() : "";

  if (!description) {
    return <Text color="gray.400">No description yet.</Text>;
  }

  if (description.length <= 220) {
    return <Text color="gray.700">{description}</Text>;
  }

  return (
    <Box
      as="details"
      sx={{
        "& > summary": {
          listStyle: "none"
        },
        "& > summary::-webkit-details-marker": {
          display: "none"
        }
      }}
    >
      <Box as="summary" cursor="pointer">
        <Text color="gray.700">{`${description.slice(0, 220)}...`}</Text>
        <Text mt={2} fontSize="sm" fontWeight="semibold" color="blue.600">
          Show full description
        </Text>
      </Box>
      <Text mt={3} color="gray.700">
        {description}
      </Text>
    </Box>
  );
}

/**
 * Renders one metadata summary row for a taxonomy node.
 * @param {{label: string, value: string|null}} props
 * @returns {JSX.Element|null}
 */
function MetadataRow({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <Text fontSize="sm" color="gray.600">
      <Text as="span" fontWeight="semibold" color="gray.700">
        {label}:
      </Text>{" "}
      {value}
    </Text>
  );
}

/**
 * Renders one editable taxonomy node card.
 * @param {{
 *   node: Record<string, unknown>,
 *   kind: "sector"|"industry"|"focus",
 *   childLinkLabel?: string|null,
 *   childLinkPath?: string|null,
 *   isSaving?: boolean
 * }} props
 * @returns {JSX.Element}
 */
function TaxonomyNodeCard({ node, kind, childLinkLabel = null, childLinkPath = null, isSaving = false }) {
  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" p={{ base: 4, md: 5 }}>
      <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
        <Box>
          <Heading size="sm">{node.label}</Heading>
          <HStack spacing={2} mt={2} wrap="wrap">
            {node.crosswalkOnly ? <Badge colorScheme="orange">Crosswalk Only</Badge> : null}
            {node.active === false ? <Badge colorScheme="red">Inactive</Badge> : <Badge colorScheme="green">Active</Badge>}
            {Array.isArray(node.examples) && node.examples.length ? (
              <Badge colorScheme="purple">{node.examples.length} Examples</Badge>
            ) : null}
            {Array.isArray(node.seenInCrosswalks) && node.seenInCrosswalks.length ? (
              <Badge colorScheme="cyan">{node.seenInCrosswalks.length} Crosswalk Sources</Badge>
            ) : null}
          </HStack>
        </Box>

        <HStack spacing={3} wrap="wrap">
          {childLinkLabel && childLinkPath ? (
            <Button as={Link} to={childLinkPath} variant="ghost" colorScheme="blue">
              {childLinkLabel}
            </Button>
          ) : null}
        </HStack>
      </Flex>

      <Box mt={4}>
        <ExpandableDescription text={node.description || ""} />
      </Box>

      <VStack align="stretch" spacing={2} mt={4}>
        <MetadataRow label="Examples" value={Array.isArray(node.examples) && node.examples.length ? node.examples.join(", ") : null} />
        <MetadataRow label="Why Here" value={typeof node.whyHere === "string" && node.whyHere ? node.whyHere : null} />
        <MetadataRow label="Aliases" value={Array.isArray(node.aliases) && node.aliases.length ? node.aliases.join(", ") : null} />
        <MetadataRow
          label="Seen In Crosswalks"
          value={Array.isArray(node.seenInCrosswalks) && node.seenInCrosswalks.length ? node.seenInCrosswalks.join(", ") : null}
        />
      </VStack>

      <Box
        as="details"
        mt={5}
        sx={{
          "& > summary": {
            listStyle: "none"
          },
          "& > summary::-webkit-details-marker": {
            display: "none"
          }
        }}
      >
        <Box as="summary" cursor="pointer">
          <Button as="span" variant="outline">
            Edit
          </Button>
        </Box>

        <Form method="post">
          <input type="hidden" name="intent" value="update-node" />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="nodeId" value={node.id || ""} />

          <VStack align="stretch" spacing={4} mt={5}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Label</FormLabel>
                <Input name="label" defaultValue={node.label || ""} bg="white" />
              </FormControl>

              <FormControl>
                <FormLabel>Aliases</FormLabel>
                <Input name="aliases" defaultValue={Array.isArray(node.aliases) ? node.aliases.join(", ") : ""} bg="white" />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea name="description" defaultValue={node.description || ""} minH="120px" bg="white" />
            </FormControl>

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
              <FormControl>
                <FormLabel>Examples</FormLabel>
                <Textarea
                  name="examples"
                  defaultValue={joinList(node.examples)}
                  minH="112px"
                  placeholder="One example per line"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Seen In Crosswalks</FormLabel>
                <Textarea
                  name="seenInCrosswalks"
                  defaultValue={joinList(node.seenInCrosswalks)}
                  minH="112px"
                  placeholder="One source per line"
                  bg="white"
                />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>Why Here</FormLabel>
              <Textarea name="whyHere" defaultValue={node.whyHere || ""} minH="112px" bg="white" />
            </FormControl>

            <HStack spacing={3}>
              <Button type="submit" colorScheme="blue" isLoading={isSaving} loadingText="Saving">
                Save Changes
              </Button>
              <Text fontSize="sm" color="gray.500">
                Click Edit again to collapse.
              </Text>
            </HStack>
          </VStack>
        </Form>
      </Box>
    </Box>
  );
}

/**
 * Renders one add-node panel at the bottom of a taxonomy list.
 * @param {{
 *   kind: "sector"|"industry"|"focus",
 *   isSaving?: boolean
 * }} props
 * @returns {JSX.Element}
 */
function AddNodePanel({ kind, isSaving = false }) {
  const title = `Add ${kind}`;

  return (
    <Box borderWidth="1px" borderStyle="dashed" borderColor="blue.300" borderRadius="lg" bg="blue.50" p={{ base: 4, md: 5 }}>
      <Heading size="sm">{title}</Heading>
      <Text color="blue.800" mt={2}>
        New items start with a label and description. The rest of the SIF metadata can be refined after the item is
        created.
      </Text>

      <Form method="post">
        <input type="hidden" name="intent" value="add-node" />
        <input type="hidden" name="kind" value={kind} />

        <VStack align="stretch" spacing={4} mt={4}>
          <FormControl isRequired>
            <FormLabel>{`${title} Label`}</FormLabel>
            <Input name="label" placeholder={`Enter the ${kind} name`} bg="white" />
          </FormControl>

          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea name="description" minH="112px" placeholder={`Add the ${kind} description`} bg="white" />
          </FormControl>

          <HStack spacing={3}>
            <Button type="submit" colorScheme="blue" isLoading={isSaving} loadingText="Saving">
              {title}
            </Button>
          </HStack>
        </VStack>
      </Form>
    </Box>
  );
}

/**
 * Renders the top-level segmentation landing page.
 * @param {{
 *   ruleItems?: Array<{id: string|null, name: string}>,
 *   rulesError?: {message?: string}|null
 * }} props
 * @returns {JSX.Element}
 */
export function SegmentationLandingPage({ ruleItems = [], rulesError = null }) {
  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="md">Segmentation</Heading>
        <Text color="gray.600" mt={2}>
          Choose which segmentation admin workflow to open.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white" p={{ base: 5, md: 6 }}>
          <Heading size="sm">Alter segmentation rules</Heading>
          <Text color="gray.600" mt={3}>
            Browse the available segmentation rule documents. This first pass lists the documents by name.
          </Text>

          {rulesError?.message ? (
            <Alert status="error" borderRadius="md" mt={5}>
              <AlertIcon />
              <AlertDescription>{rulesError.message}</AlertDescription>
            </Alert>
          ) : null}

          {ruleItems.length ? (
            <VStack align="stretch" spacing={3} mt={5}>
              {ruleItems.map((item) => {
                const itemPath = buildSegmentationDocumentPath(item.id);

                return (
                  <Box
                    key={item.id || item.name}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    px={4}
                    py={3}
                    transition="border-color 0.2s ease, background-color 0.2s ease"
                    _hover={item.id ? { borderColor: "blue.300", bg: "blue.50" } : undefined}
                  >
                    <Flex align="center" justify="space-between" gap={3}>
                      <Text fontWeight="semibold" color="gray.800">
                        {item.name}
                      </Text>

                      {item.id ? (
                        <Button as={Link} to={itemPath} size="sm" colorScheme="blue" variant="outline">
                          Open
                        </Button>
                      ) : null}
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          ) : rulesError?.message ? null : (
            <Text color="gray.500" mt={5}>
              No segmentation documents were returned.
            </Text>
          )}
        </Box>

        <Box borderWidth="1px" borderColor="blue.200" borderRadius="lg" bg="white" p={{ base: 5, md: 6 }}>
          <Heading size="sm">Alter sector / industry / focus</Heading>
          <Text color="gray.600" mt={3}>
            Edit the authoritative SIF taxonomy document, including sector, industry, and focus descriptions.
          </Text>
          <Button as={Link} to={buildSegmentationPath("sectors")} mt={5} colorScheme="blue">
            Open Editor
          </Button>
        </Box>
      </SimpleGrid>
    </VStack>
  );
}

/**
 * Renders the shared SIF taxonomy editor workspace.
 * @param {{
 *   taxonomyData: {
 *     id: string|null,
 *     version: number|null,
 *     description: string,
 *     lastmodifieddate: string|null,
 *     lastmodifiedby: string|null,
 *     document: Record<string, unknown>
 *   },
 *   items: Record<string, unknown>[],
 *   kind: "sector"|"industry"|"focus",
 *   sector?: Record<string, unknown>|null,
 *   industry?: Record<string, unknown>|null,
 *   actionData?: {ok?: boolean, error?: {message?: string}|null, saved?: {version?: number|null}|null}|undefined,
 *   isSaving?: boolean
 * }} props
 * @returns {JSX.Element}
 */
export function SifTaxonomyEditorPage({
  taxonomyData,
  items,
  kind,
  sector = null,
  industry = null,
  actionData,
  isSaving = false
}) {
  useEffect(() => {
    void writeCachedSifTaxonomy({
      id: taxonomyData.id,
      version: taxonomyData.version,
      document: taxonomyData.document
    }).catch(() => {});
  }, [taxonomyData.document, taxonomyData.id, taxonomyData.version]);

  const kindTitle = kind === "sector" ? "Sectors" : kind === "industry" ? "Industries" : "Focuses";
  const breadcrumb =
    kind === "sector"
      ? "Sectors"
      : kind === "industry"
        ? `Sector: ${sector?.label || "Unknown"} >> Industries`
        : `Sector: ${sector?.label || "Unknown"} >> Industry: ${industry?.label || "Unknown"} >> Focuses`;
  const backLink =
    kind === "industry"
      ? buildSegmentationPath("sectors")
      : kind === "focus"
        ? buildSegmentationPath("industries", {
            sectorSlug: sector?.slug || ""
          })
        : null;
  const backLabel = kind === "industry" ? "Back To Sectors" : kind === "focus" ? "Back To Industries" : null;

  return (
    <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" overflow="hidden">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="md">Segmentation</Heading>
            <Text color="gray.600" mt={2}>
              Edit the authoritative SIF taxonomy stored at `crm.data.taxonomy:sif`.
            </Text>
            <Text color="gray.500" fontSize="sm" mt={3}>
              {breadcrumb}
            </Text>
          </Box>

          <VStack align={{ base: "start", md: "end" }} spacing={2}>
            {backLink && backLabel ? (
              <Button as={Link} to={backLink} variant="ghost" colorScheme="blue">
                {backLabel}
              </Button>
            ) : null}
            <HStack spacing={2} wrap="wrap">
              {taxonomyData.version != null ? <Badge colorScheme="gray">Version {taxonomyData.version}</Badge> : null}
              <Badge colorScheme="blue">{kindTitle}</Badge>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              Last modified {formatTimestamp(taxonomyData.lastmodifieddate)} by {taxonomyData.lastmodifiedby || "Unknown"}
            </Text>
          </VStack>
        </Flex>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }}>
        {actionData?.error?.message ? (
          <Alert status="error" borderRadius="md" mb={5}>
            <AlertIcon />
            <AlertDescription>{actionData.error.message}</AlertDescription>
          </Alert>
        ) : null}

        {actionData?.ok ? (
          <Alert status="success" borderRadius="md" mb={5}>
            <AlertIcon />
            <AlertDescription>
              Saved version {actionData.saved?.version != null ? actionData.saved.version : "updated"} successfully.
            </AlertDescription>
          </Alert>
        ) : null}

        <VStack align="stretch" spacing={5}>
          {items.length ? (
            items.map((node) => {
              const childLinkLabel =
                kind === "sector" ? "Edit Industries" : kind === "industry" ? "Edit Focuses" : null;
              const childLinkPath =
                kind === "sector"
                  ? buildSegmentationPath("industries", {
                      sectorSlug: node.slug
                    })
                  : kind === "industry"
                    ? buildSegmentationPath("focuses", {
                        sectorSlug: sector?.slug || "",
                        industrySlug: node.slug
                      })
                    : null;

              return (
                <TaxonomyNodeCard
                  key={node.id || node.slug || node.label}
                  node={node}
                  kind={kind}
                  childLinkLabel={childLinkLabel}
                  childLinkPath={childLinkPath}
                  isSaving={isSaving}
                />
              );
            })
          ) : (
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="gray.50" p={5}>
              <Text color="gray.600">No {kindTitle.toLowerCase()} have been added yet.</Text>
            </Box>
          )}

          <Divider />

          <AddNodePanel kind={kind} isSaving={isSaving} />
        </VStack>
      </Box>
    </Box>
  );
}
