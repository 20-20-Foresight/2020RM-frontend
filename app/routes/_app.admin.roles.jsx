import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Textarea,
  Thead,
  Tr,
  VStack
} from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
const { loadRoleManagementPage } = require("../models/access-control.server");
const {
  AccessRoleMutationApiError,
  createAccessRole
} = require("../models/access-role-mutations.server");

export async function loader({ request }) {
  return json(await loadRoleManagementPage({ request }));
}

export async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create_role") {
    try {
      const role = await createAccessRole({ request, formData });
      return json({
        ok: true,
        role
      });
    } catch (error) {
      return json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to create role."
        },
        {
          status: error instanceof AccessRoleMutationApiError ? error.statusCode : 500
        }
      );
    }
  }

  return json(
    {
      ok: false,
      error: "Unsupported roles action."
    },
    { status: 400 }
  );
}

function formatPermissionLabel(permission) {
  if (!permission || typeof permission !== "object") {
    return "";
  }

  const target = String(permission.target || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const action = String(permission.action || "").toUpperCase();
  return `${target} · ${action}`;
}

function buildRoleKey(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

export default function AdminRolesPage() {
  const { roles, sections, error } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [roleLabel, setRoleLabel] = useState("");
  const generatedRoleKey = buildRoleKey(roleLabel);

  useEffect(() => {
    if (actionData?.ok && navigation.state === "idle") {
      setIsCreateDrawerOpen(false);
      setRoleLabel("");
    }
  }, [actionData, navigation.state]);

  if (error) {
    return (
      <VStack align="stretch" spacing={4}>
        <Heading size="md">Roles</Heading>
        <Text color="red.600">{error}</Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={8}>
      <Box>
        <HStack justify="space-between" align="start" gap={4}>
          <Box>
            <Heading size="md" mb={2}>
              Roles
            </Heading>
            <Text color="gray.600">
              Create reusable access roles for entity permissions, tools, and administrative access.
            </Text>
          </Box>
          <Button colorScheme="blue" onClick={() => setIsCreateDrawerOpen(true)}>
            Add Role
          </Button>
        </HStack>
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Existing Roles
        </Heading>
        <VStack align="stretch" spacing={4}>
          {roles.map((role) => (
            <Box key={role.key} bg="white" borderRadius="lg" shadow="sm" p={5}>
              <HStack align="start" justify="space-between" mb={3}>
                <Box>
                  <Text fontWeight="semibold">{role.label}</Text>
                  <Text color="gray.500">{role.key}</Text>
                </Box>
                <Badge colorScheme="blue" textTransform="none">
                  {role.userCount || 0} assigned
                </Badge>
              </HStack>
              {role.description ? (
                <Text color="gray.700" mb={3}>
                  {role.description}
                </Text>
              ) : null}
              <Divider mb={3} />
              <Stack direction="row" wrap="wrap" spacing={2}>
                {(Array.isArray(role.permissions) ? role.permissions : []).map((permission) => (
                  <Badge
                    key={`${role.key}:${permission.category}:${permission.target}:${permission.action}`}
                    colorScheme={permission.category === "admin_access" ? "red" : permission.category === "tools_access" ? "purple" : "gray"}
                    textTransform="none"
                  >
                    {formatPermissionLabel(permission)}
                  </Badge>
                ))}
              </Stack>
            </Box>
          ))}
          {!roles.length ? (
            <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
              <Text color="gray.600">No editable roles have been created yet.</Text>
            </Box>
          ) : null}
        </VStack>
      </Box>

      <Drawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        placement="right"
        size="full"
      >
        <DrawerOverlay />
        <DrawerContent maxW={{ base: "100vw", lg: "75vw" }} overflow="hidden">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Create Role</DrawerHeader>
          <Form method="post">
            <input type="hidden" name="intent" value="create_role" />
            <DrawerBody py={5} overflowY="auto">
              <VStack align="stretch" spacing={6}>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <GridItem>
                    <FormControl isRequired>
                      <FormLabel>Role Label</FormLabel>
                      <Input
                        name="label"
                        placeholder="Recruiter Internal"
                        value={roleLabel}
                        onChange={(event) => setRoleLabel(event.target.value)}
                      />
                    </FormControl>
                  </GridItem>
                  <GridItem>
                    <FormControl isRequired>
                      <FormLabel>Role Key</FormLabel>
                      <Input value={generatedRoleKey} isReadOnly placeholder="recruiter_internal" />
                      <input type="hidden" name="key" value={generatedRoleKey} />
                    </FormControl>
                  </GridItem>
                </Grid>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea name="description" rows={3} placeholder="Short explanation of what this role should allow." />
                </FormControl>

                {sections.map((section) => (
                  <Box key={section.category}>
                    <Heading size="xs" mb={3}>
                      {section.label}
                    </Heading>
                    <TableContainer borderWidth="1px" borderColor="gray.200" borderRadius="md" overflowX="auto">
                      <Table size="sm">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th width="40%">Permission Area</Th>
                            <Th>Allowed Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {section.items.map((item) => (
                            <Tr key={`${section.category}:${item.target}`}>
                              <Td>
                                <Text fontWeight="medium">{item.label}</Text>
                              </Td>
                              <Td>
                                <HStack spacing={6} wrap="wrap">
                                  {item.actions.map((action) => (
                                    <Checkbox
                                      key={`${section.category}:${item.target}:${action}`}
                                      name="permissionKeys"
                                      value={`${section.category}:${item.target}:${action}`}
                                    >
                                      {action === "access" ? "Enabled" : action.charAt(0).toUpperCase() + action.slice(1)}
                                    </Checkbox>
                                  ))}
                                </HStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}

                {actionData?.ok === false ? (
                  <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="md" p={3}>
                    <Text color="red.700">{actionData.error}</Text>
                  </Box>
                ) : null}

                {actionData?.ok ? (
                  <Box borderWidth="1px" borderColor="green.200" bg="green.50" borderRadius="md" p={3}>
                    <Text color="green.700">Role created.</Text>
                  </Box>
                ) : null}
              </VStack>
            </DrawerBody>
            <DrawerFooter borderTopWidth="1px">
              <HStack justify="flex-end" width="100%">
                <Button variant="ghost" onClick={() => setIsCreateDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button colorScheme="blue" type="submit" isLoading={isSubmitting}>
                  Create Role
                </Button>
              </HStack>
            </DrawerFooter>
          </Form>
        </DrawerContent>
      </Drawer>
    </VStack>
  );
}
