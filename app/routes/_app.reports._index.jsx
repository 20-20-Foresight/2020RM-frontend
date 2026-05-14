import {
  Badge,
  Box,
  Flex,
  Heading,
  LinkBox,
  LinkOverlay,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { loadReportsList } from "../models/reports.server";

export async function loader({ request }) {
  const payload = await loadReportsList({ request });
  return json(payload);
}

export default function ReportsLandingRoute() {
  const data = useLoaderData();
  const featuredReports = Array.isArray(data.reports) ? data.reports.slice(0, 5) : [];

  return (
    <Stack spacing={8}>
      <Box>
        <Heading size="lg">Reports</Heading>
        <Text color="gray.600" mt={2} maxW="3xl">
          Saved workbook-style reporting for review work, scheduled snapshots, and reusable CRM follow-up lists.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
        {data.cards.map((card) => (
          <LinkBox
            key={card.key}
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            p={5}
            shadow="sm"
            transition="transform 0.15s ease, box-shadow 0.15s ease"
            _hover={{
              transform: "translateY(-2px)",
              shadow: "md"
            }}
          >
            <Flex justify="space-between" align="center" mb={3}>
              <Badge colorScheme={card.kind === "category" ? "red" : "gray"}>{card.kind}</Badge>
              <Text fontSize="2xl" fontWeight="bold">
                {Number(card.count || 0).toLocaleString()}
              </Text>
            </Flex>
            <Stack spacing={2}>
              <Heading size="md">
                <LinkOverlay as={Link} to={card.href}>
                  {card.label}
                </LinkOverlay>
              </Heading>
              <Text color="gray.600">
                Open a filtered report list for this reporting slice.
              </Text>
            </Stack>
          </LinkBox>
        ))}
      </SimpleGrid>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
        <Flex justify="space-between" align="center" mb={4}>
          <Box>
            <Heading size="md">Current Reports</Heading>
            <Text color="gray.600" mt={1}>
              The first V1 reports available in the system.
            </Text>
          </Box>
          <Link to="/reports/list">Browse all reports</Link>
        </Flex>
        <Stack spacing={3}>
          {featuredReports.length ? (
            featuredReports.map((report) => (
              <Box key={report.id} borderTopWidth="1px" borderColor="gray.100" pt={3}>
                <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap">
                  <Box>
                    <Link to={`/reports/${report.id}`}>{report.name}</Link>
                    <Text color="gray.600" mt={1}>
                      {report.summary || report.description || "No summary available yet."}
                    </Text>
                  </Box>
                  <Flex gap={2} wrap="wrap">
                    {report.category ? <Badge colorScheme="red">{report.category}</Badge> : null}
                    {report.dataset ? <Badge>{report.dataset}</Badge> : null}
                    <Badge colorScheme={report.defaultViewMode === "static" ? "orange" : "green"}>
                      {report.defaultViewMode}
                    </Badge>
                  </Flex>
                </Flex>
              </Box>
            ))
          ) : (
            <Text color="gray.600">No reports are available yet.</Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
