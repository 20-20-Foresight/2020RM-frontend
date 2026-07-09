import React from "react";
import { SendQueueTable } from "./SendQueueTable";
import { MOCK_SEND_QUEUE_BATCHES } from "../../../models/email-blast-mock-data.mjs";

export default {
  title: "Organisms/SendQueueTable",
  component: SendQueueTable
};

export function Default() {
  return <SendQueueTable batches={MOCK_SEND_QUEUE_BATCHES} />;
}
