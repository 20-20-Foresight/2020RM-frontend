import { Badge, Box, Flex, Heading, LinkBox, LinkOverlay, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
/**
 * Builds the route pathname for one admin data record.
 * @param {string|null|undefined} id
 * @returns {string}
 */
function buildAdminDataPath(id) {
  return id ? `/admin/data/${encodeURIComponent(id)}` : "/admin/data";
}

async function loadSegmentationV312DocumentModule() {
  const module = await import("../models/segmentation-v312-documents.server.js");
  return module.default || module;
}

export async function loader({ request }) {
  const { loadSegmentationDocuments: loadSegmentationV312Documents } = await loadSegmentationV312DocumentModule();
  const documentsResult = await loadSegmentationV312Documents({ request });

  return json({
    documents: Array.isArray(documentsResult?.documents) ? documentsResult.documents : [],
    syncStatus: documentsResult?.syncStatus || null
  });
}

/**
 * Renders one segmentation document card.
 * @param {{
 *   item: {
 *     id: string|null,
 *     name?: string,
 *     title?: string,
 *     description?: string,
 *     summary?: string
 *   }
 * }} props
 * @returns {JSX.Element}
 */
function SegmentationDocumentCard({ item }) {
  const itemPath = item.path || buildAdminDataPath(item.id);
  const heading = item.name || item.title || "Untitled data";
  const description = item.description || item.summary || "";

  return (
    <LinkBox
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
          <LinkOverlay as={Link} to={itemPath}>
            {heading}
          </LinkOverlay>
        </Heading>
        <Text color={description ? "gray.700" : "gray.400"} noOfLines={4}>
          {description || "No description"}
        </Text>
      </VStack>
    </LinkBox>
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
  const syncStatus = data.syncStatus || null;
  const syncTone =
    syncStatus?.status === "failed"
      ? "red"
      : syncStatus?.status === "syncing"
        ? "blue"
        : syncStatus?.status === "scheduled"
          ? "orange"
      : syncStatus?.dirty === true
        ? "orange"
        : syncStatus?.status === "synced"
          ? "green"
          : "gray";

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Box>
          <Heading size="md">Segmentation</Heading>
          <Text color="gray.600" mt={2}>
            Open the sector, vertical, keyword, and email industry reference pages for segmentation.
          </Text>
        </Box>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" overflow="auto">
        <VStack align="stretch" spacing={8}>
          <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={3} wrap="wrap">
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.600">
                AI Knowledge Base
              </Text>
              <Text color="gray.500" mt={1}>
                {syncStatus?.status === "failed"
                  ? syncStatus.lastErrorMessage || "Last sync failed."
                  : syncStatus?.status === "syncing"
                    ? "AI sync is running in the background."
                    : syncStatus?.status === "scheduled" && syncStatus?.nextScheduledAt
                      ? `Sync scheduled for ${new Date(syncStatus.nextScheduledAt).toLocaleString()}.`
                  : syncStatus?.dirty === true
                    ? "Playbook edits have been saved and are waiting for AI sync."
                    : syncStatus?.lastSyncedAt
                      ? `Last synced ${new Date(syncStatus.lastSyncedAt).toLocaleString()}.`
                      : "No sync has run yet."}
              </Text>
            </Box>
            <Badge colorScheme={syncTone} borderRadius="full" px={3} py={1}>
              {syncStatus?.status === "failed"
                ? "Sync Failed"
                : syncStatus?.status === "syncing"
                  ? "Syncing"
                  : syncStatus?.status === "scheduled"
                    ? "Sync Scheduled"
                : syncStatus?.dirty === true
                  ? "Sync Pending"
                  : syncStatus?.status === "synced"
                    ? "Synced"
                    : "Idle"}
            </Badge>
          </Flex>

          <SegmentationSection
            id="documents"
            title="Definitions And Rules"
            description="Each page combines definitions and rules, with tabs to switch between them."
            items={data.documents}
            columns={{ base: 1, md: 2, xl: 2 }}
          />
        </VStack>
      </Box>
    </Box>
  );
}
