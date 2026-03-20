import { Box, Heading, Text, VStack } from "@chakra-ui/react";

/**
 * Render a lightweight placeholder page for unfinished subsections.
 * @param {{title: string, description: string}} props
 * @returns {JSX.Element}
 */
export function PlaceholderSectionPage({ title, description }) {
  return (
    <VStack align="start" spacing={3}>
      <Heading size="md">{title}</Heading>
      <Text color="gray.600">{description}</Text>
      <Box w="full" h="200px" bg="white" borderRadius="lg" shadow="sm" p={4} />
    </VStack>
  );
}
