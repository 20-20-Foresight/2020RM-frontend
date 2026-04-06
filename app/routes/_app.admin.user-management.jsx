import {
  Box,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack
} from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
const { loadAccessControlPage } = require("../models/access-control.server");

export async function loader({ request }) {
  const data = await loadAccessControlPage({ request });
  return json(data);
}

export default function AdminUserManagementPage() {
  const { users, roles, error } = useLoaderData();

  if (error) {
    return (
      <VStack align="stretch" spacing={4}>
        <Heading size="md">User Management</Heading>
        <Text color="red.600">{error}</Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={8}>
      <Box>
        <Heading size="md" mb={2}>
          User Management
        </Heading>
        <Text color="gray.600">
          Review pending access users, assigned roles, and local person links.
        </Text>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Role Catalog
        </Heading>
        <TableContainer bg="white" borderRadius="lg" shadow="sm">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Role</Th>
                <Th>Personas</Th>
              </Tr>
            </Thead>
            <Tbody>
              {roles.map((role) => (
                <Tr key={role.key}>
                  <Td>{role.label}</Td>
                  <Td>{Array.isArray(role.personas) && role.personas.length ? role.personas.join(", ") : "None"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Users
        </Heading>
        <TableContainer bg="white" borderRadius="lg" shadow="sm">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Roles</Th>
                <Th>Local Person</Th>
                <Th>RPC Person</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>
                    <Text fontWeight="medium">
                      {user.firstName} {user.lastName}
                    </Text>
                    <Text color="gray.500">{user.email}</Text>
                  </Td>
                  <Td>{user.status}</Td>
                  <Td>{Array.isArray(user.roleKeys) && user.roleKeys.length ? user.roleKeys.join(", ") : "None"}</Td>
                  <Td>{user.localPersonId || "Missing"}</Td>
                  <Td>{user.rpcPersonId || "Not linked"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>
    </VStack>
  );
}
