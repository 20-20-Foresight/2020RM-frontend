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
import { ServiceCard } from "../components/ServiceCard";
import { MOCK_ALL_SERVICES } from "../models/services-mock-data.mjs";

const MY_SERVICES = MOCK_ALL_SERVICES.filter((s) => s.recruiter === "Sarah K.");

export default function MyServicesPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = MY_SERVICES.filter((s) => {
    const matchesQuery =
      !query ||
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      (s.subtitle || "").toLowerCase().includes(query.toLowerCase()) ||
      (s.location || "").toLowerCase().includes(query.toLowerCase());
    const matchesType = typeFilter === "all" || s.type === typeFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesQuery && matchesType && matchesStatus;
  });

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="md" color="gray.900">My Services</Heading>
        <Text color="gray.500" mt={1} fontSize="sm">
          Services where you are the assigned recruiter
        </Text>
      </Box>

      <Flex gap={3} direction={{ base: "column", sm: "row" }}>
        <InputGroup maxW={{ sm: "320px" }}>
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            bg="white"
            borderColor="gray.200"
          />
        </InputGroup>

        <HStack spacing={3}>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            bg="white"
            borderColor="gray.200"
            w="auto"
          >
            <option value="all">All Types</option>
            <option value="es">ES Only</option>
            <option value="em">EM Only</option>
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
