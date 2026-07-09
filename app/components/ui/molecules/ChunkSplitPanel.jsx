import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { CHUNK_SPLIT_TYPES, splitChunkByCount, splitChunkByValues } from "../../../models/email-blast-mock-data.mjs";

const TOTAL_NUMBERS_KEY = "total-numbers";

/**
 * The split interface that opens under a chunk when its "Split" button is
 * clicked: choose a dimension (Position Level, State/Province, Sector,
 * Vertical, Keywords, Department) and pick which values go in the first new
 * chunk — everything else becomes the second — or choose Total Numbers and
 * set a flat batch size, which can produce more than two chunks.
 * @param {{
 *   chunk: {label: string, estimatedSize: number},
 *   onSplit: (newChunks: object[]) => void,
 *   onCancel: () => void
 * }} props
 */
export function ChunkSplitPanel({ chunk, onSplit, onCancel }) {
  const [splitTypeKey, setSplitTypeKey] = useState(CHUNK_SPLIT_TYPES[0].key);
  const [selectedValues, setSelectedValues] = useState([]);
  const [batchSize, setBatchSize] = useState(Math.max(1, Math.min(500, chunk.estimatedSize - 1)));

  useEffect(() => {
    setSelectedValues([]);
  }, [splitTypeKey]);

  const isTotalNumbers = splitTypeKey === TOTAL_NUMBERS_KEY;
  const activeType = CHUNK_SPLIT_TYPES.find((entry) => entry.key === splitTypeKey);
  const options = activeType?.options || [];

  function toggleValue(valueKey) {
    setSelectedValues((current) =>
      current.includes(valueKey) ? current.filter((entry) => entry !== valueKey) : [...current, valueKey]
    );
  }

  const canSplit = isTotalNumbers
    ? batchSize > 0 && batchSize < chunk.estimatedSize
    : selectedValues.length > 0 && selectedValues.length < options.length;

  function handleSplit() {
    if (!canSplit) return;
    if (isTotalNumbers) {
      onSplit(splitChunkByCount(chunk, batchSize));
    } else {
      onSplit(splitChunkByValues(chunk, splitTypeKey, selectedValues));
    }
  }

  return (
    <VStack align="stretch" spacing={3} bg="gray.50" borderRadius="md" p={3}>
      <FormControl maxW="260px">
        <FormLabel fontSize="xs" mb={1}>Split by</FormLabel>
        <Select size="sm" value={splitTypeKey} onChange={(event) => setSplitTypeKey(event.target.value)}>
          {CHUNK_SPLIT_TYPES.map((type) => (
            <option key={type.key} value={type.key}>{type.label}</option>
          ))}
        </Select>
      </FormControl>

      {isTotalNumbers ? (
        <FormControl maxW="220px">
          <FormLabel fontSize="xs" mb={1}>Chunk size</FormLabel>
          <NumberInput
            size="sm"
            value={batchSize}
            min={1}
            max={Math.max(1, chunk.estimatedSize - 1)}
            onChange={(_, value) => setBatchSize(Number.isNaN(value) ? 1 : value)}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText>
            Splits ~{chunk.estimatedSize.toLocaleString()} contacts into chunks of this size (the last one smaller,
            if it doesn't divide evenly).
          </FormHelperText>
        </FormControl>
      ) : (
        <FormControl>
          <FormLabel fontSize="xs" mb={1}>
            Select which values go in the first new chunk — everything else becomes the second.
          </FormLabel>
          <Wrap spacing={3}>
            {options.map((option) => (
              <WrapItem key={option.key}>
                <Checkbox size="sm" isChecked={selectedValues.includes(option.key)} onChange={() => toggleValue(option.key)}>
                  {option.label}
                </Checkbox>
              </WrapItem>
            ))}
          </Wrap>
        </FormControl>
      )}

      <HStack>
        <Button size="sm" colorScheme="blue" onClick={handleSplit} isDisabled={!canSplit}>
          Split chunk
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </HStack>
    </VStack>
  );
}
