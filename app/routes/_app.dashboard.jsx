import { Heading, Text, SimpleGrid, Box, Stat, StatLabel, StatNumber } from "@chakra-ui/react";

const stats = [
  { label: "Organizations", value: "128" },
  { label: "People", value: "2,431" },
  { label: "Jobs", value: "47" },
  { label: "Campaigns", value: "12" }
];

export default function DashboardPage() {
  return (
    <Box>
      <Heading size="md" mb={2}>
        Welcome back
      </Heading>
      <Text color="gray.600" mb={6}>
        High-level view of your objects.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        {stats.map((item) => (
          <Stat key={item.label} bg="white" borderRadius="lg" p={4} shadow="sm">
            <StatLabel>{item.label}</StatLabel>
            <StatNumber>{item.value}</StatNumber>
          </Stat>
        ))}
      </SimpleGrid>
    </Box>
  );
}

