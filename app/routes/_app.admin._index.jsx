import { Box, Heading, LinkBox, LinkOverlay, Text, VStack } from "@chakra-ui/react";
import { Link } from "@remix-run/react";

export default function AdminIndexPage() {
  return (
    <VStack align="stretch" spacing={4}>
      <Heading size="md">Admin</Heading>
      <Text color="gray.600">Admin controls and permissions.</Text>
      <LinkBox bg="white" borderRadius="lg" shadow="sm" p={5}>
        <Heading size="sm" mb={2}>
          <LinkOverlay as={Link} to="/admin/roles">
            Roles
          </LinkOverlay>
        </Heading>
        <Text color="gray.600">Create reusable roles for entity access, tools, and administrative permissions.</Text>
      </LinkBox>
      <LinkBox bg="white" borderRadius="lg" shadow="sm" p={5}>
        <Heading size="sm" mb={2}>
          <LinkOverlay as={Link} to="/admin/user-management">
            User Management
          </LinkOverlay>
        </Heading>
        <Text color="gray.600">Approve users, assign roles, and manage local person links.</Text>
      </LinkBox>
    </VStack>
  );
}
