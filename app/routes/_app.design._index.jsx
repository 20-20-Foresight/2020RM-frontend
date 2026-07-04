import { Box, Heading, SimpleGrid, Card, CardBody, Text, Badge } from "@chakra-ui/react";
import { Link } from "@remix-run/react";
import { designPages } from "../models/design-pages.mjs";

export default function DesignIndex() {
  return (
    <Box>
      <Heading size="md" mb={1}>Design Pages</Heading>
      <Text color="gray.500" mb={6} fontSize="sm">
        Live design sandbox. Add entries to <code>design-pages.mjs</code> to create a new page.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {designPages.map((page) => (
          <Card
            key={page.key}
            as={Link}
            to={page.to}
            _hover={{ shadow: "md", borderColor: "blue.300" }}
            border="1px solid"
            borderColor="gray.200"
            transition="all 0.15s"
          >
            <CardBody>
              <Badge colorScheme="purple" mb={2} fontSize="xs">Design</Badge>
              <Heading size="sm" mb={1}>{page.label}</Heading>
              <Text fontSize="sm" color="gray.500">{page.description}</Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
}
