import React, { useState } from "react";
import { Box, HStack, IconButton, Input, Select, Text, VStack } from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp, FiScissors, FiTrash2 } from "react-icons/fi";
import { ChunkSplitPanel } from "../molecules/ChunkSplitPanel";

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayOptionLabel(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatHourOption(hour) {
  const period = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return { value: String(hour).padStart(2, "0"), label: `${twelveHour}:00 ${period}` };
}

function readScheduledParts(scheduledAt) {
  if (!scheduledAt) return { day: "", hour: "" };
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):/.exec(scheduledAt);
  return match ? { day: match[1], hour: match[2] } : { day: "", hour: "" };
}

/**
 * The "scheduling widget": starts with the request's whole audience as one
 * chunk. Each chunk can be split in two (by Position Level, State/Province,
 * Sector, Vertical, Keywords, Department — or into flat-size batches via
 * Total Numbers, which can produce more than two), reordered, and assigned
 * a day (from the currently viewed week) and hour.
 * @param {{
 *   chunks: Array<{id?: string, label: string, estimatedSize: number, order: number, scheduledAt: string|null}>,
 *   onChunksChange: (chunks: object[]) => void,
 *   weekDays: Date[],
 *   hourRange?: [number, number]
 * }} props
 */
export function SendChunkScheduler({ chunks, onChunksChange, weekDays, hourRange = [7, 19] }) {
  const [splitOpenIndex, setSplitOpenIndex] = useState(null);

  const [startHour, endHour] = hourRange;
  const hourOptions = Array.from({ length: endHour - startHour + 1 }, (_, index) => formatHourOption(startHour + index));

  function updateChunk(index, patch) {
    onChunksChange(chunks.map((chunk, i) => (i === index ? { ...chunk, ...patch } : chunk)));
  }

  function moveChunk(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= chunks.length) return;
    const next = [...chunks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChunksChange(next.map((chunk, i) => ({ ...chunk, order: i })));
  }

  function removeChunk(index) {
    onChunksChange(chunks.filter((_, i) => i !== index).map((chunk, i) => ({ ...chunk, order: i })));
  }

  function handleSplitChunk(index, newChunks) {
    const next = [...chunks.slice(0, index), ...newChunks, ...chunks.slice(index + 1)];
    onChunksChange(next.map((chunk, i) => ({ ...chunk, order: i })));
    setSplitOpenIndex(null);
  }

  function currentParts(chunk) {
    const fromScheduledAt = readScheduledParts(chunk.scheduledAt);
    return {
      day: chunk._day || fromScheduledAt.day,
      hour: chunk._hour || fromScheduledAt.hour,
    };
  }

  function handleDayChange(index, day) {
    const { hour } = currentParts(chunks[index]);
    updateChunk(index, {
      _day: day,
      scheduledAt: day && hour ? `${day}T${hour}:00:00-05:00` : chunks[index].scheduledAt,
    });
  }

  function handleTimeChange(index, hour) {
    const { day } = currentParts(chunks[index]);
    updateChunk(index, {
      _hour: hour,
      scheduledAt: day && hour ? `${day}T${hour}:00:00-05:00` : chunks[index].scheduledAt,
    });
  }

  return (
    <VStack align="stretch" spacing={4}>
      {chunks.length ? (
        <VStack align="stretch" spacing={2}>
          {chunks.map((chunk, index) => {
            const parts = currentParts(chunk);
            return (
              <Box key={chunk.id || index} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
                <HStack spacing={3}>
                  <VStack spacing={0}>
                    <IconButton
                      aria-label="Move up"
                      icon={<FiChevronUp />}
                      size="xs"
                      variant="ghost"
                      isDisabled={index === 0}
                      onClick={() => moveChunk(index, -1)}
                    />
                    <IconButton
                      aria-label="Move down"
                      icon={<FiChevronDown />}
                      size="xs"
                      variant="ghost"
                      isDisabled={index === chunks.length - 1}
                      onClick={() => moveChunk(index, 1)}
                    />
                  </VStack>
                  <Input
                    size="sm"
                    maxW="220px"
                    value={chunk.label}
                    onChange={(event) => updateChunk(index, { label: event.target.value })}
                  />
                  <Text fontSize="sm" color="gray.500" minW="120px" fontVariantNumeric="tabular-nums">
                    ~{chunk.estimatedSize.toLocaleString()} contacts
                  </Text>
                  <Select
                    size="sm"
                    maxW="160px"
                    placeholder="Day"
                    value={parts.day}
                    onChange={(event) => handleDayChange(index, event.target.value)}
                  >
                    {weekDays.map((day) => (
                      <option key={dateKey(day)} value={dateKey(day)}>
                        {formatDayOptionLabel(day)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    size="sm"
                    maxW="130px"
                    placeholder="Time"
                    value={parts.hour}
                    onChange={(event) => handleTimeChange(index, event.target.value)}
                  >
                    {hourOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <IconButton
                    aria-label="Split chunk"
                    icon={<FiScissors />}
                    size="sm"
                    variant="outline"
                    onClick={() => setSplitOpenIndex(splitOpenIndex === index ? null : index)}
                  />
                  <IconButton
                    aria-label="Remove chunk"
                    icon={<FiTrash2 />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    isDisabled={chunks.length === 1}
                    onClick={() => removeChunk(index)}
                  />
                </HStack>

                {splitOpenIndex === index ? (
                  <Box mt={3}>
                    <ChunkSplitPanel
                      chunk={chunk}
                      onSplit={(newChunks) => handleSplitChunk(index, newChunks)}
                      onCancel={() => setSplitOpenIndex(null)}
                    />
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </VStack>
      ) : (
        <Text fontSize="sm" color="gray.500">
          Nothing to schedule yet.
        </Text>
      )}
    </VStack>
  );
}
