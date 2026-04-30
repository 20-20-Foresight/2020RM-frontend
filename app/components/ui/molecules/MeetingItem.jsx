import React from "react";
import { Box, HStack, Icon, Text } from "@chakra-ui/react";
import { FiCheck, FiClock, FiPhone } from "react-icons/fi";

const TYPE_CONFIG = {
  call:     { bg: "#EBF8FF", borderColor: "blue.400",  icon: FiPhone },
  internal: { bg: "#F0FFF4", borderColor: "green.400", icon: FiCheck },
  meeting:  { bg: "#FFF5F5", borderColor: "#D72638",   icon: FiClock },
};

/**
 * One row in a meeting/schedule list.
 * @param {{
 *   meeting: {
 *     id: string,
 *     time: string,
 *     title: string,
 *     type: "call"|"internal"|"meeting",
 *     duration: string
 *   }
 * }} props
 */
export function MeetingItem({ meeting }) {
  const cfg = TYPE_CONFIG[meeting.type] || TYPE_CONFIG.meeting;

  return (
    <HStack
      spacing={3}
      py={2.5}
      px={3}
      borderRadius="md"
      bg={cfg.bg}
      borderLeftWidth="3px"
      borderLeftColor={cfg.borderColor}
    >
      <Icon as={cfg.icon} color={cfg.borderColor} boxSize={3.5} flexShrink={0} />
      <Box flex={1} minW={0}>
        <Text fontSize="xs" fontWeight="semibold" color="gray.800" noOfLines={1}>
          {meeting.title}
        </Text>
        <Text fontSize="xs" color="gray.500" mt={0.5}>
          {meeting.time} · {meeting.duration}
        </Text>
      </Box>
    </HStack>
  );
}
