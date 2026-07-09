import React from "react";
import { Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { StatusPill, SEND_QUEUE_STATUS_TONES } from "../atoms/StatusPill";

function formatSubmittedAt(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Batch send queue, modeled on the real Apex Jobs screen from the process
 * walkthrough (Queued / Processing / Completed, per-batch record counts).
 * @param {{
 *   batches: Array<{id: string, requestId: string, status: string, recordCount: number, submittedAt: string}>,
 *   getRequestLabel?: (requestId: string) => string
 * }} props
 */
export function SendQueueTable({ batches, getRequestLabel }) {
  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Batch</Th>
          <Th>Request</Th>
          <Th>Status</Th>
          <Th isNumeric>Records</Th>
          <Th>Submitted</Th>
        </Tr>
      </Thead>
      <Tbody>
        {batches.map((batch) => (
          <Tr key={batch.id}>
            <Td fontFamily="mono" fontSize="xs">{batch.id}</Td>
            <Td fontSize="sm">{getRequestLabel ? getRequestLabel(batch.requestId) : batch.requestId}</Td>
            <Td>
              <StatusPill
                label={batch.status}
                tone={SEND_QUEUE_STATUS_TONES[batch.status] || "neutral"}
              />
            </Td>
            <Td isNumeric fontVariantNumeric="tabular-nums">{batch.recordCount.toLocaleString()}</Td>
            <Td>
              <Text fontSize="xs" color="gray.500">{formatSubmittedAt(batch.submittedAt)}</Text>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
