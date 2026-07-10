import React from "react";
import { Box, SimpleGrid } from "@chakra-ui/react";
import { AudienceListCard } from "../molecules/AudienceListCard";

/**
 * Scrollable gallery of selectable "email exclusion list" cards — a new
 * list type (discussed on the process-discovery call as dynamic exclusion
 * lists, e.g. "opted out of resume emails" or "emailed in the last 15
 * days") that a researcher can layer onto a send. Any number can be
 * selected — there's no cap, unlike the old "only 2 suppressions at once"
 * limitation.
 * @param {{
 *   lists: Array<{id: string, label: string, description: string, count: number}>,
 *   selectedListIds: string[],
 *   onSelectedListIdsChange: (ids: string[]) => void,
 *   maxHeight?: string
 * }} props
 */
export function ExclusionListPicker({ lists, selectedListIds, onSelectedListIdsChange, maxHeight = "420px" }) {
  function toggle(id) {
    if (selectedListIds.includes(id)) {
      onSelectedListIdsChange(selectedListIds.filter((entry) => entry !== id));
    } else {
      onSelectedListIdsChange([...selectedListIds, id]);
    }
  }

  return (
    <Box maxH={maxHeight} overflowY="auto" pr={1}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        {lists.map((list) => (
          <AudienceListCard
            key={list.id}
            label={list.label}
            description={list.description}
            count={list.count}
            countLabel="emails"
            isSelected={selectedListIds.includes(list.id)}
            onClick={() => toggle(list.id)}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}
