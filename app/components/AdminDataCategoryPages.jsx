import {
  Badge,
  Box,
  Heading,
  HStack,
  LinkBox,
  LinkOverlay,
  SimpleGrid,
  Text,
  VStack
} from "@chakra-ui/react";
import { Link } from "@remix-run/react";

function DataCard({ title, description, to, badgeText, badgeScheme = "gray" }) {
  return (
    <LinkBox
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="2xl"
      bg="white"
      px={{ base: 5, md: 6 }}
      py={{ base: 5, md: 6 }}
      transition="all 0.16s ease"
      _hover={{
        borderColor: "red.300",
        boxShadow: "md",
        transform: "translateY(-1px)"
      }}
    >
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="start" spacing={3}>
          <Heading size="sm" color="gray.900" lineHeight="short">
            <LinkOverlay as={Link} to={to}>
              {title}
            </LinkOverlay>
          </Heading>
          {badgeText ? (
            <Badge colorScheme={badgeScheme} borderRadius="full" px={2.5} py={1} whiteSpace="nowrap">
              {badgeText}
            </Badge>
          ) : null}
        </HStack>
        <Text color="gray.600">{description}</Text>
      </VStack>
    </LinkBox>
  );
}

export function AdminDataCategoryLandingPage({ categories }) {
  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Box maxW="4xl">
          <Heading size="md">Data</Heading>
          <Text color="gray.600" mt={2}>
            Start with one data category instead of loading the full data list up front. This first pass keeps the
            existing editors in place and breaks the landing experience into smaller sections.
          </Text>
        </Box>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" overflow="auto">
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
          {categories.map((category) => (
            <DataCard
              key={category.slug}
              title={category.title}
              description={category.description}
              to={category.to}
              badgeText={category.itemCount ? `${category.itemCount} Pages` : "Open"}
              badgeScheme={category.accent || "gray"}
            />
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}

export function AdminDataCategoryDetailPage({ category, entries }) {
  const availableCount = entries.filter((entry) => entry.status === "available").length;

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white">
        <Box maxW="4xl">
          <Heading size="md">{category.title}</Heading>
          <Text color="gray.600" mt={2}>
            {category.description}
          </Text>
          <Text color="gray.500" mt={2} fontSize="sm">
            {availableCount} of {entries.length} configured pages resolve directly to an editor. The rest fall back to
            a filtered View All search for this first pass.
          </Text>
        </Box>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" overflow="auto">
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
          {entries.map((entry) => (
            <DataCard
              key={entry.slug}
              title={entry.label}
              description={entry.description}
              to={entry.to}
              badgeText={entry.status === "available" ? "Editor" : "Search"}
              badgeScheme={entry.status === "available" ? "green" : "orange"}
            />
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}
