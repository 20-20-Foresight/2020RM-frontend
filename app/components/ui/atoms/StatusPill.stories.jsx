import React from "react";
import { HStack } from "@chakra-ui/react";
import { StatusPill } from "./StatusPill";

export default {
  title: "Atoms/StatusPill",
  component: StatusPill
};

export function Default() {
  return (
    <HStack spacing={2}>
      <StatusPill label="Draft" tone="neutral" />
      <StatusPill label="Pending Approval" tone="pending" />
      <StatusPill label="Approved" tone="info" />
      <StatusPill label="Scheduled" tone="info" />
      <StatusPill label="Sending" tone="pending" />
      <StatusPill label="Sent" tone="positive" />
      <StatusPill label="Failed" tone="critical" />
    </HStack>
  );
}
