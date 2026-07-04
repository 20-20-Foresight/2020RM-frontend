import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Divider,
  Flex,
  Heading,
  ListItem,
  Text,
  UnorderedList
} from "@chakra-ui/react";
import { LearnTableOfContents } from "./LearnTableOfContents";
import { getLearnCategoryColorScheme } from "../models/learn.mjs";

/**
 * Reads one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Splits one multiline examples field into list items.
 * @param {unknown} value
 * @returns {string[]}
 */
function splitExamplesText(value) {
  return readTrimmedString(value)
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Renders trusted Learn topic description HTML produced by the admin editor.
 * @param {{html?: string}} props
 * @returns {JSX.Element|null}
 */
function LearnDescriptionMarkup({ html = "" }) {
  if (!readTrimmedString(html)) {
    return null;
  }

  return (
    <Box
      fontSize="sm"
      color="gray.600"
      lineHeight="tall"
      mb={4}
      sx={{
        p: { marginBottom: "0.75rem" },
        "p:last-of-type": { marginBottom: 0 },
        ul: { paddingLeft: "1.25rem", marginBottom: "0.75rem" },
        ol: { paddingLeft: "1.25rem", marginBottom: "0.75rem" }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Renders the Learn topic detail page.
 * @param {{
 *   topic: {
 *     title: string,
 *     summary: string,
 *     category: string
 *   },
 *   categories: Array<{
 *     id: string,
 *     label: string,
 *     description: string,
 *     examplesText: string
 *   }>
 * }} props
 * @returns {JSX.Element}
 */
export function LearnTopicPage({ topic, categories }) {
  const [activeId, setActiveId] = useState(() => categories?.[0]?.id || "");

  useEffect(() => {
    setActiveId(categories?.[0]?.id || "");
  }, [categories]);

  useEffect(() => {
    if (typeof IntersectionObserver !== "function" || !Array.isArray(categories) || !categories.length) {
      return undefined;
    }

    const headings = Array.from(document.querySelectorAll("[data-learn-toc-id]"));
    if (!headings.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

        if (visibleEntries.length) {
          const nextActiveId = visibleEntries[0]?.target?.dataset?.learnTocId || "";
          if (nextActiveId) {
            setActiveId(nextActiveId);
          }
        }
      },
      {
        rootMargin: "-12% 0px -72% 0px"
      }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <Flex direction={{ base: "column", xl: "row" }} gap={{ base: 6, xl: 8 }} align="flex-start">
      <Box flex="1" minW={0}>
        <Heading as="h1" size="lg" mb={2} color="gray.900">
          {topic.title}
        </Heading>

        <Badge
          colorScheme={getLearnCategoryColorScheme(topic.category)}
          borderRadius="full"
          px={3}
          py={0.5}
          fontSize="xs"
          fontWeight="medium"
          mb={4}
          display="inline-block"
        >
          {topic.category || "Reference"}
        </Badge>

        <Text color="gray.600" mb={6} lineHeight="tall">
          {topic.summary}
        </Text>

        <Divider mb={8} />

        {Array.isArray(categories) && categories.length ? (
          categories.map((category) => {
            const examples = splitExamplesText(category.examplesText);

            return (
              <Box key={category.id} id={category.id} mb={12}>
                <Heading
                  as="h2"
                  size="md"
                  mb={3}
                  color="gray.800"
                  data-learn-toc-id={category.id}
                >
                  {category.label}
                </Heading>

                <LearnDescriptionMarkup html={category.description} />

                {examples.length ? (
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
                      {examples.map((example) => (
                        <ListItem key={example} fontSize="sm" color="gray.700">
                          {example}
                        </ListItem>
                      ))}
                    </UnorderedList>
                  </Box>
                ) : null}
              </Box>
            );
          })
        ) : (
          <Text color="gray.500">No categories are available for this topic.</Text>
        )}
      </Box>

      <LearnTableOfContents categories={categories} activeId={activeId} />
    </Flex>
  );
}
