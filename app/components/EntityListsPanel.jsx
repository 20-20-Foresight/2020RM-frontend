import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Link,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { Link as RemixLink } from "@remix-run/react";

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

export function EntityListsPanel({ rows = [], emptyLabel, error = null }) {
  return (
    <Stack spacing={6}>
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
              <Th>List</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Membership</Th>
              <Th>Added</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.length ? (
              rows.map((row) => (
                <Tr key={`${row.list?.uuid || "list"}-${row.membership?.uuid || "membership"}`}>
                  <Td>
                    <Stack spacing={1}>
                      <Link as={RemixLink} to={`/lists/${encodeURIComponent(row.list?.uuid || "")}`}>
                        {row.list?.name || row.list?.uuid || "Unnamed list"}
                      </Link>
                      <Text fontSize="sm" color="gray.500">
                        {row.list?.listSubTypeSlug || row.list?.subjectType || "—"}
                      </Text>
                    </Stack>
                  </Td>
                  <Td>{row.list?.listTypeSlug || "—"}</Td>
                  <Td>
                    <Badge textTransform="none">{row.list?.status || "—"}</Badge>
                  </Td>
                  <Td>
                    <Badge textTransform="none">{row.membership?.itemStatus || "—"}</Badge>
                  </Td>
                  <Td>{formatDate(row.membership?.addedAt || row.list?.createdDate)}</Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={5}>
                  <Text color="gray.600" py={4}>{emptyLabel}</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Stack>
  );
}

export default EntityListsPanel;
