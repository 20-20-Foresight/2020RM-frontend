import React, { useState } from "react";
import { Button, HStack, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { StatusPill } from "../atoms/StatusPill";
import { getChunkPeoplePage, derivePersonSendStatus } from "../../../models/email-blast-mock-data.mjs";

const PAGE_SIZE = 25;

const SEND_STATUS_TONES = {
  "Not sent yet": "neutral",
  Queued: "pending",
  Sending: "info",
  Delivered: "positive",
  Opened: "positive",
  Clicked: "positive",
  Bounced: "critical",
};

/**
 * Recipient list for one send chunk — paginated people, each showing a
 * derived send status (from the chunk's own lifecycle status) and an
 * Exclude toggle that adds/removes that specific person from the request's
 * excludedPeople list, independent of the wildcard-based "always exclude".
 * @param {{
 *   chunk: {id: string, estimatedSize: number, status: string},
 *   excludedPeople: Array<{id: string, name: string, email: string}>,
 *   onExcludedPeopleChange: (people: Array<{id: string, name: string, email: string}>) => void
 * }} props
 */
export function ChunkRecipientsTable({ chunk, excludedPeople, onExcludedPeopleChange }) {
  const [page, setPage] = useState(0);
  const pageData = getChunkPeoplePage(chunk, page, PAGE_SIZE);
  const excludedIds = new Set(excludedPeople.map((person) => person.id));

  function toggleExcluded(person) {
    if (excludedIds.has(person.id)) {
      onExcludedPeopleChange(excludedPeople.filter((entry) => entry.id !== person.id));
    } else {
      onExcludedPeopleChange([...excludedPeople, { id: person.id, name: person.name, email: person.email }]);
    }
  }

  return (
    <>
      <HStack justify="space-between" mb={3}>
        <Text fontSize="sm" color="gray.600">
          Showing {pageData.people.length ? pageData.page * pageData.pageSize + 1 : 0}
          –{pageData.page * pageData.pageSize + pageData.people.length} of {pageData.total.toLocaleString()}
        </Text>
        <HStack>
          <Button size="sm" variant="outline" onClick={() => setPage((current) => Math.max(0, current - 1))} isDisabled={pageData.page === 0}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => Math.min(pageData.totalPages - 1, current + 1))}
            isDisabled={pageData.page >= pageData.totalPages - 1}
          >
            Next
          </Button>
        </HStack>
      </HStack>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Title</Th>
            <Th>Company</Th>
            <Th>Email</Th>
            <Th>Send status</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {pageData.people.map((person, index) => {
            const isExcluded = excludedIds.has(person.id);
            const sendStatus = derivePersonSendStatus(chunk.status, page * PAGE_SIZE + index);
            return (
              <Tr key={person.id} opacity={isExcluded ? 0.5 : 1}>
                <Td fontSize="sm" textDecoration={isExcluded ? "line-through" : "none"}>{person.name}</Td>
                <Td fontSize="sm" color="gray.600">{person.title}</Td>
                <Td fontSize="sm" color="gray.600">{person.company}</Td>
                <Td fontSize="xs" color="gray.500">{person.email}</Td>
                <Td>
                  <StatusPill label={isExcluded ? "Excluded" : sendStatus} tone={isExcluded ? "critical" : SEND_STATUS_TONES[sendStatus]} />
                </Td>
                <Td>
                  <Button size="xs" variant="ghost" colorScheme={isExcluded ? "gray" : "red"} onClick={() => toggleExcluded(person)}>
                    {isExcluded ? "Include" : "Exclude"}
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </>
  );
}
