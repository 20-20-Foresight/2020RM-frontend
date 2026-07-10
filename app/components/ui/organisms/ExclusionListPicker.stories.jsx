import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ExclusionListPicker } from "./ExclusionListPicker";
import { MOCK_EMAIL_EXCLUSION_LISTS } from "../../../models/email-blast-mock-data.mjs";

export default {
  title: "Organisms/ExclusionListPicker",
  component: ExclusionListPicker
};

function Playground({ initialSelected = [] }) {
  const [selectedListIds, setSelectedListIds] = useState(initialSelected);

  return (
    <Box maxW="700px">
      <ExclusionListPicker lists={MOCK_EMAIL_EXCLUSION_LISTS} selectedListIds={selectedListIds} onSelectedListIdsChange={setSelectedListIds} />
    </Box>
  );
}

export function NoneSelected() {
  return <Playground />;
}

export function SomeSelected() {
  return <Playground initialSelected={["excl-recent-15d", "excl-existing-clients"]} />;
}
