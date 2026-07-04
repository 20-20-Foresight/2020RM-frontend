import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Input,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { Form, Link, useSearchParams } from "@remix-run/react";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function renderTypeLabel(row) {
  return row?.listTypeSlug || "—";
}

function renderSubTypeLabel(row) {
  return row?.listSubTypeSlug || "—";
}

export function ListsIndexPage({
  title,
  description,
  lists = [],
  error = null,
}) {
  const [searchParams] = useSearchParams();

  return (
    <Stack spacing={6}>
      <Box>
        <Heading size="lg">{title}</Heading>
        <Text color="gray.600" mt={2} maxW="3xl">
          {description}
        </Text>
      </Box>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={5}>
        <Form method="get">
          <Grid templateColumns={{ base: "1fr", md: "2fr 1fr 1fr 1fr auto" }} gap={4}>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>Search</FormLabel>
              <Input name="search" defaultValue={searchParams.get("search") || ""} placeholder="Search list names" />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>Type</FormLabel>
              <Input name="type" defaultValue={searchParams.get("type") || ""} placeholder="CAMPAIGNS" />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>Subtype</FormLabel>
              <Input name="subtype" defaultValue={searchParams.get("subtype") || ""} placeholder="Subtype" />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>Status</FormLabel>
              <Select name="status" defaultValue={searchParams.get("status") || ""}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="new">New</option>
              </Select>
            </FormControl>
            <Flex align="end">
              <Button type="submit" colorScheme="blue" w={{ base: "full", md: "auto" }}>
                Apply
              </Button>
            </Flex>
          </Grid>
        </Form>
      </Box>

      {error ? (
        <Alert status="error" borderRadius="xl">
          <AlertIcon />
          {error}
        </Alert>
      ) : null}

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" overflow="hidden">
        <Table>
          <Thead bg="gray.50">
            <Tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Subtype</Th>
              <Th>Status</Th>
              <Th>Owner</Th>
              <Th>Members</Th>
              <Th>Updated</Th>
            </Tr>
          </Thead>
          <Tbody>
            {lists.length ? (
              lists.map((list) => (
                <Tr key={list.uuid}>
                  <Td>
                    <Stack spacing={1}>
                      <Link to={`/lists/${encodeURIComponent(list.uuid)}`}>{list.name || list.uuid}</Link>
                      {list.subjectType ? (
                        <Text fontSize="sm" color="gray.500">
                          {list.subjectType}
                        </Text>
                      ) : null}
                    </Stack>
                  </Td>
                  <Td>{renderTypeLabel(list)}</Td>
                  <Td>{renderSubTypeLabel(list)}</Td>
                  <Td>
                    <Badge textTransform="none">{list.status || "—"}</Badge>
                  </Td>
                  <Td>{list.createdBy || "—"}</Td>
                  <Td>{Number(list.memberCount || 0).toLocaleString()}</Td>
                  <Td>{formatDate(list.modifiedDate || list.createdDate)}</Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={7}>
                  <Text color="gray.600" py={4}>No lists matched the current filters.</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Stack>
  );
}

export default ListsIndexPage;
