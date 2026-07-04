/**
 * Design page: Learn — Landing Page
 * Mock data only. Shows the topic card grid with category filter bubbles.
 */
import { useState } from "react";
import {
  Box, Heading, Text, SimpleGrid, Badge, HStack, Flex, Tag, TagLabel
} from "@chakra-ui/react";
import { Link } from "@remix-run/react";
import { mockLearnTopics } from "../models/design-mock.mjs";

const categoryColors = {
  Segmentation: "purple",
  Talent: "orange",
  Market: "blue",
  Operations: "green"
};

export default function DesignLearnLandingPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...new Set(mockLearnTopics.map((t) => t.category))];
  const filtered =
    activeCategory === "All"
      ? mockLearnTopics
      : mockLearnTopics.filter((t) => t.category === activeCategory);

  return (
    <Box>
      <Heading size="md" mb={1}>Learn</Heading>
      <Text color="gray.500" fontSize="sm" mb={6}>
        Reference guides for segmentation dimensions, market definitions, and talent frameworks.
      </Text>

      <HStack spacing={2} mb={6} flexWrap="wrap">
        {categories.map((cat) => (
          <Tag
            key={cat}
            size="md"
            cursor="pointer"
            onClick={() => setActiveCategory(cat)}
            colorScheme={
              activeCategory === cat
                ? cat === "All"
                  ? "gray"
                  : categoryColors[cat] || "gray"
                : "gray"
            }
            variant={activeCategory === cat ? "solid" : "subtle"}
            borderRadius="full"
          >
            <TagLabel>{cat}</TagLabel>
          </Tag>
        ))}
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {filtered.map((topic) => (
          <Flex
            key={topic.id}
            direction="column"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="lg"
            p={6}
            shadow="sm"
            _hover={{ shadow: "md", borderColor: "blue.300" }}
            transition="all 0.15s"
          >
            <HStack mb={3} justify="space-between" align="flex-start">
              <Badge
                colorScheme={categoryColors[topic.category] || "gray"}
                borderRadius="full"
                px={3}
                py={0.5}
                fontSize="xs"
                fontWeight="medium"
              >
                {topic.category}
              </Badge>
              {topic.permission !== "all" && (
                <Badge colorScheme="red" variant="outline" fontSize="xs" borderRadius="full">
                  {topic.permission}
                </Badge>
              )}
            </HStack>

            <Heading as="h2" size="sm" mb={2} color="gray.800">
              {topic.title}
            </Heading>

            <Text fontSize="sm" color="gray.600" flex={1} lineHeight="tall">
              {topic.summary}
            </Text>

            <Box mt={4}>
              <Link
                to="/design/learn-topic"
                style={{
                  color: "#0F4C81",
                  fontWeight: 500,
                  fontSize: "0.875rem"
                }}
              >
                Open →
              </Link>
            </Box>
          </Flex>
        ))}
      </SimpleGrid>
    </Box>
  );
}
