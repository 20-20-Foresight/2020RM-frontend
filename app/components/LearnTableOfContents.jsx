import { Box, Link as ChakraLink, Text } from "@chakra-ui/react";

/**
 * Renders the Learn topic table of contents.
 * @param {{
 *   categories: Array<{id: string, label: string}>,
 *   activeId?: string
 * }} props
 * @returns {JSX.Element|null}
 */
export function LearnTableOfContents({ categories, activeId = "" }) {
  if (!Array.isArray(categories) || !categories.length) {
    return null;
  }

  return (
    <Box
      w={{ base: "full", xl: "220px" }}
      flexShrink={0}
      position={{ base: "static", xl: "sticky" }}
      top={4}
      maxH={{ base: "none", xl: "calc(100vh - 120px)" }}
      overflowY={{ base: "visible", xl: "auto" }}
    >
      <Text
        fontSize="xs"
        fontWeight="semibold"
        color="gray.400"
        textTransform="uppercase"
        letterSpacing="wider"
        mb={3}
      >
        Contents
      </Text>

      <Box borderLeftWidth="2px" borderColor="gray.200">
        {categories.map((category) => {
          const isActive = activeId === category.id;
          return (
            <ChakraLink
              key={category.id}
              href={`#${category.id}`}
              display="block"
              py={1.5}
              pl={3}
              ml="-2px"
              fontSize="sm"
              color={isActive ? "red.600" : "gray.500"}
              fontWeight={isActive ? "semibold" : "normal"}
              borderLeftWidth="2px"
              borderColor={isActive ? "red.500" : "transparent"}
              _hover={{ color: "gray.800", textDecoration: "none" }}
              transition="all 0.1s"
              lineHeight="tall"
            >
              {category.label}
            </ChakraLink>
          );
        })}
      </Box>
    </Box>
  );
}
