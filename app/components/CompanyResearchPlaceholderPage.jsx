import React from "react";
import { Badge, Box, Card, CardBody, Heading, Stack, Text, VStack } from "@chakra-ui/react";

export function CompanyResearchPlaceholderPage({
  eyebrow = "Company Research",
  title,
  description,
  status = "Planned",
}) {
  return (
    <Box px={{ base: 4, md: 8 }} pb={{ base: 6, md: 8 }}>
      <Card bg="white">
        <CardBody>
          <VStack align="start" spacing={4}>
            <Badge colorScheme="gray" variant="subtle">
              {eyebrow}
            </Badge>
            <Stack spacing={2}>
              <Heading size="md">{title}</Heading>
              <Text color="gray.600" maxW="3xl">
                {description}
              </Text>
            </Stack>
            <Badge colorScheme="blue" variant="subtle">
              {status}
            </Badge>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
}
