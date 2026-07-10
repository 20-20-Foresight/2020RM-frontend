import React from "react";
import { Badge, Box, Button, Card, CardBody, Flex, Heading, HStack, Stack, Text, VStack } from "@chakra-ui/react";
import { CompanyResearchRequestDrawer } from "./CompanyResearchRequestDrawer";
import { CompanyResearchQueueTable } from "./CompanyResearchQueueTable";

function StoryFetcherForm(props) {
  return <form {...props} />;
}

const idleFetcher = {
  state: "idle",
  data: null,
  Form: StoryFetcherForm,
};

const errorFetcher = {
  state: "idle",
  data: {
    error: "Example validation error from the Company Research service.",
  },
  Form: StoryFetcherForm,
};

const longNotes = [
  "This request came from a smaller-screen workflow review.",
  "The operators need to confirm the form footer stays visible while the field stack grows.",
  "Use this story to verify that only one scrollbar appears in the drawer shell.",
  "If the body needs to scroll, the header and footer should remain stable.",
  "This extra copy is here purely to force the long-form state in Storybook.",
].join(" ");

const mockQueueItems = [
  {
    id: "queue-1",
    companyName: "Clearwater Capital Partners",
    website: "https://ccpwealth.com/",
    linkedInUrl: "https://www.linkedin.com/company/ccpwealth",
    requestStatus: "Pending",
    queueStatus: "Pending",
    requestKind: "manual",
    originLabel: "Manual Request",
    reason: "One more time.",
    notes: "One more time.",
    dataProviders: ["linkedin", "salesnav", "biscred"],
    createdAt: "2026-06-29T21:49:00.000Z",
    updatedAt: "2026-07-02T19:04:00.000Z",
  },
  {
    id: "queue-2",
    companyName: "Egwele & Company",
    website: "https://www.egwele.com/",
    linkedInUrl: "https://www.linkedin.com/company/egwele-company/",
    requestStatus: "Pending",
    queueStatus: "Pending",
    requestKind: "manual",
    originLabel: "Manual Request",
    reason: "asdasfffff",
    notes: "asdasfffff",
    dataProviders: ["linkedin", "salesnav", "biscred", "preqin", "revenuebase"],
    createdAt: "2026-06-16T16:10:00.000Z",
    updatedAt: "2026-07-02T19:04:00.000Z",
  },
  {
    id: "queue-3",
    companyName: "Gattuso Development Partners",
    website: "https://www.gattusodevelopmentpartners.com/",
    linkedInUrl: "https://www.linkedin.com/company/gattuso-development-partners/",
    requestStatus: "Processing",
    queueStatus: "Saving to Salesforce",
    companyResearchStatus: "Saving to Salesforce",
    requestKind: "manual",
    originLabel: "Manual Request",
    reason: "Testing",
    notes: "Testing",
    dataProviders: ["linkedin", "salesnav", "biscred"],
    createdAt: "2026-07-02T19:06:00.000Z",
    updatedAt: "2026-07-02T19:19:00.000Z",
  },
  {
    id: "queue-4",
    companyName: "Claremont Hudson",
    website: "http://www.claremonthudson.com/",
    linkedInUrl: "https://www.linkedin.com/company/claremont-hudson/",
    requestStatus: "Processing",
    queueStatus: "RocketReach",
    companyResearchStatus: "RocketReach",
    requestKind: "manual",
    originLabel: "Manual Request",
    reason: "asdasd",
    notes: "asdasd",
    dataProviders: ["linkedin", "salesnav", "biscred"],
    createdAt: "2026-06-16T15:29:00.000Z",
    updatedAt: "2026-06-16T15:29:00.000Z",
  },
];

export default {
  title: "Company Research/Request Drawer",
  component: CompanyResearchRequestDrawer,
  parameters: {
    layout: "fullscreen",
  },
};

function StoryShellCard({ children }) {
  return (
    <Box bg="white" borderRadius="xl" boxShadow="sm" p={8}>
      {children}
    </Box>
  );
}

