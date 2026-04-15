import React from "react";
import { Text } from "@chakra-ui/react";

/**
 * Renders one consistent section label inside cards.
 * @param {{
 *   children?: import("react").ReactNode
 * }} props
 * @returns {JSX.Element}
 */
export function SectionLabel({ children }) {
  return (
    <Text fontWeight="semibold" color="gray.800" mb={2}>
      {children}
    </Text>
  );
}
