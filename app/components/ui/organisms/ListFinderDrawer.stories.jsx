import React, { useState } from "react";
import { Button, Text } from "@chakra-ui/react";
import ListFinderDrawer from "./ListFinderDrawer";

const SAMPLE_LISTS = [
  {
    uuid: "list-1",
    name: "Data Center Targets",
    memberCount: 182,
    subjectType: "organization",
  },
  {
    uuid: "list-2",
    name: "Healthcare Operators",
    memberCount: 74,
    subjectType: "organization",
  },
  {
    uuid: "list-3",
    name: "Imported Accounts May 2026",
    memberCount: 31,
    subjectType: "mixed",
  },
];

export default {
  title: "Organisms/ListFinderDrawer",
  component: ListFinderDrawer,
};

export function Default() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedList, setSelectedList] = useState(SAMPLE_LISTS[0]);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Finder</Button>
      <Text mt={4} fontSize="sm">
        Selected: {selectedList?.name || "None"}
      </Text>
      <ListFinderDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={SAMPLE_LISTS}
        selectedItemId={selectedList?.uuid || ""}
        onSelectItem={(item) => setSelectedList(item)}
        createActionLabel="Upload CSV/XLSX as New List"
        onCreateAction={() => setIsOpen(false)}
        emptyStateMessage="No matching organization lists were found."
        getItemId={(item) => item.uuid}
        getItemLabel={(item) => item.name}
        getSearchText={(item) => `${item.name} ${item.uuid}`}
        renderItemMeta={(item, { isSelected }) => (
          <Text fontSize="xs" color={isSelected ? "whiteAlpha.800" : "gray.500"} noOfLines={1}>
            {Number(item.memberCount).toLocaleString()} organizations
          </Text>
        )}
      />
    </>
  );
}
