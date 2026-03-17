import { Heading, Text, VStack, Box } from "@chakra-ui/react";

export default function PeoplePage() {
  return (
    <VStack align="start" spacing={3}>
      <Heading size="md">People</Heading>
      <Text color="gray.600">List and manage people. (Prototype placeholder)</Text>
      <Box w="full" h="200px" bg="white" borderRadius="lg" shadow="sm" p={4} />
    </VStack>
  );
}

