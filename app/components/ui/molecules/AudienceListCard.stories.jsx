import React, { useState } from "react";
import { SimpleGrid } from "@chakra-ui/react";
import { AudienceListCard } from "./AudienceListCard";

export default {
  title: "Molecules/AudienceListCard",
  component: AudienceListCard
};

export function Default() {
  const [selected, setSelected] = useState("a");

  return (
    <SimpleGrid columns={1} spacing={3} maxW="320px">
      <AudienceListCard
        label="CA · Real Estate · Executive Search"
        description="California candidates, Real Estate discipline, VP and above"
        count={1180}
        isSelected={selected === "a"}
        onClick={() => setSelected("a")}
      />
      <AudienceListCard
        label="National · Technology · C-Suite"
        description="All regions, Technology discipline, C-Suite only"
        count={310}
        isSelected={selected === "b"}
        onClick={() => setSelected("b")}
      />
      <AudienceListCard
        label="Build custom criteria"
        description="Target by position level, discipline, region, and company size"
        isSelected={selected === "custom"}
        onClick={() => setSelected("custom")}
      />
    </SimpleGrid>
  );
}
