import React from "react";
import {
  Box,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Radio,
  RadioGroup,
  Select,
  Text,
} from "@chakra-ui/react";

/**
 * Lets the requester pick between a pre-built ("canned") audience segment or
 * building fresh targeting criteria — the two paths that both resolve into
 * one query at time of request, per the Artemis targeting concept.
 * @param {{
 *   sourceType: "canned"|"query",
 *   onSourceTypeChange: (type: "canned"|"query") => void,
 *   cannedLists: Array<{id: string, label: string, summary: string, approxSize: number}>,
 *   selectedCannedListId: string,
 *   onSelectedCannedListChange: (id: string) => void
 * }} props
 */
export function AudienceSourcePicker({
  sourceType,
  onSourceTypeChange,
  cannedLists,
  selectedCannedListId,
  onSelectedCannedListChange,
}) {
  const selectedCannedList = cannedLists.find((list) => list.id === selectedCannedListId) || null;

  return (
    <Box>
      <FormControl>
        <FormLabel fontSize="sm">Audience source</FormLabel>
        <RadioGroup value={sourceType} onChange={onSourceTypeChange}>
          <HStack spacing={6}>
            <Radio value="canned">Use a canned list</Radio>
            <Radio value="query">Build new criteria</Radio>
          </HStack>
        </RadioGroup>
        <FormHelperText>
          Either path resolves to one query, run once, at the moment this request is submitted.
        </FormHelperText>
      </FormControl>

      {sourceType === "canned" ? (
        <FormControl mt={4}>
          <FormLabel fontSize="sm">Canned list</FormLabel>
          <Select
            placeholder="Select a saved segment"
            value={selectedCannedListId}
            onChange={(event) => onSelectedCannedListChange(event.target.value)}
          >
            {cannedLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.label}
              </option>
            ))}
          </Select>
          {selectedCannedList ? (
            <FormHelperText>
              {selectedCannedList.summary} · ~{selectedCannedList.approxSize.toLocaleString()} people
            </FormHelperText>
          ) : null}
        </FormControl>
      ) : (
        <Text mt={4} fontSize="sm" color="gray.500">
          Set targeting filters below to build this segment from scratch.
        </Text>
      )}
    </Box>
  );
}
