import { Heading, Text, VStack, Box } from "@chakra-ui/react";

export default function AdminPage() {
  return (
    <VStack align="start" spacing={3}>
      <Heading size="md">Admin</Heading>
      <Text color="gray.600">Admin controls and permissions. (Prototype placeholder)</Text>
      <Box w="full" h="200px" bg="white" borderRadius="lg" shadow="sm" p={4} />
    </VStack>
  );
}

