import React from "react";
import { Box, HStack, Icon, Text } from "@chakra-ui/react";
import { FiCheckCircle } from "react-icons/fi";

/**
 * Selectable card for one list option — a recipient segment, a "build
 * custom" entry point, or (with multiple selectable at once) an exclusion
 * list. Selection state is visual only — the parent owns which card(s) are
 * selected, so the same card works for single-select and multi-select pickers.
 * @param {{
 *   label: string,
 *   description: string,
 *   count?: number|null,
 *   countLabel?: string,
 *   isSelected: boolean,
 *   onClick: () => void
 * }} props
 */
export function AudienceListCard({ label, description, count = null, countLabel = "people", isSelected, onClick }) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      textAlign="left"
      w="full"
      borderWidth="1px"
      borderColor={isSelected ? "blue.400" : "gray.200"}
      bg={isSelected ? "blue.50" : "white"}
      borderRadius="md"
      px={4}
      py={3}
      _hover={{ borderColor: "blue.300" }}
      transition="all 0.12s"
    >
      <HStack justify="space-between" align="flex-start">
        <Text fontWeight="semibold" fontSize="sm" color="gray.800">
          {label}
        </Text>
        {isSelected ? <Icon as={FiCheckCircle} color="blue.500" boxSize={4} flexShrink={0} mt={0.5} /> : null}
      </HStack>
      <Text fontSize="xs" color="gray.500" mt={0.5}>
        {description}
      </Text>
      {count != null ? (
        <Text fontSize="xs" color="gray.400" mt={1.5} fontVariantNumeric="tabular-nums">
          {count.toLocaleString()} {countLabel}
        </Text>
      ) : null}
    </Box>
  );
}
