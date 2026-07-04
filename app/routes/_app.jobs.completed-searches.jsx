import { Badge, Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ServiceCard } from "../components/ServiceCard";
import { loadEsClientCompletedSearches } from "../models/es-client.server";

export async function loader({ request }) {
  return json(await loadEsClientCompletedSearches({ request }));
}

export default function CompletedSearchesPage() {
  const data = useLoaderData();
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="md" color="gray.900">Completed Searches</Heading>
        <Text color="gray.500" mt={1} fontSize="sm">
          Closed Executive Search engagements and recent placement work
        </Text>
      </Box>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={5} py={4} shadow="sm">
        <Badge colorScheme="blue" mb={2}>{items.length} searches</Badge>
        <Text color="gray.600" fontSize="sm">
          This area is now backed by fixture REST responses from CRM backend so we can refine the presentation without touching auth or live upstream data.
        </Text>
      </Box>

      {items.length ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          {items.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </SimpleGrid>
      ) : (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={10} textAlign="center">
          <Text color="gray.400" fontSize="sm">No completed searches are available.</Text>
        </Box>
      )}
    </VStack>
  );
}
