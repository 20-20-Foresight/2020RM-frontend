import React from "react";
import { Box } from "@chakra-ui/react";
import { WeekCalendarGrid } from "./WeekCalendarGrid";
import { CHUNK_STATUS_COLORS } from "../../../models/email-blast-mock-data.mjs";

export default {
  title: "Organisms/WeekCalendarGrid",
  component: WeekCalendarGrid
};

// Sunday of the week containing the project's reference "today" (2026-07-08).
const WEEK_START = new Date(2026, 6, 5);
const TODAY = new Date(2026, 6, 8);

export function Populated() {
  return (
    <Box maxW="1000px" h="640px">
      <WeekCalendarGrid
        weekStart={WEEK_START}
        today={TODAY}
        events={[
          { id: "1", dayIndex: 4, startMinutes: 9 * 60, label: "VP", sublabel: "~780 people", color: CHUNK_STATUS_COLORS.scheduled },
          { id: "2", dayIndex: 4, startMinutes: 10 * 60 + 30, label: "SVP / EVP", sublabel: "~640 people", color: CHUNK_STATUS_COLORS.scheduled },
          { id: "3", dayIndex: 6, startMinutes: 9 * 60, label: "Batch 1", sublabel: "~470 people", color: CHUNK_STATUS_COLORS.scheduled },
          { id: "4", dayIndex: 3, startMinutes: 8 * 60, label: "National C-Suite 1/2", sublabel: "~160 people", color: CHUNK_STATUS_COLORS.queued },
          { id: "5", dayIndex: 3, startMinutes: 11 * 60, label: "National C-Suite 2/2", sublabel: "~150 people", color: CHUNK_STATUS_COLORS.processing },
          { id: "6", dayIndex: 1, startMinutes: 9 * 60, label: "CMO Blast", sublabel: "~205 people", color: CHUNK_STATUS_COLORS.completed },
        ]}
      />
    </Box>
  );
}

export function Empty() {
  return (
    <Box maxW="1000px" h="640px">
      <WeekCalendarGrid weekStart={WEEK_START} today={TODAY} events={[]} />
    </Box>
  );
}