function CompanyResearchPageChrome({ children, shellScrollMode = "document" }) {
  const shellMain = (
    <Box bg="gray.100" minH="100vh">
      <Box px={{ base: 4, md: 8 }} pt={{ base: 5, md: 8 }} pb={4}>
        <Flex justify="space-between" align={{ base: "start", lg: "center" }} gap={4} wrap="wrap">
          <Box>
            <HStack spacing={2} mb={2}>
              <Badge colorScheme="orange" variant="subtle">
                Company Research
              </Badge>
              <Badge colorScheme="blue" variant="subtle">
                Tool
              </Badge>
            </HStack>
            <Heading size="lg">Company Research</Heading>
            <Text mt={2} color="gray.600" maxW="4xl">
              Queue operations, prioritization, and intake configuration for Company Research.
            </Text>
          </Box>
          <Button colorScheme="blue" size="sm">
            Request Research
          </Button>
        </Flex>
      </Box>

      <Box px={{ base: 4, md: 8 }} pb={6}>
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="2xl" bg="white" px={3} py={3} overflowX="auto">
          <HStack spacing={2} minW="max-content">
            {["Queue", "Feeds", "Settings"].map((label, index) => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                borderRadius="full"
                px={4}
                bg={index === 0 ? "blue.600" : "transparent"}
                color={index === 0 ? "white" : "gray.700"}
                _hover={{ bg: index === 0 ? "blue.700" : "blue.50" }}
              >
                {label}
              </Button>
            ))}
          </HStack>
        </Box>
      </Box>

      <Box px={{ base: 4, md: 8 }} pb={8}>
        <Stack spacing={8}>
          <StoryShellCard>
            <Heading size="md">Queue</Heading>
            <Text mt={3} color="gray.600">
              Live operational dashboard for manual requests and automated Company Research work.
            </Text>
          </StoryShellCard>
          {Array.from({ length: 10 }, (_, index) => (
            <StoryShellCard key={`queue-section-${index + 1}`}>
              <Heading size="md">Mock section {index + 1}</Heading>
              <Text mt={3} color="gray.600">
                This section keeps the page tall enough to exercise the real app-shell scroll behavior behind the drawer.
              </Text>
              <Text mt={3} color="gray.600">
                The point of this story is to mimic the CRM layout more closely than a plain long document.
              </Text>
            </StoryShellCard>
          ))}
        </Stack>
      </Box>
      {children}
    </Box>
  );

  if (shellScrollMode === "main") {
    return (
      <Flex minH="100vh" bg="gray.50" color="gray.900" position="relative" direction="column">
        <Flex
          as="header"
          align="center"
          px={{ base: 4, md: 6 }}
          py={4}
          bg="#000000"
          color="rgba(255, 255, 255, 0.92)"
          borderBottomWidth="1px"
          borderBottomColor="rgba(255, 255, 255, 0.08)"
          gap={4}
        >
          <Text fontWeight="bold">20/20 FORESIGHT</Text>
        </Flex>
        <Flex flex="1" minH="0" className="app-shell-body">
          <Box
            display={{ base: "none", md: "block" }}
            bg="#16181d"
            color="rgba(255, 255, 255, 0.92)"
            borderRightWidth="1px"
            borderRightColor="rgba(255, 255, 255, 0.08)"
            width="250px"
            px={4}
            py={5}
          >
            <Stack spacing={3}>
              {["Dashboard", "Organizations", "People", "Services", "Reports", "Lists", "Learn", "Marketing", "Tools"].map((label) => (
                <Box
                  key={label}
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg={label === "Tools" ? "#D72638" : "transparent"}
                  color="white"
                >
                  {label}
                </Box>
              ))}
            </Stack>
          </Box>
          <Flex direction="column" flex="1" minW="0">
            <Box as="main" flex="1" minH="0" overflowY="auto" p={{ base: 4, md: 6 }}>
              {shellMain}
            </Box>
          </Flex>
        </Flex>
      </Flex>
    );
  }

  return shellMain;
}

export function FitsViewport() {
  return (
    <CompanyResearchRequestDrawer
      isOpen
      onClose={() => {}}
      fetcher={idleFetcher}
      onSuccess={() => {}}
      initialValues={{
        companyName: "Clearwater Capital Partners",
        website: "https://ccpwealth.com/",
        linkedInUrl: "https://www.linkedin.com/company/ccpwealth",
        dataProviders: ["linkedin", "salesnav", "biscred"],
        requestReason: "From Email Request",
        notes: "Short note to confirm the drawer fits without awkward extra scrolling.",
      }}
    />
  );
}

export function RequiresScroll() {
  return (
    <CompanyResearchRequestDrawer
      isOpen
      onClose={() => {}}
      fetcher={errorFetcher}
      onSuccess={() => {}}
      initialValues={{
        companyName: "Egwele & Company",
        website: "https://www.egwele.com/",
        linkedInUrl: "https://www.linkedin.com/company/egwele-company/",
        dataProviders: ["linkedin", "salesnav", "biscred", "preqin", "revenuebase"],
        requestReason: "From Email Request",
        notes: longNotes,
      }}
    />
  );
}

