import React from "react";
import { Badge, Box, Checkbox, HStack, Text } from "@chakra-ui/react";

const PRIORITY_CONFIG = {
  high:   { color: "red",    label: "High" },
  medium: { color: "orange", label: "Med"  },
  low:    { color: "gray",   label: "Low"  },
};

const CHECKBOX_SX = {
  ".chakra-checkbox__control": {
    width: "22px",
    height: "22px",
    borderRadius: "5px",
    borderWidth: "2px",
    borderColor: "gray.400",
    bg: "white",
  },
};

/**
 * One row in a task list. Checking the checkbox marks it complete.
 * @param {{
 *   task: {
 *     id: string,
 *     title: string,
 *     priority: "high"|"medium"|"low",
 *     dueDate: string,
 *     done: boolean
 *   },
 *   onToggle: (id: string) => void,
 *   todayDate?: Date
 * }} props
 */
export function TaskItem({ task, onToggle, todayDate = new Date() }) {
  const cfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
  const dueMs = new Date(task.dueDate + "T00:00:00").getTime();
  const isOverdue = !task.done && dueMs < todayDate.getTime();
  const dueFmt = new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <HStack
      spacing={3}
      py={2.5}
      px={3}
      borderRadius="lg"
      bg={task.done ? "gray.100" : "gray.50"}
      borderWidth="1px"
      borderColor={task.done ? "gray.200" : "gray.200"}
      opacity={task.done ? 0.55 : 1}
      transition="opacity 0.15s"
    >
      <Checkbox
        size="lg"
        isChecked={task.done}
        onChange={() => onToggle(task.id)}
        colorScheme="green"
        flexShrink={0}
        sx={CHECKBOX_SX}
      />
      <Box flex={1} minW={0}>
        <Text
          fontSize="sm"
          color={task.done ? "gray.500" : "gray.800"}
          textDecoration={task.done ? "line-through" : "none"}
          noOfLines={1}
        >
          {task.title}
        </Text>
        <HStack spacing={2} mt={0.5}>
          <Badge colorScheme={cfg.color} fontSize="2xs" borderRadius="full" px={1.5} variant="subtle">
            {cfg.label}
          </Badge>
          <Text fontSize="xs" color={isOverdue ? "red.500" : "gray.400"}>
            {isOverdue ? "Overdue: " : "Due: "}{dueFmt}
          </Text>
        </HStack>
      </Box>
    </HStack>
  );
}
