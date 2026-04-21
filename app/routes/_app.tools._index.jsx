import { Link } from "@remix-run/react";
import { Box, Heading, Text, SimpleGrid, Card, CardBody, Badge, Icon, HStack } from "@chakra-ui/react";
import { MdCategory, MdChevronRight } from "react-icons/md";
import { toolsConfig } from "../models/tools-config.mjs";

const statusScheme = { available: "green", beta: "orange", "coming-soon": "gray" };

export default function ToolsIndexPage() {
  return (
    <Box>
      <Heading size="md" mb={1}>Tools</Heading>
      <Text color="gray.500" fontSize="sm" mb={6}>
        Utilities for managing and enriching CRM data.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {toolsConfig.map((tool) => (
          <Card
            key={tool.key}
            as={tool.status === "available" ? Link : Box}
            to={tool.status === "available" ? tool.to : undefined}
            _hover={tool.status === "available" ? { shadow: "md", borderColor: "blue.300" } : {}}
            border="1px solid"
            borderColor="gray.200"
            transition="all 0.15s"
            cursor={tool.status === "available" ? "pointer" : "default"}
          >
            <CardBody>
              <HStack justify="space-between" align="flex-start" mb={2}>
                <HStack spacing={2}>
                  <Icon as={MdCategory} color="blue.500" boxSize={5} />
                  <Heading size="sm">{tool.label}</Heading>
                </HStack>
                <Badge colorScheme={statusScheme[tool.status] ?? "gray"} fontSize="xs">
                  {tool.status === "coming-soon" ? "Coming Soon" : tool.status}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="gray.600">{tool.description}</Text>
              {tool.status === "available" && (
                <HStack mt={3} color="blue.500" fontSize="sm" fontWeight="medium">
                  <Text>Open tool</Text>
                  <Icon as={MdChevronRight} />
                </HStack>
              )}
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
}
