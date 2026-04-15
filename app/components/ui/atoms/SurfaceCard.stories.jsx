import React from "react";
import { VStack, Text } from "@chakra-ui/react";
import { SurfaceCard } from "./SurfaceCard";

export default {
  title: "Atoms/SurfaceCard",
  component: SurfaceCard
};

export function Default() {
  return (
    <VStack align="stretch" spacing={4}>
      <SurfaceCard>
        <Text>Default card surface</Text>
      </SurfaceCard>
      <SurfaceCard tone="editing">
        <Text>Editing surface</Text>
      </SurfaceCard>
      <SurfaceCard tone="saving">
        <Text>Saving surface</Text>
      </SurfaceCard>
      <SurfaceCard tone="saved">
        <Text>Saved surface</Text>
      </SurfaceCard>
    </VStack>
  );
}
