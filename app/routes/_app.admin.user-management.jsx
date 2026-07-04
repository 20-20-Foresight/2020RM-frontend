import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Heading,
  HStack,
  Input,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Select,
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
import { ChevronDownIcon } from "@chakra-ui/icons";
import { json } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
const { loadAccessControlPage } = require("../models/access-control.server");
const {
  AccessControlMutationApiError,
  createAccessControlUser,
  createAccessControlLocalPerson,
  startGhostSession,
  updateAccessControlUser
} = require("../models/access-control-mutations.server");

export async function loader({ request }) {
  const data = await loadAccessControlPage({ request });
  return json(data);
}

export async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create_local_person") {
    try {
      const result = await createAccessControlLocalPerson({ request, formData });
      return json({
        ok: true,
        intent,
        ...result
      });
    } catch (error) {
      return json(
        {
          ok: false,
          intent,
          error:
            error instanceof Error
              ? error.message
              : "Unable to create the local person.",
        },
        {
          status:
            error instanceof AccessControlMutationApiError
              ? error.statusCode
              : 500
        }
      );
    }
  }

  if (intent === "save_user_access") {
    try {
      const user = await updateAccessControlUser({ request, formData });
      return json({
        ok: true,
        intent,
        user
      });
    } catch (error) {
      return json(
        {
          ok: false,
          intent,
          error:
            error instanceof Error
              ? error.message
              : "Unable to update the user.",
        },
        {
          status:
            error instanceof AccessControlMutationApiError
              ? error.statusCode
              : 500
        }
      );
    }
  }

  if (intent === "create_user") {
    try {
      const user = await createAccessControlUser({ request, formData });
      return json({
        ok: true,
        intent,
        user
      });
    } catch (error) {
      return json(
        {
          ok: false,
          intent,
          error:
            error instanceof Error
              ? error.message
              : "Unable to create the user.",
        },
        {
          status:
            error instanceof AccessControlMutationApiError
              ? error.statusCode
              : 500
        }
      );
    }
  }

  if (intent === "start_ghost") {
    try {
      const ghost = await startGhostSession({ request, formData });
      return json({
        ok: true,
        intent,
        ghost
      });
    } catch (error) {
      return json(
        {
          ok: false,
          intent,
          error:
            error instanceof Error
              ? error.message
              : "Unable to start ghosting.",
        },
        {
          status:
            error instanceof AccessControlMutationApiError
              ? error.statusCode
              : 500
        }
      );
    }
  }

  return json(
    {
      ok: false,
      error: "Unsupported access control action."
    },
    { status: 400 }
  );
}

function getStatusColorScheme(status) {
  switch (status) {
    case "active":
      return "green";
    case "disabled":
      return "red";
    default:
      return "orange";
  }
}

