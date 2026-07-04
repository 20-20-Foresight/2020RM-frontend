/**
 * Design page: Example
 * Mock data only. To use real data, add an export async function loader() here.
 */
import {
  Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Badge, HStack, Avatar
} from "@chakra-ui/react";
import { mockPeople, mockOrganizations } from "../models/design-mock.mjs";

const stageBadge = { Client: "green", Prospect: "blue", Lead: "orange" };

export default function DesignExamplePage() {
  return (
    <Box>
      <Heading size="md" mb={1}>Example Design Page</Heading>
      <Text color="gray.500" fontSize="sm" mb={6}>
        This is a design sandbox page. Edit this file to prototype your layout.
      </Text>

      <Heading size="sm" mb={3}>People</Heading>
      <Table size="sm" mb={8}>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Title</Th>
            <Th>Organization</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {mockPeople.map((p) => (
            <Tr key={p.id}>
              <Td>
                <HStack spacing={2}>
                  <Avatar size="xs" name={`${p.firstName} ${p.lastName}`} />
                  <Text>{p.firstName} {p.lastName}</Text>
                </HStack>
              </Td>
              <Td>{p.title}</Td>
              <Td>{p.organizationName}</Td>
              <Td>
                <Badge colorScheme={p.status === "Active" ? "green" : "gray"}>
                  {p.status}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Heading size="sm" mb={3}>Organizations</Heading>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Industry</Th>
            <Th>Headcount</Th>
            <Th>Stage</Th>
          </Tr>
        </Thead>
        <Tbody>
          {mockOrganizations.map((o) => (
            <Tr key={o.id}>
              <Td fontWeight="medium">{o.name}</Td>
              <Td>{o.industry}</Td>
              <Td>{o.headcount.toLocaleString()}</Td>
              <Td>
                <Badge colorScheme={stageBadge[o.stage] || "gray"}>{o.stage}</Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
