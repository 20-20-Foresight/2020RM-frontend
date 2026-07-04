import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import {
  ReportApiError,
  createReportList,
  loadReportById,
  loadReportPreview,
  loadReportRunById,
  runReport,
  setReportFavorite
} from "../models/reports.server";

function readStringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function readDateInputValue(value) {
  const normalized = readStringValue(value);
  if (!normalized) {
    return "";
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function resolveDatePreset(preset, now = new Date()) {
  const normalized = readStringValue(preset).toLowerCase();
  const todayStart = startOfUtcDay(now);
  const todayEnd = endOfUtcDay(now);

  if (!normalized || normalized === "last_30_days") {
    const start = new Date(todayStart);
    start.setUTCDate(start.getUTCDate() - 29);
    return { from: start, to: todayEnd };
  }
  if (normalized === "last_7_days") {
    const start = new Date(todayStart);
    start.setUTCDate(start.getUTCDate() - 6);
    return { from: start, to: todayEnd };
  }
  if (normalized === "last_90_days") {
    const start = new Date(todayStart);
    start.setUTCDate(start.getUTCDate() - 89);
    return { from: start, to: todayEnd };
  }
  if (normalized === "this_month") {
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)),
      to: todayEnd
    };
  }

  return { from: todayStart, to: todayEnd };
}

function buildRuntimeFilters(definition, searchParams) {
  const descriptors = Array.isArray(definition?.runtimeFilters) ? definition.runtimeFilters : [];
  const runtimeFilters = {};

  descriptors.forEach((descriptor) => {
    const key = readStringValue(descriptor?.key);
    if (!key) {
      return;
    }

    if (descriptor.type === "date_range") {
      const from = readStringValue(searchParams.get(`${key}_from`));
      const to = readStringValue(searchParams.get(`${key}_to`));
      if (from || to) {
        runtimeFilters[key] = {
          from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : null,
          to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null
        };
        return;
      }

      const resolved = resolveDatePreset(
        descriptor.defaultPreset || definition?.datePolicy?.defaultPreset || "last_30_days"
      );
      runtimeFilters[key] = {
        from: resolved.from.toISOString(),
        to: resolved.to.toISOString()
      };
      return;
    }

    const value = readStringValue(searchParams.get(key));
    if (value) {
      runtimeFilters[key] = value;
    }
  });

  return runtimeFilters;
}

function buildRuntimeFilterQueryPairs(definition, runtimeFilters) {
  const descriptors = Array.isArray(definition?.runtimeFilters) ? definition.runtimeFilters : [];
  const pairs = [];

  descriptors.forEach((descriptor) => {
    const key = readStringValue(descriptor?.key);
    if (!key) {
      return;
    }

    const value = runtimeFilters[key];
    if (descriptor.type === "date_range" && value && typeof value === "object") {
      const from = readDateInputValue(value.from);
      const to = readDateInputValue(value.to);
      if (from) {
        pairs.push([`${key}_from`, from]);
      }
      if (to) {
        pairs.push([`${key}_to`, to]);
      }
      return;
    }

    if (typeof value === "string" && value.trim()) {
      pairs.push([key, value.trim()]);
    }
  });

  return pairs;
}

function readRuntimeFiltersFromFormData(formData) {
  const runtimeFilters = {};

  for (const [key, rawValue] of formData.entries()) {
    const value = readStringValue(rawValue);
    if (!value) {
      continue;
    }

    if (["intent", "favorite", "runId"].includes(key)) {
      continue;
    }

    if (key.endsWith("_from")) {
      const base = key.slice(0, -5);
      runtimeFilters[base] = runtimeFilters[base] || {};
      runtimeFilters[base].from = new Date(`${value}T00:00:00.000Z`).toISOString();
      continue;
    }

    if (key.endsWith("_to")) {
      const base = key.slice(0, -3);
      runtimeFilters[base] = runtimeFilters[base] || {};
      runtimeFilters[base].to = new Date(`${value}T23:59:59.999Z`).toISOString();
      continue;
    }

    runtimeFilters[key] = value;
  }

  return runtimeFilters;
}

