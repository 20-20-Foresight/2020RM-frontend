import { Box, Heading, Text, VStack } from "@chakra-ui/react";

export default function InvoicesPage() {
  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="md" color="gray.900">Invoices</Heading>
        <Text color="gray.500" mt={1} fontSize="sm">
          TBD
        </Text>
      </Box>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={10} textAlign="center">
        <Text color="gray.500">TBD</Text>
      </Box>
    </VStack>
  );
}
