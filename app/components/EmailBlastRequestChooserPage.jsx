import React from "react";
import { Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { Link } from "@remix-run/react";
import { MOCK_ES_SERVICES } from "../models/services-mock-data.mjs";

/**
 * Fallback entry point for the Email Blast Request tool when it's opened
 * directly from the nav rather than from a service. The normal path is
 * launching from a service's Outreach tab, which already supplies the
 * service — this page exists only so the nav link still goes somewhere.
 */
export function EmailBlastRequestChooserPage() {
  return (
    <Box maxW="720px">
      <Heading size="lg" mb={1}>Email Blast Request</Heading>
      <Text color="gray.600" mb={6}>
        Email blasts are launched from a service. Pick one below, or start from the service's
        Outreach tab next time.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {MOCK_ES_SERVICES.map((service) => (
          <Box
            as={Link}
            key={service.id}
            to={`/tools/email-blast-request/${service.id}`}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
            bg="white"
            _hover={{ borderColor: "blue.300" }}
          >
            <VStack align="stretch" spacing={1}>
              <Text fontWeight="semibold">{service.title}</Text>
              <Text fontSize="sm" color="gray.500">{service.subtitle}</Text>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
