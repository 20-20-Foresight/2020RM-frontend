import React from "react";
import { Box } from "@chakra-ui/react";

const toneStyles = {
  default: {
    bg: "white",
    borderColor: "gray.200"
  },
  editing: {
    bg: "blue.50",
    borderColor: "blue.200"
  },
  saving: {
    bg: "blue.50",
    borderColor: "blue.200"
  },
  saved: {
    bg: "green.50",
    borderColor: "green.200"
  }
};

/**
 * Provides one reusable surface card for editor organisms.
 * @param {{
 *   tone?: "default"|"editing"|"saving"|"saved",
 *   children?: import("react").ReactNode
 * }} props
 * @returns {JSX.Element}
 */
export function SurfaceCard({ tone = "default", children }) {
  const style = toneStyles[tone] || toneStyles.default;

  return (
    <Box
      borderWidth="1px"
      borderColor={style.borderColor}
      borderRadius="xl"
      bg={style.bg}
      px={{ base: 4, md: 5 }}
      py={{ base: 4, md: 5 }}
      transition="background-color 0.35s ease, border-color 0.35s ease"
      boxShadow="sm"
    >
      {children}
    </Box>
  );
}
