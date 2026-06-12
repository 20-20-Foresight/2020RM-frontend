import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CompanyResearchQueueSectionDrawer } from "./CompanyResearchQueueSectionDrawer";
import { CompanyResearchQueueTable } from "./CompanyResearchQueueTable";

function SectionCard({ title, description, items, emptyText, onShowMore }) {
  return (
    <Card bg="white">
      <CardBody>
        <VStack align="stretch" spacing={4}>
          <Flex justify="space-between" align="center" gap={3}>
            <VStack align="start" spacing={0}>
              <Heading size="md">{title}</Heading>
              <Text fontSize="sm" color="gray.500">
                {description}
              </Text>
            </VStack>
            <Button size="sm" variant="outline" onClick={onShowMore}>
              Show more
            </Button>
          </Flex>
          <CompanyResearchQueueTable items={items} emptyText={emptyText} />
        </VStack>
      </CardBody>
    </Card>
  );
}

export function CompanyResearchDashboardPage({ dashboard, error }) {
  const processingItems = dashboard.processing.items || [];
  const [drawerSection, setDrawerSection] = useState(null);

  return (
    <Box px={{ base: 4, md: 8 }} pb={{ base: 6, md: 8 }}>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <VStack align="start" spacing={1}>
            <Heading size="lg">Queue</Heading>
            <Text color="gray.600" maxW="3xl">
              Live operational dashboard for manual requests and automated Company Research work.
            </Text>
          </VStack>
        </Flex>

        {error ? (
          <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={4}>
            <Text color="red.700" fontSize="sm">
              {error}
            </Text>
          </Box>
        ) : null}

        <SectionCard
          title="Next Up"
          description="All upcoming manual requests"
          items={dashboard.nextUp.items}
          emptyText="No manual requests are waiting in the queue."
          onShowMore={() => setDrawerSection("nextUp")}
        />

        <Card bg="white">
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Flex justify="space-between" align="center" gap={3}>
                <VStack align="start" spacing={0}>
                  <Heading size="md">Processing</Heading>
                </VStack>
                <Button size="sm" variant="outline" onClick={() => setDrawerSection("processing")}>
                  Show more
                </Button>
              </Flex>
              <CompanyResearchQueueTable
                items={processingItems}
                emptyText="No active Company Research work is running."
              />
            </VStack>
          </CardBody>
        </Card>

        <SectionCard
          title="Completed"
          description="Latest completed Company Research items"
          items={dashboard.completed.items}
          emptyText="No completed Company Research items yet."
          onShowMore={() => setDrawerSection("completed")}
        />
      </VStack>

      <CompanyResearchQueueSectionDrawer
        isOpen={Boolean(drawerSection)}
        onClose={() => setDrawerSection(null)}
        section={drawerSection || "nextUp"}
        title={
          drawerSection === "completed"
            ? "Completed"
            : drawerSection === "processing"
              ? "Processing"
              : "Next Up"
        }
      />
    </Box>
  );
}
