import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { TargetingFilterBuilder } from "./TargetingFilterBuilder";
import {
  COMPANY_SIZE_BANDS,
  DISCIPLINES,
  POSITION_LEVELS,
  US_REGIONS,
} from "../../../models/email-blast-mock-data.mjs";

export default {
  title: "Molecules/TargetingFilterBuilder",
  component: TargetingFilterBuilder
};

function Playground({ initialFilters }) {
  const [filters, setFilters] = useState(initialFilters);

  return (
    <Box maxW="720px">
      <TargetingFilterBuilder
        positionLevelOptions={POSITION_LEVELS}
        disciplineOptions={DISCIPLINES}
        regionOptions={US_REGIONS}
        companySizeOptions={COMPANY_SIZE_BANDS}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </Box>
  );
}

export function Empty() {
  return (
    <Playground
      initialFilters={{ positionLevels: [], disciplines: [], regions: [], companySizeBands: [] }}
    />
  );
}

export function NarrowedToJLLSize() {
  return (
    <Playground
      initialFilters={{
        positionLevels: ["c-suite"],
        disciplines: ["finance"],
        regions: ["northeast"],
        companySizeBands: ["under-500", "500-5000"],
      }}
    />
  );
}
