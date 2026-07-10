import React, { useState } from "react";
import { Box, Text, VStack } from "@chakra-ui/react";
import { MonthCalendar } from "./MonthCalendar";

export default {
  title: "Molecules/MonthCalendar",
  component: MonthCalendar,
};

export function Default() {
  return (
    <Box maxW="280px" bg="white" p={5} borderRadius="xl" borderWidth="1px" borderColor="gray.200">
      <MonthCalendar
        year={2026}
        month={3}
        today={new Date(2026, 3, 30)}
        eventDays={[7, 10, 14, 16, 21, 28, 30]}
      />
    </Box>
  );
}

export function MidMonth() {
  return (
    <Box maxW="280px" bg="white" p={5} borderRadius="xl" borderWidth="1px" borderColor="gray.200">
      <MonthCalendar
        year={2026}
        month={4}
        today={new Date(2026, 4, 14)}
        eventDays={[5, 14, 19, 22]}
      />
    </Box>
  );
}

export function NoEvents() {
  return (
    <Box maxW="280px" bg="white" p={5} borderRadius="xl" borderWidth="1px" borderColor="gray.200">
      <MonthCalendar year={2026} month={3} today={new Date(2026, 3, 30)} />
    </Box>
  );
}

export function Clickable() {
  const [pickedDay, setPickedDay] = useState(null);

  return (
    <VStack align="stretch" spacing={3} maxW="280px">
      <Box bg="white" p={5} borderRadius="xl" borderWidth="1px" borderColor="gray.200">
        <MonthCalendar
          year={2026}
          month={3}
          today={new Date(2026, 3, 30)}
          eventDays={[7, 10, 14]}
          onDayClick={setPickedDay}
        />
      </Box>
      <Text fontSize="sm" color="gray.600">
        {pickedDay ? `Picked day ${pickedDay}` : "Click a day"}
      </Text>
    </VStack>
  );
}
