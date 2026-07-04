import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Stack,
  Text
} from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { loadReportsList } from "../models/reports.server";

function readStringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function loader({ request }) {
  const url = new URL(request.url);
  const category = readStringValue(url.searchParams.get("category"));
  const view = readStringValue(url.searchParams.get("view"));
  const q = readStringValue(url.searchParams.get("q"));
  const payload = await loadReportsList({
    request,
    category: category || undefined,
    view: view || undefined,
    q: q || undefined
  });

  return json({
    ...payload,
    filters: {
      category,
      view,
      q
    }
  });
}

export default function ReportsListRoute() {
  const data = useLoaderData();

  return (
    <Stack spacing={6}>
      <Box>
        <Heading size="lg">Report List</Heading>
        <Text color="gray.600" mt={2}>
          Search saved reports, review categories, and open the current workbook snapshot for each definition.
        </Text>
      </Box>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={5} shadow="sm">
        <Form method="get">
          <Flex gap={4} wrap="wrap" align="end">
            <FormControl maxW={{ base: "100%", md: "280px" }}>
              <FormLabel>Search</FormLabel>
              <Input name="q" defaultValue={data.filters.q} placeholder="Report name or summary" />
            </FormControl>
            <FormControl maxW={{ base: "100%", md: "280px" }}>
              <FormLabel>Category</FormLabel>
              <Select name="category" defaultValue={data.filters.category}>
                <option value="">All categories</option>
                <option value="Scheduled Reports">Scheduled Reports</option>
                <option value="Status and Review">Status and Review</option>
              </Select>
            </FormControl>
            <FormControl maxW={{ base: "100%", md: "220px" }}>
              <FormLabel>View</FormLabel>
              <Select name="view" defaultValue={data.filters.view}>
                <option value="">All reports</option>
                <option value="my">My Reports</option>
                <option value="favorites">Favorites</option>
              </Select>
            </FormControl>
            <Button type="submit" colorScheme="red">
              Apply
            </Button>
          </Flex>
        </Form>
      </Box>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md">Reports</Heading>
          <Text color="gray.600">{data.reports.length} results</Text>
        </Flex>
        <Stack spacing={4}>
          {data.reports.length ? (
            data.reports.map((report) => (
              <Box key={report.id} borderTopWidth="1px" borderColor="gray.100" pt={4}>
                <Flex justify="space-between" gap={4} wrap="wrap">
                  <Box maxW="4xl">
                    <Link to={`/reports/${report.id}`}>{report.name}</Link>
                    <Text color="gray.600" mt={1}>
                      {report.summary || report.description || "No summary available yet."}
                    </Text>
                    <Text color="gray.500" fontSize="sm" mt={2}>
                      Last run: {report.lastRun?.completedAt || report.lastRun?.startedAt || "Never"}
                    </Text>
                  </Box>
                  <Flex gap={2} wrap="wrap" align="flex-start">
                    {report.category ? <Badge colorScheme="red">{report.category}</Badge> : null}
                    {report.dataset ? <Badge>{report.dataset}</Badge> : null}
                    <Badge colorScheme={report.defaultViewMode === "static" ? "orange" : "green"}>
                      {report.defaultViewMode}
                    </Badge>
                    {report.favorite ? <Badge colorScheme="yellow">favorite</Badge> : null}
                    {report.schedule?.enabled ? (
                      <Badge colorScheme="purple">{report.schedule.frequency || "scheduled"}</Badge>
                    ) : null}
                  </Flex>
                </Flex>
              </Box>
            ))
          ) : (
            <Text color="gray.600">No reports match the current filters.</Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
