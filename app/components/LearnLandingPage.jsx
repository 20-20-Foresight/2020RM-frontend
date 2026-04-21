import { useState } from "react";
import { Box, Heading, HStack, SimpleGrid, Tag, TagLabel, Text } from "@chakra-ui/react";
import { LearnTopicCard } from "./LearnTopicCard";
import { SurfaceCard } from "./ui/atoms/SurfaceCard";
import { getLearnCategoryColorScheme } from "../models/learn.mjs";

/**
 * Renders the Learn landing page with category filters.
 * @param {{
 *   topics: Array<{
 *     id: string,
 *     title: string,
 *     summary: string,
 *     slug: string,
 *     category: string,
 *     permission: "all"|"recruiter"|"admin"
 *   }>
 * }} props
 * @returns {JSX.Element}
 */
export function LearnLandingPage({ topics }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", ...new Set((Array.isArray(topics) ? topics : []).map((topic) => topic.category).filter(Boolean))];
  const filteredTopics = activeCategory === "All"
    ? topics
    : (Array.isArray(topics) ? topics : []).filter((topic) => topic.category === activeCategory);

  return (
    <Box>
      <Heading size="md" mb={1}>Learn</Heading>
      <Text color="gray.500" fontSize="sm" mb={6}>
        Reference guides for segmentation dimensions and other shared operating definitions.
      </Text>

      {categories.length > 1 ? (
        <HStack spacing={2} mb={6} flexWrap="wrap">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            const colorScheme = category === "All" ? "gray" : getLearnCategoryColorScheme(category);

            return (
              <Tag
                key={category}
                size="md"
                cursor="pointer"
                onClick={() => setActiveCategory(category)}
                colorScheme={isActive ? colorScheme : "gray"}
                variant={isActive ? "solid" : "subtle"}
                borderRadius="full"
              >
                <TagLabel>{category}</TagLabel>
              </Tag>
            );
          })}
        </HStack>
      ) : null}

      {filteredTopics.length ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
          {filteredTopics.map((topic) => (
            <LearnTopicCard key={topic.id} topic={topic} />
          ))}
        </SimpleGrid>
      ) : (
        <SurfaceCard>
          <Heading size="sm" mb={2}>No topics available</Heading>
          <Text color="gray.600" fontSize="sm">
            No Learn topics are currently visible for this account.
          </Text>
        </SurfaceCard>
      )}
    </Box>
  );
}
