import { Heading, Text, VStack, Box } from "@chakra-ui/react";

export default function MarketingPage() {
  return (
    <VStack align="start" spacing={3}>
      <Heading size="md">Marketing</Heading>
      <Text color="gray.600">Campaigns and outreach live here.</Text>
      <Box w="full" h="200px" bg="white" borderRadius="lg" shadow="sm" p={4} />
    </VStack>
  );
}
