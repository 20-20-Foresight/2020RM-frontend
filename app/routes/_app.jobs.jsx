import { Heading, Text, VStack, Box } from "@chakra-ui/react";

export default function JobsPage() {
  return (
    <VStack align="start" spacing={3}>
      <Heading size="md">Jobs</Heading>
      <Text color="gray.600">Job lifecycle flows will appear here.</Text>
      <Box w="full" h="200px" bg="white" borderRadius="lg" shadow="sm" p={4} />
    </VStack>
  );
}
