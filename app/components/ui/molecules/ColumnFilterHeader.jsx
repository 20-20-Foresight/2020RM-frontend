import React from "react";
import {
  HStack,
  IconButton,
  Input,
  Select,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  VStack,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";

export function ColumnFilterHeader({
  columnKey,
  label,
  isOpen,
  activeValue,
  draftValue = "",
  onToggle,
  onDraftChange,
  onApply,
  onClear,
  selectOptions = null,
  disabled = false,
  autoFocus = false,
}) {
  return (
    <VStack align="stretch" spacing={2}>
      <HStack spacing={2} align="center">
        <Text>{label}</Text>
        {disabled || activeValue ? null : (
          <IconButton
            aria-label={`Search ${columnKey}`}
            icon={<SearchIcon />}
            size="xs"
            type="button"
            variant={isOpen ? "solid" : "ghost"}
            colorScheme={isOpen ? "blue" : "gray"}
            onClick={onToggle}
          />
        )}
      </HStack>
      {activeValue ? (
        <Tag size="sm" colorScheme="blue" alignSelf="flex-start" maxW="100%">
          <TagLabel overflow="hidden" textOverflow="ellipsis">
            {activeValue}
          </TagLabel>
          <TagCloseButton onClick={onClear} />
        </Tag>
      ) : isOpen ? (
        Array.isArray(selectOptions) ? (
          <Select
            size="xs"
            value={draftValue}
            onChange={(event) => {
              onDraftChange(event.target.value);
              onApply(event.target.value);
            }}
            bg="white"
          >
            <option value="">All</option>
            {selectOptions.map((option) => (
              <option key={`${columnKey}-${option}`} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            size="xs"
            value={draftValue}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={onApply}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onApply();
              }
            }}
            bg="white"
            autoFocus={autoFocus}
          />
        )
      ) : null}
    </VStack>
  );
}

export default ColumnFilterHeader;