function buildRedirectUrl(requestUrl, definition, updates = {}) {
  const url = new URL(requestUrl);
  if (updates.clearSearch === true) {
    url.search = "";
  }

  if (updates.runtimeFilters) {
    const descriptors = Array.isArray(definition?.runtimeFilters) ? definition.runtimeFilters : [];
    descriptors.forEach((descriptor) => {
      const key = readStringValue(descriptor?.key);
      if (!key) {
        return;
      }

      url.searchParams.delete(key);
      url.searchParams.delete(`${key}_from`);
      url.searchParams.delete(`${key}_to`);
    });

    buildRuntimeFilterQueryPairs(definition, updates.runtimeFilters).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  Object.entries(updates.params || {}).forEach(([key, value]) => {
    if (value == null || value === "") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}?${url.searchParams.toString()}`.replace(/\?$/, "");
}

function buildReportPath(reportId, definition, runtimeFilters, params = {}) {
  const searchParams = new URLSearchParams();
  buildRuntimeFilterQueryPairs(definition, runtimeFilters).forEach(([key, value]) => {
    searchParams.set(key, value);
  });

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") {
      searchParams.delete(key);
      return;
    }
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `/reports/${reportId}?${query}` : `/reports/${reportId}`;
}

function buildFullExportPath(reportId, definition, runtimeFilters, params = {}) {
  const searchParams = new URLSearchParams();
  buildRuntimeFilterQueryPairs(definition, runtimeFilters).forEach(([key, value]) => {
    searchParams.set(key, value);
  });

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") {
      searchParams.delete(key);
      return;
    }
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query
    ? `/api/rest/reports/${reportId}/export.csv?${query}`
    : `/api/rest/reports/${reportId}/export.csv`;
}

export async function loader({ request, params }) {
  const detail = await loadReportById({
    request,
    id: params.reportId
  });

  if (!detail?.report) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const definition = detail.currentDefinition?.definition || {};
  const runtimeFilters = buildRuntimeFilters(definition, url.searchParams);
  const currentPage = Math.max(1, readInteger(url.searchParams.get("page")) || 1);
  const requestedRunId = readStringValue(url.searchParams.get("runId"));
  let selectedRun = detail.latestRun;

  if (requestedRunId) {
    selectedRun = await loadReportRunById({
      request,
      id: requestedRunId
    });
  }

  const interactiveLimit = Number(definition?.limits?.interactiveRowLimit || 100);
  const activePageKey =
    readStringValue(url.searchParams.get("pageKey")) ||
    (Array.isArray(selectedRun?.pages) ? readStringValue(selectedRun.pages[0]?.pageKey) : "");
  let preview = null;
  if (
    selectedRun?.status === "completed" &&
    (selectedRun?.outputMode === "interactive" || detail.report?.defaultViewMode === "interactive")
  ) {
    preview = await loadReportPreview({
      request,
      id: params.reportId,
      pageKey: activePageKey || undefined,
      runtimeFilters,
      offset: (currentPage - 1) * interactiveLimit,
      limit: interactiveLimit
    });
  }

  return json({
    detail,
    preview,
    selectedRun,
    currentPage,
    runtimeFilters,
    feedback: {
      ran: url.searchParams.get("ran") === "1",
      favorite: readStringValue(url.searchParams.get("favorite")),
      listName: readStringValue(url.searchParams.get("listName"))
    }
  });
}

export async function action({ request, params }) {
  const detail = await loadReportById({
    request,
    id: params.reportId
  });

  if (!detail?.report) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = readStringValue(formData.get("intent"));
  const definition = detail.currentDefinition?.definition || {};

  try {
    if (intent === "run") {
      const runtimeFilters = readRuntimeFiltersFromFormData(formData);
      const run = await runReport({
        request,
        id: params.reportId,
        runtimeFilters
      });

      return redirect(
        buildRedirectUrl(request.url, definition, {
          runtimeFilters,
          params: {
            runId: run?.id || null,
            page: "1",
            ran: "1",
            favorite: null,
            listName: null
          }
        })
      );
    }

    if (intent === "favorite") {
      const favorite = String(formData.get("favorite")) === "true";
      const updated = await setReportFavorite({
        request,
        id: params.reportId,
        favorite
      });

      return redirect(
        buildRedirectUrl(request.url, definition, {
          params: {
            favorite: updated?.favorite ? "1" : "0",
            ran: null
          }
        })
      );
    }

    if (intent === "create-list") {
      const list = await createReportList({
        request,
        id: params.reportId,
        runId: formData.get("runId")
      });

      return redirect(
        buildRedirectUrl(request.url, definition, {
          params: {
            listName: list?.name || "Saved report list",
            ran: null
          }
        })
      );
    }
  } catch (error) {
    if (error instanceof ReportApiError) {
      return json(
        {
          error: error.message
        },
        { status: error.statusCode || 500 }
      );
    }

    throw error;
  }

  return json(
    {
      error: "Unsupported report action."
    },
    { status: 400 }
  );
}

function RuntimeFilterFields({ definition, runtimeFilters }) {
  const descriptors = Array.isArray(definition?.runtimeFilters) ? definition.runtimeFilters : [];

  return (
    <Flex gap={4} wrap="wrap" align="end">
      {descriptors.map((descriptor) => {
        const key = readStringValue(descriptor?.key);
        if (!key) {
          return null;
        }

        if (descriptor.type === "date_range") {
          const value = runtimeFilters[key] || {};
          return (
            <Flex key={key} gap={3} wrap="wrap">
              <FormControl maxW="220px">
                <FormLabel>{descriptor.label || "From"}</FormLabel>
                <Input
                  type="date"
                  name={`${key}_from`}
                  defaultValue={readDateInputValue(value.from)}
                />
              </FormControl>
              <FormControl maxW="220px">
                <FormLabel>{descriptor.label || "To"} End</FormLabel>
                <Input
                  type="date"
                  name={`${key}_to`}
                  defaultValue={readDateInputValue(value.to)}
                />
              </FormControl>
            </Flex>
          );
        }

        return (
          <FormControl key={key} maxW="320px">
            <FormLabel>{descriptor.label || key}</FormLabel>
            <Input
              name={key}
              defaultValue={typeof runtimeFilters[key] === "string" ? runtimeFilters[key] : ""}
              placeholder={descriptor.placeholder || ""}
            />
          </FormControl>
        );
      })}
    </Flex>
  );
}

export default function ReportDetailRoute() {
  const { detail, preview, selectedRun, currentPage, runtimeFilters, feedback } = useLoaderData();
  const actionData = useActionData();
  const report = detail.report;
  const definition = detail.currentDefinition?.definition || {};
  const interactiveLimit = Number(definition?.limits?.interactiveRowLimit || 100);
  const previewPages = Array.isArray(preview?.pages) ? preview.pages : [];
  const usingPreview = previewPages.length > 0;
  const pages = usingPreview ? previewPages : Array.isArray(selectedRun?.pages) ? selectedRun.pages : [];
  const activePage = pages[0] || null;
  const snapshotExportHref =
    selectedRun || report.lastRun
      ? `/api/rest/reports/runs/${selectedRun?.id || report.lastRun?.id}/export.csv${
          activePage?.pageKey ? `?pageKey=${encodeURIComponent(activePage.pageKey)}` : ""
        }`
      : null;
  const fullExportHref = buildFullExportPath(
    report.id,
    definition,
    runtimeFilters,
    activePage?.pageKey ? { pageKey: activePage.pageKey } : {}
  );
  const totalPages =
    activePage?.limit && activePage?.totalCount
      ? Math.max(1, Math.ceil(activePage.totalCount / activePage.limit))
      : 1;
  const pageStart = activePage ? activePage.offset + 1 : 0;
  const pageEnd = activePage ? activePage.offset + activePage.rowCount : 0;

  return (
    <Stack spacing={6}>
      <Box>
        <Flex justify="space-between" align={{ base: "flex-start", lg: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="lg">{report.name}</Heading>
            <Text color="gray.600" mt={2} maxW="4xl">
              {report.description || report.summary || "No description has been added yet."}
            </Text>
          </Box>
          <Flex gap={2} wrap="wrap">
            {report.category ? <Badge colorScheme="red">{report.category}</Badge> : null}
            {report.dataset ? <Badge>{report.dataset}</Badge> : null}
            <Badge colorScheme={report.defaultViewMode === "static" ? "orange" : "green"}>
              {report.defaultViewMode}
            </Badge>
            {report.favorite ? <Badge colorScheme="yellow">favorite</Badge> : null}
          </Flex>
        </Flex>
      </Box>

      {feedback.ran ? (
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          Report run complete. The latest snapshot is loaded below.
        </Alert>
      ) : null}
      {feedback.favorite ? (
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          Favorite updated.
        </Alert>
      ) : null}
      {feedback.listName ? (
        <Alert status="success" borderRadius="lg">
          <AlertIcon />
          Created CRM list: {feedback.listName}
        </Alert>
      ) : null}
      {actionData?.error ? (
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          {actionData.error}
        </Alert>
      ) : null}

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
        <Heading size="md" mb={4}>
          Runtime Filters
        </Heading>
        <Form method="post">
          <input type="hidden" name="intent" value="run" />
          <RuntimeFilterFields definition={definition} runtimeFilters={runtimeFilters} />
          <Flex mt={4} gap={3} wrap="wrap">
            <Button type="submit" colorScheme="red">
              Run Report
            </Button>
            <Button as="a" href={fullExportHref}>
              Export Full CSV
            </Button>
            {snapshotExportHref ? (
              <Button as="a" href={snapshotExportHref}>
                Export Snapshot CSV
              </Button>
            ) : (
              <Button isDisabled>Export Snapshot CSV</Button>
            )}
            <Button as={Link} to={`/reports/${report.id}`} variant="ghost">
              Clear URL state
            </Button>
          </Flex>
        </Form>
      </Box>

      <Flex gap={3} wrap="wrap">
        <Form method="post">
          <input type="hidden" name="intent" value="favorite" />
          <input type="hidden" name="favorite" value={report.favorite ? "false" : "true"} />
          <Button type="submit" variant="outline">
            {report.favorite ? "Remove Favorite" : "Add Favorite"}
          </Button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="create-list" />
          <input type="hidden" name="runId" value={selectedRun?.id || report.lastRun?.id || ""} />
          <Button type="submit" isDisabled={!selectedRun && !report.lastRun}>Create CRM List</Button>
        </Form>
      </Flex>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
        <Heading size="md" mb={4}>
          Report Snapshot
        </Heading>
        <Text color="gray.600">
          Snapshot date: {selectedRun?.completedAt || selectedRun?.startedAt || "No run has been saved yet."}
        </Text>
        <Text color="gray.600" mt={1}>
          Status: {selectedRun?.status || "not run"} | Rows: {Number(selectedRun?.rowCount || 0).toLocaleString()}
        </Text>
      </Box>

      {pages.length ? (
        pages.map((page) => (
          <Box key={page.pageKey} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
            <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} gap={3} wrap="wrap" mb={4}>
              <Box>
                <Heading size="md">{page.pageTitle}</Heading>
                <Text color="gray.600" mt={1}>
                  {Number(page.rowCount || 0).toLocaleString()} rows in this sheet.
                </Text>
                {usingPreview ? (
                  <Text color="gray.500" mt={1}>
                    Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {Number(page.totalCount || page.rowCount || 0).toLocaleString()} rows.
                  </Text>
                ) : (
                  <Text color="gray.500" mt={1}>
                    V1 interactive view shows up to {interactiveLimit.toLocaleString()} rows per sheet.
                  </Text>
                )}
              </Box>
              <Flex gap={3} wrap="wrap" align="center">
                {usingPreview && totalPages > 1 ? (
                  <>
                    <Button
                      as={Link}
                      to={buildReportPath(report.id, definition, runtimeFilters, {
                        runId: selectedRun?.id || null,
                        page: currentPage > 1 ? currentPage - 1 : 1,
                        pageKey: page.pageKey
                      })}
                      isDisabled={currentPage <= 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Text color="gray.600">
                      Page {currentPage} of {totalPages}
                    </Text>
                    <Button
                      as={Link}
                      to={buildReportPath(report.id, definition, runtimeFilters, {
                        runId: selectedRun?.id || null,
                        page: currentPage < totalPages ? currentPage + 1 : totalPages,
                        pageKey: page.pageKey
                      })}
                      isDisabled={currentPage >= totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </>
                ) : null}
                {snapshotExportHref ? (
                  <Box as="a" href={snapshotExportHref} color="red.500">
                    Export this sheet
                  </Box>
                ) : null}
              </Flex>
            </Flex>
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    {page.columns.map((column) => (
                      <Th key={column.field}>{column.label}</Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {page.rows.map((row, index) => (
                    <Tr key={`${page.pageKey}-${index}`}>
                      {page.columns.map((column) => (
                        <Td key={`${page.pageKey}-${index}-${column.field}`}>
                          {column.field === "organization.name" && typeof row?.hidden?.["organization.id"] === "string" ? (
                            <Link to={`/organization/${encodeURIComponent(row.hidden["organization.id"])}`}>
                              {row?.visible?.[column.field] == null ? "" : String(row.visible[column.field])}
                            </Link>
                          ) : row?.visible?.[column.field] == null ? (
                            ""
                          ) : (
                            String(row.visible[column.field])
                          )}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>
        ))
      ) : (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
          <Text color="gray.600">Run the report to capture the first workbook snapshot.</Text>
        </Box>
      )}

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={6} shadow="sm">
        <Heading size="md" mb={4}>
          Recent Runs
        </Heading>
        <Stack spacing={3}>
          {detail.recentRuns.length ? (
            detail.recentRuns.map((run) => (
              <Flex key={run.id} justify="space-between" gap={3} wrap="wrap" borderTopWidth="1px" borderColor="gray.100" pt={3}>
                <Box>
                  <Link to={`/reports/${report.id}?runId=${run.id}`}>Run #{run.id}</Link>
                  <Text color="gray.600" mt={1}>
                    {run.completedAt || run.startedAt || "No timestamp"} | {run.status}
                  </Text>
                </Box>
                <Flex gap={2} wrap="wrap">
                  <Badge>{run.runType}</Badge>
                  <Badge colorScheme={run.outputMode === "static" ? "orange" : "green"}>
                    {run.outputMode}
                  </Badge>
                  {run.listName ? <Badge colorScheme="purple">{run.listName}</Badge> : null}
                </Flex>
              </Flex>
            ))
          ) : (
            <Text color="gray.600">No recent runs yet.</Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
