import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  Skeleton,
  SkeletonText,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CompanyResearchQueueSectionDrawer } from "./CompanyResearchQueueSectionDrawer";
import { useCompanyResearchLayoutContext } from "./CompanyResearchLayoutPage";
import { CompanyResearchQueueTable } from "./CompanyResearchQueueTable";

const DASHBOARD_POLL_INTERVAL_MS = 60_000;

function buildRerunRequestValues(item) {
  return {
    companyName: item?.companyName || "",
    website: item?.website || "",
    linkedInUrl: item?.linkedInUrl || "",
    requestReason: item?.reason || "From Email Request",
    notes: item?.notes || item?.reason || "",
    dataProviders: item?.dataProviders || [],
    originLabel: "Rerun Request",
  };
}

function SectionCard({
  title,
  description,
  items,
  emptyText,
  onShowMore,
  onRerunRequest,
  isLoading = false,
}) {
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
          {isLoading ? <QueueTableSkeleton /> : (
            <CompanyResearchQueueTable
              items={items}
              emptyText={emptyText}
              onRerunRequest={onRerunRequest}
            />
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}

function QueueTableSkeleton() {
  return (
    <VStack align="stretch" spacing={3}>
      {[0, 1, 2].map((index) => (
        <Box key={index} borderWidth="1px" borderColor="gray.200" borderRadius="lg" p={4}>
          <Skeleton height="16px" width={index === 0 ? "28%" : index === 1 ? "42%" : "36%"} mb={3} />
          <SkeletonText noOfLines={2} spacing="2" skeletonHeight="10px" />
        </Box>
      ))}
    </VStack>
  );
}

function buildEmptyDashboard() {
  return {
    nextUp: { count: 0, items: [] },
    processing: { total: 0, items: [], groups: [] },
    completed: { count: 0, items: [] },
  };
}

export function CompanyResearchDashboardPage({ dashboard, error }) {
  const layout = useCompanyResearchLayoutContext();
  const [drawerSection, setDrawerSection] = useState(null);
  const [liveDashboard, setLiveDashboard] = useState(() => dashboard || buildEmptyDashboard());
  const [loading, setLoading] = useState(() => !dashboard);
  const [loadError, setLoadError] = useState(error || null);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard({ showLoading = false } = {}) {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const response = await fetch("/api/rest/company-research/dashboard", {
          headers: { accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load Company Research.");
        }
        if (!isActive) {
          return;
        }
        setLiveDashboard(payload?.dashboard || buildEmptyDashboard());
        setLoadError(null);
      } catch (fetchError) {
        if (!isActive) {
          return;
        }
        setLoadError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load Company Research."
        );
      } finally {
        if (isActive && showLoading) {
          setLoading(false);
        }
      }
    }

    loadDashboard({ showLoading: !dashboard });
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboard();
      }
    }, DASHBOARD_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [dashboard, layout?.dashboardRefreshKey]);

  const processingItems = liveDashboard.processing?.items || [];

  function handleRerunRequest(item) {
    setDrawerSection(null);
    layout?.openRequestDrawer?.(buildRerunRequestValues(item));
  }

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

        {loadError ? (
          <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={4}>
            <Text color="red.700" fontSize="sm">
              {loadError}
            </Text>
          </Box>
        ) : null}

        <SectionCard
          title="Next Up"
          description="All upcoming manual requests"
          items={liveDashboard.nextUp?.items || []}
          emptyText="No manual requests are waiting in the queue."
          onShowMore={() => setDrawerSection("nextUp")}
          onRerunRequest={handleRerunRequest}
          isLoading={loading}
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
              {loading ? (
                <QueueTableSkeleton />
              ) : (
                <CompanyResearchQueueTable
                  items={processingItems}
                  emptyText="No active Company Research work is running."
                  onRerunRequest={handleRerunRequest}
                />
              )}
            </VStack>
          </CardBody>
        </Card>

        <SectionCard
          title="Completed"
          description="Latest completed Company Research items"
          items={liveDashboard.completed?.items || []}
          emptyText="No completed Company Research items yet."
          onShowMore={() => setDrawerSection("completed")}
          onRerunRequest={handleRerunRequest}
          isLoading={loading}
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
        onRerunRequest={handleRerunRequest}
      />
    </Box>
  );
}
