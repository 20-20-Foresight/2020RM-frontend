import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { RecipientPicker } from "./RecipientPicker";
import {
  CANNED_AUDIENCE_LISTS,
  COMPANY_SIZE_BANDS,
  DISCIPLINES,
  POSITION_LEVELS,
  US_REGIONS,
} from "../../../models/email-blast-mock-data.mjs";

export default {
  title: "Organisms/RecipientPicker",
  component: RecipientPicker
};

function Playground({
  initialListId,
  initialFilters = { positionLevels: [], disciplines: [], regions: [], companySizeBands: [] },
}) {
  const [selectedListId, setSelectedListId] = useState(initialListId);
  const [customFilters, setCustomFilters] = useState(initialFilters);

  return (
    <Box maxW="960px">
      <RecipientPicker
        cannedLists={CANNED_AUDIENCE_LISTS}
        selectedListId={selectedListId}
        onSelectListId={setSelectedListId}
        positionLevelOptions={POSITION_LEVELS}
        disciplineOptions={DISCIPLINES}
        regionOptions={US_REGIONS}
        companySizeOptions={COMPANY_SIZE_BANDS}
        customFilters={customFilters}
        onCustomFiltersChange={setCustomFilters}
      />
    </Box>
  );
}

export function CannedListSelected() {
  return <Playground initialListId={CANNED_AUDIENCE_LISTS[0].id} />;
}

export function CustomCriteriaNoFiltersYet() {
  return <Playground initialListId="custom" />;
}

export function CustomCriteriaWithFilters() {
  return (
    <Playground
      initialListId="custom"
      initialFilters={{ positionLevels: ["c-suite"], disciplines: ["finance"], regions: [], companySizeBands: [] }}
    />
  );
}

export function NothingSelected() {
  return <Playground initialListId="" />;
}
