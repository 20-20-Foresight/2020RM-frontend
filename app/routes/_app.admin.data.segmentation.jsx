import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack
} from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { AdminDataApiError } from "../models/admin-data.server";
import { sortAdminDataItems } from "../models/admin-data-list.mjs";

/**
 * Builds one stable route error payload.
 * @param {unknown} error
 * @returns {{message: string}}
 */
function buildRouteError(error) {
  if (error instanceof AdminDataApiError) {
    return {
      message: error.message
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unable to load segmentation data."
  };
}

/**
 * Builds the route pathname for one admin data record.
 * @param {string|null|undefined} id
 * @returns {string}
 */
function buildAdminDataPath(id) {
  return id ? `/admin/data/${encodeURIComponent(id)}` : "/admin/data";
}

/**
 * Loads the segmentation document helpers.
 * @returns {Promise<{
 *   loadCategoryDocuments: Function,
 *   loadSegmentationDocuments: Function
 * }>}
 */
async function loadSegmentationDocumentModule() {
  return import("../models/segmentation-document.server.js");
}

export async function loader({ request }) {
  try {
    const { loadCategoryDocuments, loadSegmentationDocuments } = await loadSegmentationDocumentModule();
    const [categoryDocuments, crosswalkDocuments] = await Promise.all([
      loadCategoryDocuments({ request }),
      loadSegmentationDocuments({ request })
    ]);

    return json({
      categoryDocuments: sortAdminDataItems(categoryDocuments),
      crosswalkDocuments: sortAdminDataItems(crosswalkDocuments),
      error: null
    });
  } catch (error) {
    const status = error instanceof AdminDataApiError ? error.statusCode : 500;

    return json(
      {
        categoryDocuments: [],
        crosswalkDocuments: [],
        error: buildRouteError(error)
      },
      {
        status
      }
    );
  }
}

/**
 * Renders one segmentation document card.
 * @param {{
 *   item: {
 *     id: string|null,
 *     name: string,
 *     description: string
 *   }
 * }} props
 * @returns {JSX.Element}
 */
function SegmentationDocumentCard({ item }) {
  const itemPath = buildAdminDataPath(item.id);

  return (
    <Box
      as={Link}
      to={itemPath}
      display="block"
      textDecoration="none"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      px={5}
      py={5}
      transition="all 0.16s ease"
      _hover={{
        borderColor: "blue.300",
        boxShadow: "md",
        transform: "translateY(-1px)"
      }}
    >
      <VStack align="stretch" spacing={3}>
        <Heading size="sm" color="gray.900">
          {item.name || "Untitled data"}
        </Heading>
        <Text color={item.description ? "gray.700" : "gray.400"} noOfLines={4}>
          {item.description || "No description"}
        </Text>
      </VStack>
    </Box>
  );
}

/**
 * Renders one labeled segmentation section.
 * @param {{
 *   id?: string,
 *   title: string,
 *   description: string,
 *   items: Array<{id: string|null, name: string, description: string}>,
 *   columns?: object
 * }} props
 * @returns {JSX.Element}
 */
function SegmentationSection({
  id,
  title,
  description,
  items,
  columns = { base: 1, md: 2 }
}) {
  return (
    <VStack id={id} align="stretch" spacing={4}>
      <Box>
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
          {title}
        </Text>
        <Text color="gray.600" mt={1}>
          {description}
        </Text>
      </Box>

      {items.length ? (
        <SimpleGrid columns={columns} spacing={4}>
          {items.map((item) => (
            <SegmentationDocumentCard key={item.id || item.name} item={item} />
          ))}
        </SimpleGrid>
      ) : (
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={5} py={6} bg="white">
          <Text color="gray.500">No documents were returned for this section.</Text>
        </Box>
      )}
    </VStack>
  );
}

export default function AdminDataSegmentationRoute() {
  const data = useLoaderData();

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="md">Segmentation</Heading>
            <Text color="gray.600" mt={2}>
              Open category and crosswalk data documents for segmentation editing.
            </Text>
          </Box>

          <Button as={Link} to="/admin/data" variant="outline">
            Back To Data
          </Button>
        </Flex>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" overflow="auto">
        {data.error?.message ? (
          <Alert status="error" borderRadius="md" mb={5}>
            <AlertIcon />
            <AlertDescription>{data.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <VStack align="stretch" spacing={8}>
          <SegmentationSection
            id="categories"
            title="Categories"
            description="Category documents used by the segmentation editors."
            items={data.categoryDocuments}
            columns={{ base: 1, md: 2 }}
          />

          <SegmentationSection
            id="crosswalks"
            title="Crosswalks"
            description="Segmentation mapping documents and editable crosswalk data."
            items={data.crosswalkDocuments}
            columns={{ base: 1, md: 2, xl: 3 }}
          />
        </VStack>
      </Box>
    </Box>
  );
}
