import { Heading, Text, VStack, Box } from "@chakra-ui/react";

export default function SettingsPage() {
  return (
    <VStack align="start" spacing={3}>
      <Heading size="md">Settings</Heading>
      <Text color="gray.600">User and org settings. (Prototype placeholder)</Text>
      <Box w="full" h="200px" bg="white" borderRadius="lg" shadow="sm" p={4} />
    </VStack>
  );
}

