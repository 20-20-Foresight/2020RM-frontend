import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { ChunkSplitPanel } from "./ChunkSplitPanel";

export default {
  title: "Molecules/ChunkSplitPanel",
  component: ChunkSplitPanel
};

function Playground({ estimatedSize = 4343 }) {
  return (
    <Box maxW="640px">
      <ChunkSplitPanel
        chunk={{ label: "All Recipients", estimatedSize }}
        onSplit={(chunks) => window.alert(`Split into ${chunks.length} chunks:\n${chunks.map((c) => `${c.label} (${c.estimatedSize})`).join("\n")}`)}
        onCancel={() => window.alert("Cancelled")}
      />
      <Text fontSize="xs" color="gray.500" mt={2}>Try "Total Numbers" with a batch size of 500 against 4,343 contacts.</Text>
    </Box>
  );
}

export function Default() {
  return <Playground />;
}

export function SmallChunk() {
  return <Playground estimatedSize={40} />;
}
