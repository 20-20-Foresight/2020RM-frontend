import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { SendChunkScheduler } from "./SendChunkScheduler";

export default {
  title: "Organisms/SendChunkScheduler",
  component: SendChunkScheduler
};

const WEEK_DAYS = Array.from({ length: 7 }, (_, i) => new Date(2026, 6, 5 + i));

function Playground({ initialChunks }) {
  const [chunks, setChunks] = useState(initialChunks);

  return (
    <Box maxW="1000px">
      <SendChunkScheduler chunks={chunks} onChunksChange={setChunks} weekDays={WEEK_DAYS} />
    </Box>
  );
}

export function SingleWholeAudienceChunk() {
  return (
    <Playground
      initialChunks={[{ label: "All Recipients", estimatedSize: 4343, order: 0, status: "scheduled", scheduledAt: null }]}
    />
  );
}

export function AlreadySplitAndScheduled() {
  return (
    <Playground
      initialChunks={[
        {
          id: "c1",
          label: "All Recipients — Position Level: C-Suite",
          estimatedSize: 470,
          order: 0,
          status: "scheduled",
          scheduledAt: "2026-07-09T09:00:00-05:00",
        },
        {
          id: "c2",
          label: "All Recipients — Position Level: Everything else",
          estimatedSize: 470,
          order: 1,
          status: "scheduled",
          scheduledAt: "2026-07-09T09:30:00-05:00",
        },
      ]}
    />
  );
}