function formatPersonaLabel(personas, personaKey) {
  if (!personaKey) {
    return "Unassigned";
  }

  const matchedPersona = Array.isArray(personas)
    ? personas.find((persona) => persona.key === personaKey)
    : null;
  if (matchedPersona?.label) {
    return matchedPersona.label;
  }

  return String(personaKey)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminUserManagementPage() {
  const { users, roles, personas, error } = useLoaderData();
  const createFetcher = useFetcher();
  const ghostFetcher = useFetcher();
  const saveFetcher = useFetcher();
  const personFetcher = useFetcher();
  const revalidator = useRevalidator();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [selectedRoleKeys, setSelectedRoleKeys] = useState([]);
  const [pendingSave, setPendingSave] = useState(false);
  const [draftStatus, setDraftStatus] = useState("pending_access");
  const [draftDefaultPersonaKey, setDraftDefaultPersonaKey] = useState("");
  const [draftLocalPersonId, setDraftLocalPersonId] = useState("");
  const [draftRpcPersonId, setDraftRpcPersonId] = useState("");
  const initializedUserIdRef = useRef(null);
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [selectedUserId, users]
  );
  const selectedRoleLabels = useMemo(
    () => roles
      .filter((role) => selectedRoleKeys.includes(role.key))
      .map((role) => role.label),
    [roles, selectedRoleKeys]
  );

  useEffect(() => {
    if (pendingSave && saveFetcher.state === "idle" && saveFetcher.data?.ok) {
      setSubmitError(null);
      setPendingSave(false);
      setSelectedUserId(null);
      revalidator.revalidate();
    }
  }, [pendingSave, revalidator, saveFetcher.data, saveFetcher.state]);

  useEffect(() => {
    if (createFetcher.state === "idle" && createFetcher.data?.ok && createFetcher.data?.user?.id) {
      setSubmitError(null);
      setSelectedUserId(createFetcher.data.user.id);
      revalidator.revalidate();
    }
  }, [createFetcher.data, createFetcher.state, revalidator]);

  useEffect(() => {
    if (createFetcher.state === "idle" && createFetcher.data?.ok === false) {
      setSubmitError(createFetcher.data.error || "Unable to create the user.");
    }
  }, [createFetcher.data, createFetcher.state]);

  useEffect(() => {
    if (ghostFetcher.state === "idle" && ghostFetcher.data?.ok) {
      window.location.assign("/dashboard");
    }
  }, [ghostFetcher.data, ghostFetcher.state]);

  useEffect(() => {
    if (ghostFetcher.state === "idle" && ghostFetcher.data?.ok === false) {
      setSubmitError(ghostFetcher.data.error || "Unable to start ghosting.");
    }
  }, [ghostFetcher.data, ghostFetcher.state]);

  useEffect(() => {
    if (pendingSave && saveFetcher.state === "idle" && saveFetcher.data?.ok === false) {
      setSubmitError(saveFetcher.data.error || "Unable to update the user.");
      setPendingSave(false);
    }
  }, [pendingSave, saveFetcher.data, saveFetcher.state]);

  useEffect(() => {
    setSubmitError(null);
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUser) {
      initializedUserIdRef.current = null;
      setSelectedRoleKeys([]);
      setDraftStatus("pending_access");
      setDraftDefaultPersonaKey("");
      setDraftLocalPersonId("");
      setDraftRpcPersonId("");
      return;
    }

    if (initializedUserIdRef.current === selectedUser.id) {
      return;
    }

    initializedUserIdRef.current = selectedUser.id;
    setSelectedRoleKeys(Array.isArray(selectedUser?.roleKeys) ? selectedUser.roleKeys : []);
    setDraftStatus(selectedUser?.status || "pending_access");
    setDraftDefaultPersonaKey(selectedUser?.defaultPersonaKey || "");
    setDraftLocalPersonId(selectedUser?.localPersonId || "");
    setDraftRpcPersonId(selectedUser?.rpcPersonId || "");
  }, [selectedUser]);

  useEffect(() => {
    if (personFetcher.state === "idle" && personFetcher.data?.ok) {
      setSubmitError(null);
      if (typeof personFetcher.data?.link?.localPersonId === "string") {
        setDraftLocalPersonId(personFetcher.data.link.localPersonId);
      }
      if (typeof personFetcher.data?.link?.rpcPersonId === "string") {
        setDraftRpcPersonId(personFetcher.data.link.rpcPersonId);
      }
      revalidator.revalidate();
    }
  }, [personFetcher.data, personFetcher.state, revalidator]);

  useEffect(() => {
    if (personFetcher.state === "idle" && personFetcher.data?.ok === false) {
      setSubmitError(personFetcher.data.error || "Unable to create the local person.");
    }
  }, [personFetcher.data, personFetcher.state]);

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
          Review pending access users, assign personas directly, assign permission roles, and maintain person links.
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
                <Th>Permissions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {roles.map((role) => (
                <Tr key={role.key}>
                  <Td>{role.label}</Td>
                  <Td>{Array.isArray(role.permissions) && role.permissions.length ? `${role.permissions.length} permissions` : "None"}</Td>
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
        <Box bg="white" borderRadius="lg" shadow="sm" p={4} mb={4}>
          <createFetcher.Form method="post" action="/admin/user-management">
            <input type="hidden" name="intent" value="create_user" />
            <VStack align="stretch" spacing={3}>
              <Text fontWeight="medium">Create CRM-only User</Text>
              <HStack align="flex-end" spacing={3}>
                <Box flex="1">
                  <Text fontSize="sm" color="gray.600" mb={1}>First name</Text>
                  <Input name="firstName" placeholder="Peter" />
                </Box>
                <Box flex="1">
                  <Text fontSize="sm" color="gray.600" mb={1}>Last name</Text>
                  <Input name="lastName" placeholder="Weyland" />
                </Box>
                <Box flex="1.4">
                  <Text fontSize="sm" color="gray.600" mb={1}>Email</Text>
                  <Input name="email" placeholder="peter.weyland@example.com" />
                </Box>
                <Button colorScheme="blue" type="submit" isLoading={createFetcher.state !== "idle"}>
                  Create User
                </Button>
              </HStack>
            </VStack>
          </createFetcher.Form>
        </Box>
        <TableContainer bg="white" borderRadius="lg" shadow="sm">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Persona</Th>
                <Th>Roles</Th>
                <Th>Local Person</Th>
                <Th>RPC Person</Th>
                <Th>Ghost</Th>
                <Th />
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
                  <Td>
                    <Badge colorScheme={getStatusColorScheme(user.status)} textTransform="none">
                      {user.status}
                    </Badge>
                  </Td>
                  <Td>{formatPersonaLabel(personas, user.defaultPersonaKey)}</Td>
                  <Td>{Array.isArray(user.roleKeys) && user.roleKeys.length ? user.roleKeys.join(", ") : "None"}</Td>
                  <Td>{user.localPersonId || "Missing"}</Td>
                  <Td>{user.rpcPersonId || "Not linked"}</Td>
                  <Td>
                    <ghostFetcher.Form method="post" action="/admin/user-management">
                      <input type="hidden" name="intent" value="start_ghost" />
                      <input type="hidden" name="effectiveUserId" value={user.id} />
                      <Button
                        size="sm"
                        variant="outline"
                        type="submit"
                        isLoading={ghostFetcher.state !== "idle" && ghostFetcher.formData?.get("effectiveUserId") === user.id}
                      >
                        Ghost
                      </Button>
                    </ghostFetcher.Form>
                  </Td>
                  <Td textAlign="right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedUserId(user.id)}>
                      Edit
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      <Drawer isOpen={Boolean(selectedUser)} onClose={() => setSelectedUserId(null)} placement="right" size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Edit User</DrawerHeader>
          {selectedUser ? (
            <saveFetcher.Form
              key={selectedUser.id}
              method="post"
              action="/admin/user-management"
              onSubmit={() => setPendingSave(true)}
            >
              <DrawerBody py={5}>
                <input type="hidden" name="intent" value="save_user_access" />
                <input type="hidden" name="userId" value={selectedUser.id} />
                <VStack align="stretch" spacing={5}>
                  <Box>
                    <Text fontWeight="semibold">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </Text>
                    <Text color="gray.500">{selectedUser.email}</Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      Status
                    </Text>
                    <Select name="status" value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>
                      <option value="pending_access">Pending Access</option>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </Select>
                    <Text mt={2} fontSize="sm" color="gray.500">
                      Set to Active to approve the user once role and local person link are in place.
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      Persona
                    </Text>
                    <Select name="defaultPersonaKey" value={draftDefaultPersonaKey} onChange={(event) => setDraftDefaultPersonaKey(event.target.value)}>
                      <option value="">No persona assigned</option>
                      {personas.map((persona) => (
                        <option key={persona.key} value={persona.key}>{persona.label}</option>
                      ))}
                    </Select>
                    <Text mt={2} fontSize="sm" color="gray.500">
                      Persona controls the shell experience. Roles control permissions.
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      Roles
                    </Text>
                    {selectedRoleKeys.map((roleKey) => (
                      <input key={roleKey} type="hidden" name="roleKeys" value={roleKey} />
                    ))}
                    <Menu closeOnSelect={false}>
                      <MenuButton
                        as={Button}
                        variant="outline"
                        width="100%"
                        justifyContent="space-between"
                        rightIcon={<ChevronDownIcon />}
                        fontWeight="normal"
                      >
                        {selectedRoleLabels.length
                          ? selectedRoleLabels.join(", ")
                          : roles.length
                            ? "Select roles"
                            : "No editable roles available"}
                      </MenuButton>
                      {roles.length ? (
                        <MenuList minW="100%">
                          <MenuOptionGroup
                            type="checkbox"
                            value={selectedRoleKeys}
                            onChange={(value) => setSelectedRoleKeys(Array.isArray(value) ? value : [])}
                          >
                            {roles.map((role) => (
                              <MenuItemOption key={role.key} value={role.key}>
                                <Text as="span" fontWeight="medium">{role.label}</Text>
                                <Text as="span" color="gray.500">{" · "}{role.key}</Text>
                              </MenuItemOption>
                            ))}
                          </MenuOptionGroup>
                        </MenuList>
                      ) : null}
                    </Menu>
                    {!roles.length ? (
                      <Text mt={2} fontSize="sm" color="gray.500">
                        No editable roles exist yet. Create one in{" "}
                        <Text as={Link} to="/admin/roles" color="blue.600" textDecoration="underline">
                          Admin Roles
                        </Text>
                        .
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                      Person Links
                    </Text>
                    <VStack align="stretch" spacing={3}>
                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={1}>Local Person Id</Text>
                        <Input
                          name="localPersonId"
                          value={draftLocalPersonId}
                          onChange={(event) => setDraftLocalPersonId(event.target.value)}
                          placeholder="person_123"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.600" mb={1}>RPC Person Id</Text>
                        <Input
                          name="rpcPersonId"
                          value={draftRpcPersonId}
                          onChange={(event) => setDraftRpcPersonId(event.target.value)}
                          placeholder="rpc_person_123"
                        />
                      </Box>
                      <Box>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            personFetcher.submit(
                              {
                                intent: "create_local_person",
                                userId: selectedUser.id
                              },
                              {
                                method: "post",
                                action: "/admin/user-management"
                              }
                            )
                          }
                          isLoading={personFetcher.state !== "idle"}
                        >
                          {draftLocalPersonId ? "Recreate / Relink Local Person" : "Create Local Person"}
                        </Button>
                      </Box>
                    </VStack>
                  </Box>

                  {submitError ? (
                    <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="md" p={3}>
                      <Text color="red.700">{submitError}</Text>
                    </Box>
                  ) : null}
                </VStack>
              </DrawerBody>
              <DrawerFooter borderTopWidth="1px">
                <HStack spacing={3}>
                  <Button variant="ghost" onClick={() => setSelectedUserId(null)}>
                    Cancel
                  </Button>
                  <Button colorScheme="blue" type="submit" isLoading={saveFetcher.state !== "idle"}>
                    Save
                  </Button>
                </HStack>
              </DrawerFooter>
            </saveFetcher.Form>
          ) : null}
        </DrawerContent>
      </Drawer>
    </VStack>
  );
}
