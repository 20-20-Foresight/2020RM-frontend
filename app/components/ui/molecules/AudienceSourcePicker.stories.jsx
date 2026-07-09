import React, { useState } from "react";
import { VStack } from "@chakra-ui/react";
import { AudienceSourcePicker } from "./AudienceSourcePicker";
import { CANNED_AUDIENCE_LISTS } from "../../../models/email-blast-mock-data.mjs";

export default {
  title: "Molecules/AudienceSourcePicker",
  component: AudienceSourcePicker
};

function Playground({ initialSourceType = "canned" }) {
  const [sourceType, setSourceType] = useState(initialSourceType);
  const [selectedCannedListId, setSelectedCannedListId] = useState(CANNED_AUDIENCE_LISTS[0].id);

  return (
    <VStack align="stretch" spacing={4} maxW="480px">
      <AudienceSourcePicker
        sourceType={sourceType}
        onSourceTypeChange={setSourceType}
        cannedLists={CANNED_AUDIENCE_LISTS}
        selectedCannedListId={selectedCannedListId}
        onSelectedCannedListChange={setSelectedCannedListId}
      />
    </VStack>
  );
}

export function CannedSelected() {
  return <Playground initialSourceType="canned" />;
}

export function BuildNewQuery() {
  return <Playground initialSourceType="query" />;
}
