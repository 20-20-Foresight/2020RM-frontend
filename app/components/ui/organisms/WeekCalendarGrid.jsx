import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_EVENT_COLOR = "gray.400";

function eventTextColor(color) {
  // Yellow reads poorly with white text — everything else in our palette is dark enough.
  return color?.startsWith("yellow") ? "gray.900" : "white";
}

function formatHourLabel(hour) {
  const period = hour < 12 ? "AM" : "PM";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${period}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
}

/**
 * Outlook/Google-style week view: 7 day columns against hourly time-of-day
 * rows, with events rendered as compact blocks positioned at their real
 * scheduled time (not full-height "meetings" — a send chunk is a moment,
 * not a duration). Fluid — fills whatever height/width its container gives
 * it (row positions are percentages, not fixed pixels), so it can grow to
 * fill the page instead of being capped at a fixed size.
 * @param {{
 *   weekStart: Date,
 *   hourRange?: [number, number],
 *   events: Array<{id: string, dayIndex: number, startMinutes: number, label: string, sublabel?: string, color?: string}>,
 *   onEventClick?: (id: string) => void,
 *   today?: Date,
 *   height?: string
 * }} props
 */
export function WeekCalendarGrid({ weekStart, hourRange = [7, 19], events, onEventClick, today = new Date(), height = "100%" }) {
  const [startHour, endHour] = hourRange;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
  const totalMinutes = hours.length * 60;
  const days = buildWeekDays(weekStart);
  const eventsByDay = days.map((_, dayIndex) => events.filter((event) => event.dayIndex === dayIndex));

  return (
    <Box h={height} display="flex" flexDirection="column" borderWidth="1px" borderColor="gray.200" borderRadius="md" overflow="hidden" bg="white">
      <Flex borderBottomWidth="1px" borderColor="gray.200" flexShrink={0}>
        <Box w="64px" flexShrink={0} />
        {days.map((day, index) => {
          const isToday = isSameDay(day, today);
          return (
            <Box
              key={index}
              flex="1"
              textAlign="center"
              py={2}
              borderLeftWidth={index === 0 ? 0 : "1px"}
              borderColor="gray.100"
              bg={isToday ? "blue.50" : "transparent"}
            >
              <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                {DAY_LABELS[day.getDay()]}
              </Text>
              <Text fontSize="sm" fontWeight={isToday ? "bold" : "normal"} color={isToday ? "blue.600" : "gray.800"}>
                {day.getDate()}
              </Text>
            </Box>
          );
        })}
      </Flex>

      <Flex flex="1" minH={0}>
        <Box w="64px" flexShrink={0} position="relative">
          {hours.map((hour, hourIndex) => (
            <Box
              key={hour}
              position="absolute"
              top={`${(hourIndex / hours.length) * 100}%`}
              left={0}
              right={0}
              borderTopWidth="1px"
              borderColor="gray.100"
              px={2}
            >
              <Text fontSize="xs" color="gray.400" transform="translateY(-8px)">
                {formatHourLabel(hour)}
              </Text>
            </Box>
          ))}
        </Box>

        <Flex flex="1">
          {days.map((day, dayIndex) => (
            <Box key={dayIndex} flex="1" position="relative" borderLeftWidth="1px" borderColor="gray.100">
              {hours.map((hour, hourIndex) => (
                <Box
                  key={hour}
                  position="absolute"
                  top={`${(hourIndex / hours.length) * 100}%`}
                  left={0}
                  right={0}
                  borderTopWidth="1px"
                  borderColor="gray.100"
                />
              ))}
              {eventsByDay[dayIndex].map((event) => {
                const offsetMinutes = event.startMinutes - startHour * 60;
                const topPercent = (offsetMinutes / totalMinutes) * 100;
                const color = event.color || DEFAULT_EVENT_COLOR;
                const textColor = eventTextColor(color);
                return (
                  <Box
                    key={event.id}
                    position="absolute"
                    top={`${topPercent}%`}
                    left="4px"
                    right="4px"
                    bg={color}
                    borderRadius="sm"
                    px={2}
                    py={1}
                    cursor={onEventClick ? "pointer" : "default"}
                    onClick={onEventClick ? () => onEventClick(event.id) : undefined}
                    boxShadow="sm"
                    zIndex={1}
                    _hover={onEventClick ? { opacity: 0.85 } : undefined}
                  >
                    <Text fontSize="xs" fontWeight="bold" color={textColor} noOfLines={1}>
                      {event.label}
                    </Text>
                    {event.sublabel ? (
                      <Text fontSize="xs" color={textColor} opacity={0.9} noOfLines={1}>
                        {event.sublabel}
                      </Text>
                    ) : null}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}
