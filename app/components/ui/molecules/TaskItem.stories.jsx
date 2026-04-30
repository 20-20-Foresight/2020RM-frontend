import React, { useState } from "react";
import { VStack } from "@chakra-ui/react";
import { TaskItem } from "./TaskItem";

export default {
  title: "Molecules/TaskItem",
  component: TaskItem,
};

const TODAY = new Date(2026, 3, 30);

function Controlled({ initial }) {
  const [task, setTask] = useState(initial);
  return (
    <TaskItem
      task={task}
      onToggle={() => setTask((t) => ({ ...t, done: !t.done }))}
      todayDate={TODAY}
    />
  );
}

export function Priorities() {
  return (
    <VStack align="stretch" spacing={2} maxW="480px">
      <Controlled initial={{ id: "1", title: "Review CFO candidate presentations", priority: "high",   dueDate: "2026-04-30", done: false }} />
      <Controlled initial={{ id: "2", title: "Draft follow-up note to Meridian contact",  priority: "medium", dueDate: "2026-05-02", done: false }} />
      <Controlled initial={{ id: "3", title: "Prepare Q2 pipeline summary",               priority: "low",    dueDate: "2026-05-07", done: false }} />
    </VStack>
  );
}

export function Overdue() {
  return (
    <VStack align="stretch" spacing={2} maxW="480px">
      <Controlled initial={{ id: "4", title: "Overdue high-priority task", priority: "high", dueDate: "2026-04-28", done: false }} />
    </VStack>
  );
}

export function Done() {
  return (
    <VStack align="stretch" spacing={2} maxW="480px">
      <Controlled initial={{ id: "5", title: "Complete skills checklist for CMO search", priority: "medium", dueDate: "2026-04-29", done: true }} />
    </VStack>
  );
}
