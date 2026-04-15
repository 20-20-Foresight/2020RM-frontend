import React from "react";
import { Box, Text } from "@chakra-ui/react";
import { SectionLabel } from "../atoms/SectionLabel";

/**
 * Displays one labeled content region inside cards and stories.
 * @param {{
 *   label: string,
 *   children?: import("react").ReactNode,
 *   emptyText?: string
 * }} props
 * @returns {JSX.Element}
 */
export function LabeledContentBlock({ label, children, emptyText = "No content" }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <Box>
      <SectionLabel>{label}</SectionLabel>
      {hasChildren ? children : <Text color="gray.500">{emptyText}</Text>}
    </Box>
  );
}
