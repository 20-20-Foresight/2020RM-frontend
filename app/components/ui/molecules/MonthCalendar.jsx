import React from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";

const BRAND_RED = "#D72638";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildCalendarWeeks(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Single-month calendar grid. Highlights today and optionally marks days with events.
 * @param {{
 *   year: number,
 *   month: number,
 *   today?: Date,
 *   eventDays?: number[],
 *   onDayClick?: (day: number) => void
 * }} props
 */
export function MonthCalendar({ year, month, today = new Date(), eventDays = [], onDayClick }) {
  const weeks = buildCalendarWeeks(year, month);
  const eventSet = new Set(eventDays);

  return (
    <Box>
      <Text fontWeight="bold" fontSize="sm" color="gray.700" mb={3}>
        {MONTH_NAMES[month]} {year}
      </Text>

      <Grid templateColumns="repeat(7, 1fr)" mb={1}>
        {DAY_LABELS.map((d) => (
          <Box key={d} textAlign="center">
            <Text fontSize="xs" color="gray.400" fontWeight="semibold">{d}</Text>
          </Box>
        ))}
      </Grid>

      {weeks.map((week, wi) => (
        <Grid key={wi} templateColumns="repeat(7, 1fr)" mb={0.5}>
          {week.map((day, di) => {
            const isToday =
              day !== null &&
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            const hasEvent = day !== null && eventSet.has(day) && !isToday;

            return (
              <Box key={di} textAlign="center" py={0.5}>
                {day !== null ? (
                  <Flex direction="column" align="center">
                    <Flex
                      h={7}
                      w={7}
                      mx="auto"
                      borderRadius="full"
                      align="center"
                      justify="center"
                      bg={isToday ? BRAND_RED : "transparent"}
                      cursor={onDayClick ? "pointer" : "default"}
                      _hover={{ bg: isToday ? BRAND_RED : onDayClick ? "gray.100" : "transparent" }}
                      onClick={onDayClick ? () => onDayClick(day) : undefined}
                    >
                      <Text
                        fontSize="xs"
                        fontWeight={isToday ? "bold" : "normal"}
                        color={isToday ? "white" : "gray.700"}
                        lineHeight={1}
                      >
                        {day}
                      </Text>
                    </Flex>
                    <Box
                      w="4px"
                      h="4px"
                      borderRadius="full"
                      bg={hasEvent ? "blue.400" : "transparent"}
                      mt="2px"
                    />
                  </Flex>
                ) : null}
              </Box>
            );
          })}
        </Grid>
      ))}
    </Box>
  );
}
