import { Badge, Box, Flex, Heading, HStack, Link as ChakraLink, Text } from "@chakra-ui/react";
import { Link as RemixLink } from "@remix-run/react";
import { SurfaceCard } from "./ui/atoms/SurfaceCard";
import { getLearnCategoryColorScheme } from "../models/learn.mjs";

/**
 * Formats one Learn topic permission label for display.
 * @param {"all"|"recruiter"|"admin"} permission
 * @returns {string}
 */
function formatPermissionLabel(permission) {
  if (permission === "recruiter") {
    return "Recruiter";
  }

  if (permission === "admin") {
    return "Admin";
  }

  return "All";
}

/**
 * Renders one Learn topic card.
 * @param {{
 *   topic: {
 *     id: string,
 *     title: string,
 *     summary: string,
 *     slug: string,
 *     category: string,
 *     permission: "all"|"recruiter"|"admin"
 *   }
 * }} props
 * @returns {JSX.Element}
 */
export function LearnTopicCard({ topic }) {
  return (
    <SurfaceCard>
      <Flex direction="column" h="100%">
        <HStack mb={3} justify="space-between" align="flex-start" spacing={3}>
          <Badge
            colorScheme={getLearnCategoryColorScheme(topic.category)}
            borderRadius="full"
            px={3}
            py={0.5}
            fontSize="xs"
            fontWeight="medium"
          >
            {topic.category || "Reference"}
          </Badge>
          {topic.permission !== "all" ? (
            <Badge colorScheme="red" variant="outline" fontSize="xs" borderRadius="full">
              {formatPermissionLabel(topic.permission)}
            </Badge>
          ) : null}
        </HStack>

        <Heading as="h2" size="sm" mb={2} color="gray.800">
          {topic.title}
        </Heading>

        <Text fontSize="sm" color="gray.600" flex="1" lineHeight="tall">
          {topic.summary}
        </Text>

        <Box mt={4}>
          <ChakraLink
            as={RemixLink}
            to={`/learn/${topic.slug}`}
            prefetch="intent"
            color="blue.700"
            fontWeight="semibold"
            fontSize="sm"
            _hover={{ color: "blue.800", textDecoration: "none" }}
          >
            Open →
          </ChakraLink>
        </Box>
      </Flex>
    </SurfaceCard>
  );
}
