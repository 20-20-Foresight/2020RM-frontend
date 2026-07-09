import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ChunkRecipientsTable } from "./ChunkRecipientsTable";

export default {
  title: "Organisms/ChunkRecipientsTable",
  component: ChunkRecipientsTable
};

function Playground({ chunk }) {
  const [excludedPeople, setExcludedPeople] = useState([]);

  return (
    <Box maxW="960px">
      <ChunkRecipientsTable chunk={chunk} excludedPeople={excludedPeople} onExcludedPeopleChange={setExcludedPeople} />
    </Box>
  );
}

export function Scheduled() {
  return <Playground chunk={{ id: "story-scheduled", estimatedSize: 40, status: "scheduled" }} />;
}

export function Queued() {
  return <Playground chunk={{ id: "story-queued", estimatedSize: 40, status: "queued" }} />;
}

export function Completed() {
  return <Playground chunk={{ id: "story-completed", estimatedSize: 40, status: "completed" }} />;
}