export function OverScrollablePage() {
  return (
    <Box bg="gray.100" minH="200vh">
      <Box maxW="5xl" mx="auto" px={8} py={10}>
        <Stack spacing={8}>
          <Box bg="white" borderRadius="xl" boxShadow="sm" p={8}>
            <Text fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase" color="orange.600">
              Company Research
            </Text>
            <Heading mt={2} size="lg">
              Scrollable backdrop check
            </Heading>
            <Text mt={3} color="gray.600">
              This story simulates the actual app condition: a right-side drawer over a page that is also tall enough to scroll.
            </Text>
          </Box>
          {Array.from({ length: 8 }, (_, index) => (
            <Box key={`mock-section-${index + 1}`} bg="white" borderRadius="xl" boxShadow="sm" p={8}>
              <Heading size="md">Mock section {index + 1}</Heading>
              <Text mt={3} color="gray.600">
                Use this page to verify the wheel/trackpad behavior when both the background document and the drawer could plausibly capture scroll input.
              </Text>
              <Text mt={3} color="gray.600">
                The expected behavior is that wheel input over the drawer scrolls the drawer body, while the background page remains visually frozen behind the overlay.
              </Text>
            </Box>
          ))}
        </Stack>
      </Box>
      <CompanyResearchRequestDrawer
        isOpen
        onClose={() => {}}
        fetcher={errorFetcher}
        onSuccess={() => {}}
        initialValues={{
          companyName: "Egwele & Company",
          website: "https://www.egwele.com/",
          linkedInUrl: "https://www.linkedin.com/company/egwele-company/",
          dataProviders: ["linkedin", "salesnav", "biscred", "preqin", "revenuebase"],
          requestReason: "From Email Request",
          notes: longNotes,
        }}
      />
    </Box>
  );
}

export function AppShellMainScroll() {
  return (
    <CompanyResearchPageChrome shellScrollMode="main">
      <CompanyResearchRequestDrawer
        isOpen
        onClose={() => {}}
        fetcher={errorFetcher}
        onSuccess={() => {}}
        initialValues={{
          companyName: "Egwele & Company",
          website: "https://www.egwele.com/",
          linkedInUrl: "https://www.linkedin.com/company/egwele-company/",
          dataProviders: ["linkedin", "salesnav", "biscred", "preqin", "revenuebase"],
          requestReason: "From Email Request",
          notes: longNotes,
        }}
      />
    </CompanyResearchPageChrome>
  );
}

AppShellMainScroll.parameters = {
  viewport: {
    defaultViewport: "smallLaptop",
  },
};

export function AppShellDocumentScroll() {
  return (
    <CompanyResearchPageChrome shellScrollMode="document">
      <CompanyResearchRequestDrawer
        isOpen
        onClose={() => {}}
        fetcher={errorFetcher}
        onSuccess={() => {}}
        initialValues={{
          companyName: "Egwele & Company",
          website: "https://www.egwele.com/",
          linkedInUrl: "https://www.linkedin.com/company/egwele-company/",
          dataProviders: ["linkedin", "salesnav", "biscred", "preqin", "revenuebase"],
          requestReason: "From Email Request",
          notes: longNotes,
        }}
      />
    </CompanyResearchPageChrome>
  );
}

AppShellDocumentScroll.parameters = {
  viewport: {
    defaultViewport: "smallLaptop",
  },
};

export function AppShellRealQueue() {
  return (
    <CompanyResearchPageChrome shellScrollMode="document">
      <Box px={{ base: 4, md: 8 }} pb={{ base: 6, md: 8 }}>
        <VStack align="stretch" spacing={6}>
          <Card bg="white">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Flex justify="space-between" align="center" gap={3}>
                  <VStack align="start" spacing={0}>
                    <Heading size="md">Next Up</Heading>
                    <Text fontSize="sm" color="gray.500">
                      All upcoming manual requests
                    </Text>
                  </VStack>
                  <Button size="sm" variant="outline">
                    Show more
                  </Button>
                </Flex>
                <CompanyResearchQueueTable
                  items={mockQueueItems.slice(0, 2)}
                  emptyText="No manual requests are waiting in the queue."
                />
              </VStack>
            </CardBody>
          </Card>

          <Card bg="white">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Flex justify="space-between" align="center" gap={3}>
                  <VStack align="start" spacing={0}>
                    <Heading size="md">Processing</Heading>
                  </VStack>
                  <Button size="sm" variant="outline">
                    Show more
                  </Button>
                </Flex>
                <CompanyResearchQueueTable
                  items={mockQueueItems.slice(2)}
                  emptyText="No active Company Research work is running."
                />
              </VStack>
            </CardBody>
          </Card>

          {Array.from({ length: 4 }, (_, index) => (
            <StoryShellCard key={`queue-tail-${index + 1}`}>
              <Heading size="md">Completed mock section {index + 1}</Heading>
              <Text mt={3} color="gray.600">
                This keeps the page height and general density closer to the real Company Research dashboard.
              </Text>
            </StoryShellCard>
          ))}
        </VStack>
      </Box>
      <CompanyResearchRequestDrawer
        isOpen
        onClose={() => {}}
        fetcher={errorFetcher}
        onSuccess={() => {}}
        initialValues={{
          companyName: "Egwele & Company",
          website: "https://www.egwele.com/",
          linkedInUrl: "https://www.linkedin.com/company/egwele-company/",
          dataProviders: ["linkedin", "salesnav", "biscred", "preqin", "revenuebase"],
          requestReason: "From Email Request",
          notes: longNotes,
        }}
      />
    </CompanyResearchPageChrome>
  );
}

AppShellRealQueue.parameters = {
  viewport: {
    defaultViewport: "smallLaptop",
  },
};
