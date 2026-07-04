import {
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { MilestoneChevrons } from "../components/MilestoneChevrons";
import { ServiceCard } from "../components/ServiceCard";
import { EM_MILESTONES, MOCK_EM_SERVICES } from "../models/services-mock-data.mjs";

export default function AllEmServicesPage() {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = MOCK_EM_SERVICES.filter((s) => {
    const matchesQuery =
      !query ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      (s.subtitle || "").toLowerCase().includes(query.toLowerCase()) ||
      (s.location || "").toLowerCase().includes(query.toLowerCase());
    const matchesStage =
      stageFilter === "all" || s.activePhaseIndex === parseInt(stageFilter, 10);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesQuery && matchesStage && matchesStatus;
  });

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="md" color="gray.900">EM Services</Heading>
        <Text color="gray.500" mt={1} fontSize="sm">
          All Executive Management engagements
        </Text>
      </Box>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" px={5} py={4} shadow="sm">
        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="0.06em" mb={2}>
          Pipeline at a Glance
        </Text>
        <MilestoneChevrons
          milestones={EM_MILESTONES}
          activeIndex={-1}
          size="md"
        />
        <Flex gap="2px" w="full" mt={1}>
          {EM_MILESTONES.map((m, i) => {
            const count = MOCK_EM_SERVICES.filter((s) => s.activePhaseIndex === i).length;
            return (
              <Box key={m.key} flex="1" textAlign="center">
                <Text fontSize="xs" color={count > 0 ? "gray.700" : "gray.300"} fontWeight={count > 0 ? "bold" : "normal"}>
                  {count}
                </Text>
              </Box>
            );
          })}
        </Flex>
      </Box>

      <Flex gap={3} direction={{ base: "column", sm: "row" }}>
        <InputGroup maxW={{ sm: "320px" }}>
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search EM services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            bg="white"
            borderColor="gray.200"
          />
        </InputGroup>

        <HStack spacing={3}>
          <Select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            bg="white"
            borderColor="gray.200"
            w="auto"
          >
            <option value="all">All Stages</option>
            {EM_MILESTONES.map((m, i) => (
              <option key={m.key} value={i}>{m.label}</option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            bg="white"
            borderColor="gray.200"
            w="auto"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="placed">Placed</option>
            <option value="lost">Lost</option>
          </Select>
        </HStack>
      </Flex>

      {filtered.length === 0 ? (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          p={10}
          textAlign="center"
        >
          <Text color="gray.400" fontSize="sm">No services match your filters.</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2, "2xl": 3 }} spacing={4}>
          {filtered.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </SimpleGrid>
      )}
    </VStack>
  );
}
