/**
 * Design page: Learn — Topic Detail
 * Mock data only. Shows the category reference layout with sticky table of contents.
 * In production, active ToC tracking uses IntersectionObserver (see implementation plan).
 */
import { useState } from "react";
import {
  Box, Heading, Text, Flex, Divider, UnorderedList, ListItem,
  Badge, Link as ChakraLink
} from "@chakra-ui/react";
import { mockLearnTopics, mockLearnCategories } from "../models/design-mock.mjs";

const mockTopic = mockLearnTopics[0];
const categoryColors = {
  Segmentation: "purple",
  Talent: "orange",
  Market: "blue",
  Operations: "green"
};

export default function DesignLearnTopicPage() {
  const [activeId, setActiveId] = useState(mockLearnCategories[0]?.id);

  return (
    <Flex gap={8} align="flex-start">
      <Box flex="1" minW={0}>
        <Heading as="h1" size="lg" mb={2} color="gray.900">
          {mockTopic.title}
        </Heading>

        <Badge
          colorScheme={categoryColors[mockTopic.category] || "gray"}
          borderRadius="full"
          px={3}
          py={0.5}
          fontSize="xs"
          fontWeight="medium"
          mb={4}
          display="inline-block"
        >
          {mockTopic.category}
        </Badge>

        <Text color="gray.600" mb={6} lineHeight="tall">
          {mockTopic.summary}
        </Text>

        <Divider mb={8} />

        {mockLearnCategories.map((cat) => (
          <Box key={cat.id} id={cat.id} data-toc-id={cat.id} mb={12}>
            <Heading
              as="h2"
              size="md"
              mb={3}
              color="gray.800"
              onMouseEnter={() => setActiveId(cat.id)}
            >
              {cat.label}
            </Heading>

            <Box
              fontSize="sm"
              color="gray.600"
              lineHeight="tall"
              mb={4}
              sx={{ p: { mb: 2 } }}
              dangerouslySetInnerHTML={{ __html: cat.description }}
            />

            {cat.examples?.length > 0 && (
              <Box>
                <Heading
                  as="h3"
                  size="xs"
                  mb={2}
                  color="gray.400"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  fontWeight="semibold"
                >
                  Examples
                </Heading>
                <UnorderedList spacing={1} pl={4}>
                  {cat.examples.map((ex, i) => (
                    <ListItem key={i} fontSize="sm" color="gray.700">
                      {ex}
                    </ListItem>
                  ))}
                </UnorderedList>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box
        w="220px"
        flexShrink={0}
        position="sticky"
        top={4}
        maxH="calc(100vh - 120px)"
        overflowY="auto"
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
          {mockLearnCategories.map((cat) => {
            const isActive = activeId === cat.id;
            return (
              <ChakraLink
                key={cat.id}
                href={`#${cat.id}`}
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
                onClick={() => setActiveId(cat.id)}
                transition="all 0.1s"
                lineHeight="tall"
              >
                {cat.label}
              </ChakraLink>
            );
          })}
        </Box>
      </Box>
    </Flex>
  );
}
