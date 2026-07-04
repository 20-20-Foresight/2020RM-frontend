import React, { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  NavLink,
  Outlet,
  useFetcher,
  useOutletContext,
} from "@remix-run/react";
import { CompanyResearchRequestDrawer } from "./CompanyResearchRequestDrawer";

const COMPANY_RESEARCH_TABS = [
  { key: "queue", label: "Queue", to: "/tools/company-research" },
  {
    key: "feeds",
    label: "Feeds",
    to: "/tools/company-research/feeds",
  },
  {
    key: "settings",
    label: "Settings",
    to: "/tools/company-research/priority-manager",
  },
];

function TabLink({ tab }) {
  return (
    <Button
      as={NavLink}
      to={tab.to}
      end={tab.to === "/tools/company-research"}
      variant="ghost"
      size="sm"
      borderRadius="full"
      px={4}
      _activeLink={{
        bg: "blue.600",
        color: "white",
      }}
      color="gray.700"
      _hover={{
        bg: "blue.50",
      }}
    >
      {tab.label}
    </Button>
  );
}

export default function CompanyResearchLayoutRoute() {
  const drawer = useDisclosure();
  const fetcher = useFetcher();
  const [requestDrawerInitialValues, setRequestDrawerInitialValues] = useState(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  function openRequestDrawer(initialValues = null) {
    setRequestDrawerInitialValues(initialValues || null);
    drawer.onOpen();
  }

  function closeRequestDrawer() {
    drawer.onClose();
  }

  function handleRequestCreated() {
    setRequestDrawerInitialValues(null);
    drawer.onClose();
    setDashboardRefreshKey((current) => current + 1);
  }

  const outletContext = useMemo(
    () => ({
      openRequestDrawer,
      closeRequestDrawer,
      dashboardRefreshKey,
    }),
    [dashboardRefreshKey]
  );

  return (
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
          <Button colorScheme="blue" size="sm" onClick={() => openRequestDrawer()}>
            Request Research
          </Button>
        </Flex>
      </Box>

      <Box px={{ base: 4, md: 8 }} pb={6}>
        <Box
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="2xl"
          bg="white"
          px={3}
          py={3}
          overflowX="auto"
        >
          <HStack spacing={2} minW="max-content">
            {COMPANY_RESEARCH_TABS.map((tab) => (
              <TabLink key={tab.key} tab={tab} />
            ))}
          </HStack>
        </Box>
      </Box>

      <Outlet context={outletContext} />
      <CompanyResearchRequestDrawer
        isOpen={drawer.isOpen}
        onClose={closeRequestDrawer}
        fetcher={fetcher}
        onSuccess={handleRequestCreated}
        initialValues={requestDrawerInitialValues}
      />
    </Box>
  );
}

export function useCompanyResearchLayoutContext() {
  return useOutletContext();
}
