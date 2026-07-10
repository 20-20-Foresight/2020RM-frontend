import React from "react";
import {
  Box,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { estimateAudienceSize } from "../../../models/email-blast-mock-data.mjs";

/**
 * Targeting filter builder for a new (non-canned) audience query: position
 * level, discipline, region, and company size — the dimensions called out in
 * the process-discovery call as what narrows a segment down to the right
 * few people, not the whole company. Shows a live, mock-estimated audience
 * size so narrowing filters feels responsive with no backend yet.
 * @param {{
 *   positionLevelOptions: Array<{key: string, label: string}>,
 *   disciplineOptions: Array<{key: string, label: string}>,
 *   regionOptions: Array<{key: string, label: string}>,
 *   companySizeOptions: Array<{key: string, label: string}>,
 *   filters: {positionLevels: string[], disciplines: string[], regions: string[], companySizeBands: string[]},
 *   onFiltersChange: (filters: object) => void
 * }} props
 */
export function TargetingFilterBuilder({
  positionLevelOptions,
  disciplineOptions,
  regionOptions,
  companySizeOptions,
  filters,
  onFiltersChange,
}) {
  const estimatedSize = estimateAudienceSize(filters);

  function updateDimension(dimensionKey, values) {
    onFiltersChange({ ...filters, [dimensionKey]: values });
  }

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
        <FormControl>
          <FormLabel fontSize="sm">Position level</FormLabel>
          <CheckboxGroup
            value={filters.positionLevels}
            onChange={(values) => updateDimension("positionLevels", values)}
          >
            <Stack spacing={1.5}>
              {positionLevelOptions.map((option) => (
                <Checkbox key={option.key} value={option.key}>
                  {option.label}
                </Checkbox>
              ))}
            </Stack>
          </CheckboxGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Discipline</FormLabel>
          <CheckboxGroup
            value={filters.disciplines}
            onChange={(values) => updateDimension("disciplines", values)}
          >
            <Stack spacing={1.5}>
              {disciplineOptions.map((option) => (
                <Checkbox key={option.key} value={option.key}>
                  {option.label}
                </Checkbox>
              ))}
            </Stack>
          </CheckboxGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Region</FormLabel>
          <CheckboxGroup
            value={filters.regions}
            onChange={(values) => updateDimension("regions", values)}
          >
            <Stack spacing={1.5}>
              {regionOptions.map((option) => (
                <Checkbox key={option.key} value={option.key}>
                  {option.label}
                </Checkbox>
              ))}
            </Stack>
          </CheckboxGroup>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Company size</FormLabel>
          <CheckboxGroup
            value={filters.companySizeBands}
            onChange={(values) => updateDimension("companySizeBands", values)}
          >
            <Stack spacing={1.5}>
              {companySizeOptions.map((option) => (
                <Checkbox key={option.key} value={option.key}>
                  {option.label}
                </Checkbox>
              ))}
            </Stack>
          </CheckboxGroup>
        </FormControl>
      </SimpleGrid>

      <HStack mt={5} p={3} bg="gray.50" borderRadius="md" justify="space-between">
        <Text fontSize="sm" color="gray.600">Estimated audience size</Text>
        <Text fontSize="lg" fontWeight="bold" color="gray.800" fontVariantNumeric="tabular-nums">
          {estimatedSize.toLocaleString()}
        </Text>
      </HStack>
    </Box>
  );
}
