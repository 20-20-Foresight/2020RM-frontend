import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Icon,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Skeleton,
  SkeletonText,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  VStack,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import { Form, Link, useNavigation, useRevalidator } from "@remix-run/react";
import {
  MdArrowBack,
  MdDelete,
  MdPause,
  MdPlayArrow,
  MdRefresh,
  MdSave,
  MdSearch
} from "react-icons/md";
import { SurfaceCard } from "./ui/atoms/SurfaceCard";
import { SectionLabel } from "./ui/atoms/SectionLabel";
import OrganizationListImportDrawer from "./OrganizationListImportDrawer";
import ListFinderDrawer from "./ui/organisms/ListFinderDrawer";
import { buildFeedPreviewSignature } from "../models/feed-preview-signature.mjs";
import { getFeedSourceColor, getFeedSourceLabel, FEED_SOURCES } from "../models/feed-sources.mjs";
import { readFeedFormIntent } from "../models/feed-form-intent.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSourceListSelection(settings = {}) {
  if (!settings || typeof settings !== "object") {
    return { uuid: "", name: "" };
  }

  return {
    uuid:
      settings.sourceListUUID ||
      settings.sourceListUuid ||
      settings.sourceList?.uuid ||
      "",
    name:
      settings.sourceListName ||
      settings.sourceList?.name ||
      ""
  };
}

function writeSourceListSelection(settings = {}, sourceList = {}) {
  const uuid = String(sourceList.uuid || "").trim();
  const name = String(sourceList.name || "").trim();
  return {
    ...settings,
    sourceListUUID: uuid,
    sourceListName: name,
    sourceList: {
      ...(settings.sourceList || {}),
      uuid,
      name
    }
  };
}

function clearSourceListSelection(settings = {}) {
  return writeSourceListSelection(settings, {
    uuid: "",
    name: ""
  });
}

function filterOrganizationLists(lists = []) {
  return (Array.isArray(lists) ? lists : []).filter((list) => {
    const listTypeSlug = String(list?.listTypeSlug || list?.metadata?.listTypeSlug || "").toLowerCase();
    const listSubTypeSlug = String(
      list?.listSubTypeSlug || list?.metadata?.listSubTypeSlug || ""
    ).toLowerCase();
    const subjectType = String(list?.subjectType || list?.metadata?.subjectType || "").toLowerCase();
    if (listTypeSlug && listTypeSlug !== "list") {
      return false;
    }
    if (subjectType) {
      return subjectType === "organization" || subjectType === "mixed";
    }
    if (listSubTypeSlug) {
      return listSubTypeSlug === "organization";
    }
    return true;
  });
}

function isTerminalRunStatus(status) {
  return ["completed", "failed"].includes(String(status || "").trim().toLowerCase());
}

function formatFeedNameTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${year}`;
}

function formatFilterSummaryValue(filterDef, value) {
  if (filterDef.type === "checkbox") {
    const enabled =
      value === true ||
      value === "true" ||
      value === 1 ||
      value === "1" ||
      value === "on";
    if (!enabled) {
      return null;
    }
    return filterDef.summaryValue || filterDef.label;
  }
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }
  if (typeof filterDef.summaryFormatter === "function") {
    return filterDef.summaryFormatter(normalized);
  }
  if (filterDef.summaryLabel) {
    return `${normalized} ${filterDef.summaryLabel}`.trim();
  }
  return filterDef.optionLabels?.[normalized] || normalized;
}

function summarizeFilterValues(sourceKey, settings = {}) {
  const sourceConfig = FEED_SOURCES[sourceKey];
  if (!sourceConfig?.filters) {
    return [];
  }
  const values = [];
  const deferredValues = [];
  Object.values(sourceConfig.filters).forEach((filterDef) => {
    const currentValue = settings?.[filterDef.settingsKey];
    if (filterDef.type === "tags" || filterDef.type === "multiselect") {
      const list = Array.isArray(currentValue) ? currentValue : [];
      list.forEach((entry) => {
        const summaryValue = formatFilterSummaryValue(filterDef, entry);
        if (!summaryValue) return;
        if (filterDef.summaryLast) {
          deferredValues.push(summaryValue);
          return;
        }
        if (values.length >= 2) return;
        values.push(summaryValue);
      });
      return;
    }
    if (filterDef.type === "range" && currentValue && typeof currentValue === "object") {
      const min = currentValue.min ?? null;
      const max = currentValue.max ?? null;
      if (min != null || max != null) {
        values.push(
          `${min != null ? min : "any"}-${max != null ? max : "any"}${filterDef.unit ? ` ${filterDef.unit}` : ""}`
        );
      }
      return;
    }
    const summaryValue = formatFilterSummaryValue(filterDef, currentValue);
    if (summaryValue) {
      if (filterDef.summaryLast) {
        deferredValues.push(summaryValue);
        return;
      }
      if (values.length < 2) {
        values.push(summaryValue);
      }
    }
  });
  return [...values.slice(0, 2), ...deferredValues.slice(0, 1)];
}

function buildSuggestedFeedName(sourceKey, settings = {}, timestamp = new Date()) {
  const sourceLabel = getFeedSourceLabel(sourceKey || "search");
  const summary = summarizeFilterValues(sourceKey, settings);
  const parts = [sourceLabel];
  if (summary.length) {
    parts.push(summary.join(", "));
  }
  parts.push(formatFeedNameTimestamp(timestamp));
  return parts.join(" - ");
}

// ---------------------------------------------------------------------------
// Multi-select filter (checkbox grid)
// ---------------------------------------------------------------------------

function MultiSelectFilter({ filterDef, value = [], onChange }) {
  const { options = [], optionLabels = {} } = filterDef;

  return (
    <CheckboxGroup
      colorScheme={value.length ? "blue" : "gray"}
      value={value}
      onChange={onChange}
    >
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={1.5}>
        {options.map((opt) => (
          <Checkbox key={opt} value={opt} size="sm">
            <Text fontSize="sm">{optionLabels[opt] || opt}</Text>
          </Checkbox>
        ))}
      </SimpleGrid>
    </CheckboxGroup>
  );
}

// ---------------------------------------------------------------------------
// Range filter (min/max number inputs)
// ---------------------------------------------------------------------------

function RangeFilter({ filterDef, value = {}, onChange }) {
  const { unit } = filterDef;

  return (
    <HStack spacing={3} align="center">
      <FormControl>
        <FormLabel fontSize="xs" color="gray.600" mb={1}>
          Min{unit ? ` (${unit})` : ""}
        </FormLabel>
        <NumberInput
          value={value.min ?? ""}
          min={0}
          onChange={(_, num) => onChange({ ...value, min: isNaN(num) ? undefined : num })}
          size="sm"
        >
          <NumberInputField placeholder="No minimum" />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <Text color="gray.400" pt={5}>–</Text>
      <FormControl>
        <FormLabel fontSize="xs" color="gray.600" mb={1}>
          Max{unit ? ` (${unit})` : ""}
        </FormLabel>
        <NumberInput
          value={value.max ?? ""}
          min={0}
          onChange={(_, num) => onChange({ ...value, max: isNaN(num) ? undefined : num })}
          size="sm"
        >
          <NumberInputField placeholder="No maximum" />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
    </HStack>
  );
}

// ---------------------------------------------------------------------------
// Tags filter (free text tags input)
// ---------------------------------------------------------------------------

function TagsFilter({ filterDef, value = [], onChange }) {
  const [inputValue, setInputValue] = useState("");

  function addTag(raw) {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function removeTag(tag) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <VStack align="stretch" spacing={2}>
      {value.length > 0 && (
        <Wrap spacing={1.5}>
          {value.map((tag) => (
            <WrapItem key={tag}>
              <Badge
                colorScheme="blue"
                borderRadius="full"
                px={2.5}
                py={1}
                display="inline-flex"
                alignItems="center"
                gap={1.5}
              >
                <Text as="span">{tag}</Text>
                <Button
                  type="button"
                  variant="unstyled"
                  minW="auto"
                  h="auto"
                  lineHeight="1"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </Button>
              </Badge>
            </WrapItem>
          ))}
        </Wrap>
      )}
      <Input
        size="sm"
        placeholder={filterDef.placeholder || "Type and press Enter to add"}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue);
            setInputValue("");
          }
        }}
      />
      {filterDef.description && (
        <Text fontSize="xs" color="gray.400">
          {filterDef.description}
        </Text>
      )}
    </VStack>
  );
}

function TextFilter({ filterDef, value = "", onChange }) {
  return (
    <Input
      size="sm"
      value={value || ""}
      placeholder={filterDef.placeholder || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function NumberFilter({ filterDef, value = "", onChange }) {
  return (
    <NumberInput
      value={value ?? ""}
      min={filterDef.min ?? 0}
      max={filterDef.max}
      onChange={(raw) => onChange(raw)}
      size="sm"
    >
      <NumberInputField placeholder={filterDef.placeholder || ""} />
      <NumberInputStepper>
        <NumberIncrementStepper />
        <NumberDecrementStepper />
      </NumberInputStepper>
    </NumberInput>
  );
}

function PreviewLoadingPanel() {
  return (
    <SurfaceCard>
      <VStack align="stretch" spacing={4}>
        <Box>
          <SectionLabel>Preview Results</SectionLabel>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Running live source preview.
          </Text>
        </Box>
        <VStack align="stretch" spacing={2}>
          {Array.from({ length: 5 }, (_value, index) => (
            <Box
              key={index}
              px={3}
              py={3}
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              bg="gray.50"
            >
              <Skeleton h="14px" w="45%" mb={2} />
              <SkeletonText noOfLines={2} spacing="2" skeletonHeight="10px" />
            </Box>
          ))}
        </VStack>
      </VStack>
    </SurfaceCard>
  );
}

function FeedPreviewPanel({ preview, previewFailed = false, previewError = null }) {
  if (!preview && !previewFailed) {
    return null;
  }

  const rows = Array.isArray(preview?.results) ? preview.results : [];
  const showSourceTotalCount =
    Number.isFinite(Number(preview?.sourceTotalCount)) &&
    Number(preview?.sourceTotalCount) > rows.length;

  return (
    <SurfaceCard>
      <VStack align="stretch" spacing={4}>
        <Box>
          <Box>
            <SectionLabel>Preview Results</SectionLabel>
            <Text fontSize="sm" color="gray.500" mt={1}>
              Live source preview before queueing.
            </Text>
            {previewFailed ? (
              <Alert status="warning" mt={3} borderRadius="lg">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  {previewError || "No records found for the current filters."}
                </AlertDescription>
              </Alert>
            ) : null}
            {showSourceTotalCount ? (
              <Text fontSize="xs" color="gray.500" mt={1}>
                Source reports about {Number(preview?.sourceTotalCount).toLocaleString()} total matches.
              </Text>
            ) : null}
          </Box>
        </Box>
        {rows.length > 0 ? (
          <VStack align="stretch" spacing={2}>
            {rows.map((row, index) => (
              <Flex
                key={`${row.__feedPreview?.sourceEntityKey || row.Website || row.Name || index}`}
                justify="space-between"
                align="center"
                px={3}
                py={2.5}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="lg"
                bg={row.__feedPreview?.eligible ? "blue.50" : "gray.50"}
              >
                <Box minW={0}>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.900" noOfLines={1}>
                    {row.Name || row.name || "Unnamed company"}
                  </Text>
                  <Text fontSize="xs" color="gray.500" noOfLines={1}>
                    {row.Website || row.website || row.LinkedIn || row.linkedin || "No URL"}
                  </Text>
                  {!row.__feedPreview?.eligible && row.__feedPreview?.reason ? (
                    <Text fontSize="xs" color="gray.600" mt={1} noOfLines={2}>
                      {row.__feedPreview.reason}
                    </Text>
                  ) : null}
                </Box>
                <Badge
                  colorScheme={row.__feedPreview?.eligible ? "blue" : "gray"}
                  fontSize="xs"
                >
                  {row.__feedPreview?.eligible ? "queueable" : "skip"}
                </Badge>
              </Flex>
            ))}
          </VStack>
        ) : (
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              No records found for the current filters.
            </AlertDescription>
          </Alert>
        )}
      </VStack>
    </SurfaceCard>
  );
}

function FeedRunActivityPanel({ initialRun }) {
  const revalidator = useRevalidator();
  const [run, setRun] = useState(initialRun || null);

  useEffect(() => {
    setRun(initialRun || null);
  }, [initialRun?.id, initialRun?.status, initialRun?.queued_count]);

  useEffect(() => {
    if (!run?.id || isTerminalRunStatus(run.status)) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;

    async function poll() {
      try {
        const response = await fetch(`/api/rest/feeds/runs/${encodeURIComponent(String(run.id))}`, {
          headers: {
            accept: "application/json"
          }
        });
        const payload = response.ok ? await response.json() : null;
        const nextRun = payload?.run || null;
        if (cancelled || !nextRun) {
          return;
        }
        setRun(nextRun);
        if (isTerminalRunStatus(nextRun.status)) {
          revalidator.revalidate();
          return;
        }
      } catch (_error) {
        // Keep polling; transient backend failures should not break the panel.
      }

      if (!cancelled) {
        timeoutId = window.setTimeout(poll, 2000);
      }
    }

    timeoutId = window.setTimeout(poll, 1500);

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [revalidator, run?.id, run?.status]);

  if (!run) {
    return null;
  }

  const status = String(run.status || "pending").toLowerCase();
  const color =
    status === "completed" ? "green" : status === "failed" ? "red" : "blue";

  return (
    <Alert status={status === "failed" ? "error" : "info"} borderRadius="xl">
      <AlertIcon />
      <Box flex="1">
        <HStack spacing={2} align="center" mb={1}>
          {status !== "completed" && status !== "failed" ? (
            <Spinner size="xs" thickness="2px" color={`${color}.500`} />
          ) : null}
          <Text fontSize="sm" fontWeight="semibold">
            {run.run_type === "refresh" ? "Refresh run" : "Saved-search run"} #{run.id}
          </Text>
          <Badge colorScheme={color} fontSize="xs">
            {run.status}
          </Badge>
        </HStack>
        <AlertDescription fontSize="sm">
          {status === "completed"
            ? `${run.queued_count || 0} companies queued from ${run.result_count || 0} results.`
            : status === "failed"
              ? run.error || "The saved-search run failed."
              : "Working through source query and queueing eligible companies."}
        </AlertDescription>
      </Box>
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Source filter editor
// ---------------------------------------------------------------------------

function SourceFiltersCard({
  sourceKey,
  settings,
  onSettingsChange,
  isPreviewing = false,
  availableLists = [],
  onOpenListFinder,
}) {
  const sourceConfig = FEED_SOURCES[sourceKey];
  const color = getFeedSourceColor(sourceKey);

  if (!sourceConfig || !sourceConfig.filters) {
    return null;
  }

  const filterEntries = Object.entries(sourceConfig.filters);

  return (
    <SurfaceCard>
      <VStack align="stretch" spacing={4}>
        <HStack spacing={2}>
          <SectionLabel>Source Filters</SectionLabel>
          <Badge colorScheme={color} fontSize="xs">
            {getFeedSourceLabel(sourceKey)}
          </Badge>
        </HStack>
        <Text fontSize="sm" color="gray.500">
          {sourceConfig.description}
        </Text>
        <Divider />
        {filterEntries.map(([filterKey, filterDef], index) => {
          const currentValue =
            settings[filterDef.settingsKey] ??
            (filterDef.type === "range"
              ? {}
              : filterDef.type === "tags" || filterDef.type === "multiselect"
                ? []
                : filterDef.type === "checkbox"
                  ? false
                : "");

          function handleFilterChange(newVal) {
            onSettingsChange({
              ...settings,
              [filterDef.settingsKey]: newVal
            });
          }

          return (
            <Box key={filterKey}>
              {index > 0 && <Divider mb={4} />}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                  {filterDef.label}
                </FormLabel>
                {filterDef.type === "multiselect" && (
                  <MultiSelectFilter
                    filterDef={filterDef}
                    value={currentValue}
                    onChange={handleFilterChange}
                  />
                )}
                {filterDef.type === "range" && (
                  <RangeFilter
                    filterDef={filterDef}
                    value={currentValue}
                    onChange={handleFilterChange}
                  />
                )}
                {filterDef.type === "tags" && (
                  <TagsFilter
                    filterDef={filterDef}
                    value={currentValue}
                    onChange={handleFilterChange}
                  />
                )}
                {filterDef.type === "text" && (
                  <TextFilter
                    filterDef={filterDef}
                    value={currentValue}
                    onChange={handleFilterChange}
                  />
                )}
                {filterDef.type === "number" && (
                  <NumberFilter
                    filterDef={filterDef}
                    value={currentValue}
                    onChange={handleFilterChange}
                  />
                )}
                {filterDef.type === "checkbox" && (
                  <Checkbox
                    isChecked={
                      currentValue === true ||
                      currentValue === "true" ||
                      currentValue === 1 ||
                      currentValue === "1" ||
                      currentValue === "on"
                    }
                    onChange={(event) => handleFilterChange(event.target.checked)}
                  >
                    <Text fontSize="sm" color="gray.700">
                      {filterDef.checkboxLabel || filterDef.label}
                    </Text>
                  </Checkbox>
                )}
                {filterDef.type === "listFinder" && (
                  <VStack align="stretch" spacing={3}>
                    {readSourceListSelection(settings).name ? (
                      <Box
                        px={3}
                        py={3}
                        borderWidth="1px"
                        borderColor="gray.200"
                        borderRadius="lg"
                        bg="gray.50"
                      >
                        <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                          {readSourceListSelection(settings).name}
                        </Text>
                        <Text fontSize="xs" color="gray.500" mt={0.5}>
                          {Number.isFinite(Number(filterOrganizationLists(availableLists).find(
                            (list) => String(list?.uuid || "") === readSourceListSelection(settings).uuid
                          )?.memberCount))
                            ? `${Number(filterOrganizationLists(availableLists).find(
                                (list) => String(list?.uuid || "") === readSourceListSelection(settings).uuid
                              )?.memberCount).toLocaleString()} organizations`
                            : "Selected organization list"}
                        </Text>
                      </Box>
                    ) : (
                      <Alert status="info" borderRadius="lg">
                        <AlertIcon />
                        <AlertDescription fontSize="sm">
                          Choose an existing list or upload a CSV/XLSX file to create one.
                        </AlertDescription>
                      </Alert>
                    )}
                    <HStack spacing={3} flexWrap="wrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        colorScheme="blue"
                        flex="1"
                        minW={{ base: "100%", sm: "220px" }}
                        onClick={onOpenListFinder}
                      >
                        {readSourceListSelection(settings).uuid ? "Change List" : "Find List"}
                      </Button>
                      {readSourceListSelection(settings).uuid ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          colorScheme="gray"
                          onClick={() => onSettingsChange(clearSourceListSelection(settings))}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </HStack>
                  </VStack>
                )}
                {filterDef.description && filterDef.type !== "tags" && (
                  <FormHelperText fontSize="xs" mt={1.5}>
                    {filterDef.description}
                  </FormHelperText>
                )}
              </FormControl>
            </Box>
          );
        })}
        <Divider />
        <Flex justify="flex-end">
          <Button
            type="submit"
            name="_action"
            value="preview"
            variant="outline"
            size="sm"
            leftIcon={<MdSearch />}
            isLoading={isPreviewing}
          >
            Preview Search
          </Button>
        </Flex>
      </VStack>
    </SurfaceCard>
  );
}

function SearchConfigurationCard({
  isNew,
  source,
  name,
  onNameChange,
  suggestedFeedName,
  description,
  onDescriptionChange,
  reason,
  onReasonChange,
  priority,
  onPriorityChange,
  recordsLimit,
  onRecordsLimitChange,
  crmAgeDays,
  onCrmAgeDaysChange,
  canCreateFromPreview,
  lastSuccessfulPreviewSignature,
  isSaving,
}) {
  return (
    <SurfaceCard>
      <VStack align="stretch" spacing={4}>
        <SectionLabel>Search Configuration</SectionLabel>
        <Text fontSize="sm" color="gray.500">
          {isNew
            ? "Name the saved search and set the queueing controls after a successful preview."
            : "Update the saved search name and queueing controls."}
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isRequired>
            <FormLabel fontSize="sm">Feed Name</FormLabel>
            <Input
              name="name"
              value={name}
              onChange={onNameChange}
              placeholder={suggestedFeedName || "Name this saved search"}
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Priority</FormLabel>
            <NumberInput
              value={priority}
              min={0}
              max={100}
              onChange={onPriorityChange}
              size="sm"
            >
              <NumberInputField
                name="priority"
                placeholder="10"
              />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <FormHelperText fontSize="xs">
              Higher-priority saved searches win when companies overlap.
            </FormHelperText>
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel fontSize="sm">Description</FormLabel>
          <Textarea
            name="description"
            value={description}
            onChange={onDescriptionChange}
            placeholder="Optional — describe the purpose of this feed"
            size="sm"
            rows={2}
            resize="none"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea
            name="reason"
            value={reason}
            onChange={onReasonChange}
            placeholder="Optional — maps to Salesforce Request Reason"
            size="sm"
            rows={2}
            resize="none"
          />
          <FormHelperText fontSize="xs">
            Used for the Salesforce Request Reason field on queued research requests.
          </FormHelperText>
        </FormControl>

        <SimpleGrid columns={{ base: 1, sm: source === "list" ? 1 : 2, md: source === "list" ? 1 : 2 }} spacing={4}>
          {source !== "list" ? (
            <FormControl>
              <FormLabel fontSize="sm">Records To Queue</FormLabel>
              <NumberInput
                value={recordsLimit}
                min={1}
                max={10000}
                onChange={onRecordsLimitChange}
                size="sm"
              >
                <NumberInputField
                  name="records_limit"
                  placeholder="No limit"
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormHelperText fontSize="xs">
                Max companies to send into research from one refresh.
              </FormHelperText>
            </FormControl>
          ) : null}

          <FormControl>
            <FormLabel fontSize="sm">Minimum CRM Age (days)</FormLabel>
            <NumberInput
              value={crmAgeDays}
              min={1}
              onChange={onCrmAgeDaysChange}
              size="sm"
            >
              <NumberInputField
                name="crm_age_days"
                placeholder="No minimum age"
              />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <FormHelperText fontSize="xs">
              Skip companies ingested within this freshness window.
            </FormHelperText>
          </FormControl>
        </SimpleGrid>

        {isNew && !canCreateFromPreview ? (
          <Alert status="info" borderRadius="lg">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              {lastSuccessfulPreviewSignature
                ? "Run preview again after changing search settings."
                : "Run a preview that returns records before creating this saved search."}
            </AlertDescription>
          </Alert>
        ) : null}

        {isNew && canCreateFromPreview ? (
          <Button
            type="submit"
            colorScheme="blue"
            size="sm"
            leftIcon={<MdSave />}
            isLoading={isSaving}
            alignSelf="flex-start"
          >
            Create & Queue Search
          </Button>
        ) : null}
      </VStack>
    </SurfaceCard>
  );
}

function FeedLifecycleControlsCard({
  feed,
  isRefreshing = false,
  isTogglingPause = false,
  showRefresh = true,
}) {
  return (
    <SurfaceCard>
      <VStack align="stretch" spacing={3}>
        <SectionLabel>Search Controls</SectionLabel>
        <Text fontSize="sm" color="gray.500">
          Pause, refresh, or remove this saved search.
        </Text>
        <HStack spacing={3} flexWrap="wrap">
          <Button
            type="submit"
            name="_action"
            value={feed.enabled === false ? "resume" : "pause"}
            variant="outline"
            size="sm"
            colorScheme={feed.enabled === false ? "green" : "orange"}
            leftIcon={feed.enabled === false ? <MdPlayArrow /> : <MdPause />}
            isLoading={isTogglingPause}
          >
            {feed.enabled === false ? "Resume Search" : "Pause Search"}
          </Button>
          {showRefresh ? (
            <Button
              type="submit"
              name="_action"
              value="refresh"
              colorScheme="blue"
              variant="solid"
              size="sm"
              leftIcon={<MdRefresh />}
              isLoading={isRefreshing}
            >
              Refresh Search
            </Button>
          ) : null}
          <Button
            type="submit"
            name="_action"
            value="delete"
            variant="ghost"
            size="sm"
            colorScheme="red"
            leftIcon={<MdDelete />}
            onClick={(e) => {
              if (!confirm(`Delete "${feed.name}"? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            Delete
          </Button>
        </HStack>
      </VStack>
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// Editor form body (shared between new/edit)
// ---------------------------------------------------------------------------

function FeedEditorForm({ feed, isNew, actionData, availableLists = [] }) {
  const navigation = useNavigation();
  const previewRef = useRef(null);
  const generatedNameTimestampRef = useRef(new Date());
  const [name, setName] = useState(feed.name || "");
  const [source, setSource] = useState(feed.source || "");
  const [description, setDescription] = useState(feed.description || "");
  const [reason, setReason] = useState(feed.reason || "");
  const [priority, setPriority] = useState(String(feed.priority ?? 10));
  const [recordsLimit, setRecordsLimit] = useState(String(feed.records_limit ?? ""));
  const [crmAgeDays, setCrmAgeDays] = useState(String(feed.crm_age_days ?? ""));
  const [settings, setSettings] = useState(
    feed.settings || {}
  );
  const [listOptions, setListOptions] = useState(filterOrganizationLists(availableLists));
  const [isListFinderOpen, setIsListFinderOpen] = useState(false);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [tone, setTone] = useState("default");
  const [isNameCustomized, setIsNameCustomized] = useState(!isNew ? true : Boolean(feed.name));

  const navigationIntent = readFeedFormIntent(navigation.formData);
  const isSaving =
    navigation.state !== "idle" &&
    (navigationIntent === "create" || navigationIntent === "update");
  const isPreviewing =
    navigation.state !== "idle" &&
    navigationIntent === "preview";
  const isRefreshing =
    navigation.state !== "idle" &&
    navigationIntent === "refresh";
  const isTogglingPause =
    navigation.state !== "idle" &&
    (navigationIntent === "pause" || navigationIntent === "resume");
  const suggestedFeedName = isNew
    ? buildSuggestedFeedName(source, settings, generatedNameTimestampRef.current)
    : "";
  const currentPreviewSignature = buildFeedPreviewSignature({
    source,
    records_limit: source === "list" ? "" : recordsLimit,
    crm_age_days: crmAgeDays,
    settings,
  });
  const lastSuccessfulPreviewSignature =
    typeof actionData?.previewSignature === "string" ? actionData.previewSignature : "";
  const hasPreviewRows =
    Number(actionData?.preview?.resultCount || 0) > 0 &&
    Array.isArray(actionData?.preview?.results) &&
    actionData.preview.results.length > 0;
  const canCreateFromPreview =
    isNew &&
    !actionData?.error &&
    !!lastSuccessfulPreviewSignature &&
    lastSuccessfulPreviewSignature === currentPreviewSignature &&
    hasPreviewRows;
  const shouldShowPreviewPanel =
    !!source &&
    (isPreviewing ||
      !!actionData?.preview ||
      (navigation.state === "idle" && !!actionData?.error && actionData?.intent === "preview"));
  const runStatus = String(actionData?.run?.status || feed.last_run_status || "").toLowerCase();
  const hasActiveRun = !isNew && (runStatus === "pending" || runStatus === "running");

  useEffect(() => {
    if (navigation.state === "idle" && tone === "saving") {
      setTone("default");
    }
  }, [navigation.state, tone]);

  useEffect(() => {
    if (!isNew || isNameCustomized) {
      return;
    }
    setName(suggestedFeedName);
  }, [isNew, isNameCustomized, suggestedFeedName]);

  useEffect(() => {
    setListOptions(filterOrganizationLists(availableLists));
  }, [availableLists]);

  useEffect(() => {
    if (!shouldShowPreviewPanel || !previewRef.current) {
      return;
    }
    previewRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [shouldShowPreviewPanel, isPreviewing, actionData?.preview, actionData?.error]);

  useEffect(() => {
    if (source !== "list" && recordsLimit === "") {
      setRecordsLimit(String(feed.records_limit ?? 100));
      return;
    }

    if (source === "list" && recordsLimit !== "") {
      setRecordsLimit("");
    }
  }, [feed.records_limit, recordsLimit, source]);

  function handleSubmit(event) {
    const submitterIntent =
      typeof event?.nativeEvent?.submitter?.value === "string"
        ? event.nativeEvent.submitter.value.trim()
        : "";
    if (submitterIntent === "create" || submitterIntent === "update") {
      setTone("saving");
      return;
    }

    if (tone === "saving") {
      setTone("default");
    }
  }

  return (
    <Form method="post" onSubmit={handleSubmit}>
      <input type="hidden" name="_action" value={isNew ? "create" : "update"} />
      {!isNew && <input type="hidden" name="feedId" value={feed.id} />}
      {isNew ? <input type="hidden" name="source" value={source} /> : null}
      {source === "list" ? <input type="hidden" name="records_limit" value="" /> : null}
      {/* Serialize settings as JSON for the action */}
      <input type="hidden" name="settingsJson" value={JSON.stringify(settings)} />
      {isNew ? (
        <input type="hidden" name="previewSignature" value={canCreateFromPreview ? currentPreviewSignature : ""} />
      ) : null}

      <VStack align="stretch" spacing={4}>
        <FeedRunActivityPanel initialRun={actionData?.run || null} />

        {actionData?.error && (
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            <AlertDescription fontSize="sm">{actionData.error}</AlertDescription>
          </Alert>
        )}

        {!isNew ? (
          <FeedLifecycleControlsCard
            feed={feed}
            isRefreshing={isRefreshing}
            isTogglingPause={isTogglingPause}
            showRefresh={!hasActiveRun}
          />
        ) : null}

        {/* Source-specific filters */}
        {source && (
          <SourceFiltersCard
            sourceKey={source}
            settings={settings}
            onSettingsChange={(next) => {
              setSettings(next);
              setTone("editing");
            }}
            isPreviewing={isPreviewing}
            availableLists={listOptions}
            onOpenListFinder={() => setIsListFinderOpen(true)}
          />
        )}

        {shouldShowPreviewPanel ? (
          <Box ref={previewRef}>
            {isPreviewing ? (
              <PreviewLoadingPanel />
            ) : (
              <FeedPreviewPanel
                preview={actionData?.preview || null}
                previewFailed={!actionData?.preview && !isPreviewing && navigation.state === "idle" && actionData?.intent === "preview"}
                previewError={actionData?.error || null}
              />
            )}
          </Box>
        ) : null}

        <SearchConfigurationCard
          isNew={isNew}
          source={source}
          name={name}
          onNameChange={(e) => {
            setName(e.target.value);
            if (isNew) {
              setIsNameCustomized(Boolean(e.target.value.trim()));
            }
            setTone("editing");
          }}
          suggestedFeedName={suggestedFeedName}
          description={description}
          onDescriptionChange={(e) => {
            setDescription(e.target.value);
            setTone("editing");
          }}
          reason={reason}
          onReasonChange={(e) => {
            setReason(e.target.value);
            setTone("editing");
          }}
          priority={priority}
          onPriorityChange={(val) => {
            setPriority(val);
            setTone("editing");
          }}
          recordsLimit={recordsLimit}
          onRecordsLimitChange={(val) => {
            setRecordsLimit(val);
            setTone("editing");
          }}
          crmAgeDays={crmAgeDays}
          onCrmAgeDaysChange={(val) => {
            setCrmAgeDays(val);
            setTone("editing");
          }}
          canCreateFromPreview={canCreateFromPreview}
          lastSuccessfulPreviewSignature={lastSuccessfulPreviewSignature}
          isSaving={isSaving}
        />

        {/* Actions */}
        <Flex justify="space-between" align="center" pt={1}>
          <Button
            as={Link}
            to="/settings/feeds"
            variant="ghost"
            size="sm"
            leftIcon={<MdArrowBack />}
            color="gray.600"
          >
            Back to Research Feeds
          </Button>
          <HStack spacing={3}>
            {!isNew ? (
              <Button
                type="submit"
                colorScheme="blue"
                size="sm"
                leftIcon={<MdSave />}
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            ) : null}
          </HStack>
        </Flex>
      </VStack>

      <ListFinderDrawer
        isOpen={isListFinderOpen}
        onClose={() => setIsListFinderOpen(false)}
        title="Find List"
        searchLabel="Search Lists"
        searchPlaceholder="Search by list name"
        items={filterOrganizationLists(listOptions)}
        selectedItemId={readSourceListSelection(settings).uuid}
        onSelectItem={(list) => {
          setSettings(writeSourceListSelection(settings, list));
          setTone("editing");
        }}
        createActionLabel="Upload CSV/XLSX as New List"
        onCreateAction={() => {
          setIsListFinderOpen(false);
          setIsImportDrawerOpen(true);
        }}
        emptyStateMessage="No matching organization lists were found."
        getItemId={(item) => item?.uuid || ""}
        getItemLabel={(item) => item?.name || "Untitled list"}
        getSearchText={(item) => `${item?.name || ""} ${item?.uuid || ""}`}
        renderItemMeta={(item, { isSelected }) => (
          <Text fontSize="xs" color={isSelected ? "whiteAlpha.800" : "gray.500"} noOfLines={1}>
            {Number.isFinite(Number(item?.memberCount))
              ? `${Number(item.memberCount).toLocaleString()} organizations`
              : "Organization list"}
          </Text>
        )}
      />

      <OrganizationListImportDrawer
        isOpen={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
        allowImportScopeSelection
        defaultImportScope="include_unmatched_companies"
        requireListReady={false}
        onImportedList={(list) => {
          const normalizedList = {
            ...list,
            uuid: list?.uuid || "",
            name: list?.name || ""
          };
          setListOptions((currentLists) => {
            const nextLists = Array.isArray(currentLists) ? currentLists.slice() : [];
            const existingIndex = nextLists.findIndex((entry) => entry?.uuid === normalizedList.uuid);
            if (existingIndex >= 0) {
              nextLists[existingIndex] = {
                ...nextLists[existingIndex],
                ...normalizedList
              };
              return nextLists;
            }

            return [normalizedList, ...nextLists];
          });
          setSettings((currentSettings) => writeSourceListSelection(currentSettings, normalizedList));
          setTone("editing");
          setIsImportDrawerOpen(false);
          setIsListFinderOpen(false);
        }}
      />
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Last run status panel (shown on edit page only)
// ---------------------------------------------------------------------------

function LastRunPanel({ feed }) {
  if (!feed.last_run_status && !feed.last_run_started_at) {
    return null;
  }

  const statusColors = {
    complete: "green",
    running: "blue",
    failed: "red"
  };
  const color = statusColors[feed.last_run_status] || "gray";

  return (
    <Box
      borderWidth="1px"
      borderColor={`${color}.200`}
      borderRadius="xl"
      bg={`${color}.50`}
      px={4}
      py={3}
    >
      <HStack justify="space-between" align="start" wrap="wrap" gap={2}>
        <VStack align="start" spacing={0.5}>
          <Text fontSize="xs" fontWeight="semibold" color={`${color}.700`} textTransform="uppercase" letterSpacing="wide">
            Latest Refresh
          </Text>
          <HStack spacing={2}>
            <Badge colorScheme={color} fontSize="xs">
              {feed.last_run_status}
            </Badge>
            {feed.last_run_completed_at && (
              <Text fontSize="xs" color="gray.600">
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(feed.last_run_completed_at))}
              </Text>
            )}
          </HStack>
          {feed.last_error && (
            <Text fontSize="xs" color="red.600" mt={1} maxW="500px">
              {feed.last_error}
            </Text>
          )}
        </VStack>
        {feed.last_queued_count != null && (
          <HStack spacing={4}>
            <VStack spacing={0} align="end">
              <Text fontSize="lg" fontWeight="bold" color={`${color}.700`} lineHeight="1">
                {feed.last_queued_count.toLocaleString()}
              </Text>
              <Text fontSize="xs" color="gray.500">organizations processed</Text>
            </VStack>
          </HStack>
        )}
      </HStack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page exports
// ---------------------------------------------------------------------------

/**
 * Renders the edit page for an existing feed.
 * @param {{
 *   feed: object,
 *   actionData: {error?: string}|null
 * }} props
 */
export function FeedEditPage({ feed, initialRun, actionData, availableLists = [] }) {
  const sourceColor = getFeedSourceColor(feed.source);
  const resolvedActionData =
    actionData?.run || actionData?.preview || actionData?.error
      ? actionData
      : initialRun
        ? { run: initialRun }
        : actionData;

  return (
    <VStack align="stretch" spacing={0}>
      <Box
        px={{ base: 4, md: 6 }}
        py={{ base: 4, md: 5 }}
        borderBottomWidth="1px"
        bg="white"
      >
        <HStack spacing={3} align="center">
          <Button
            as={Link}
            to="/settings/feeds"
            variant="ghost"
            size="sm"
            leftIcon={<MdArrowBack />}
            color="gray.600"
            px={2}
          >
            Research Feeds
          </Button>
          <Text color="gray.300">/</Text>
          <Heading size="md" flex="1" noOfLines={1}>
            {feed.name}
          </Heading>
          <Badge colorScheme={sourceColor} fontSize="sm" px={2.5} py={0.5}>
            {getFeedSourceLabel(feed.source)}
          </Badge>
          <Badge colorScheme={feed.enabled === false ? "orange" : "green"} fontSize="sm" px={2.5} py={0.5}>
            {feed.enabled === false ? "Paused" : "Active"}
          </Badge>
        </HStack>
      </Box>

      <VStack align="stretch" spacing={4} px={{ base: 4, md: 6 }} py={5} maxW="860px">
        <LastRunPanel feed={feed} />
        <FeedEditorForm
          feed={feed}
          isNew={false}
          actionData={resolvedActionData}
          availableLists={availableLists}
        />
      </VStack>
    </VStack>
  );
}

/**
 * Renders the creation page for a new feed.
 * @param {{
 *   initialSource: string|null,
 *   actionData: {error?: string}|null
 * }} props
 */
export function FeedNewPage({ initialSource, actionData, availableLists = [] }) {
  const emptyFeed = {
    id: null,
    name: "",
    source: initialSource || "",
    description: "",
    priority: 10,
    records_limit: 100,
    crm_age_days: 90,
    settings: {},
    last_run_started_at: null,
    last_run_completed_at: null,
    last_run_status: null,
    next_run_at: null
  };

  return (
    <VStack align="stretch" spacing={0}>
      <Box
        px={{ base: 4, md: 6 }}
        py={{ base: 4, md: 5 }}
        borderBottomWidth="1px"
        bg="white"
      >
        <HStack spacing={3} align="center">
          <Button
            as={Link}
            to="/settings/feeds"
            variant="ghost"
            size="sm"
            leftIcon={<MdArrowBack />}
            color="gray.600"
            px={2}
          >
            Research Feeds
          </Button>
          <Text color="gray.300">/</Text>
          <Heading size="md">New Feed</Heading>
        </HStack>
      </Box>

      <VStack align="stretch" spacing={4} px={{ base: 4, md: 6 }} py={5} maxW="860px">
        <FeedEditorForm
          feed={emptyFeed}
          isNew
          actionData={actionData}
          availableLists={availableLists}
        />
      </VStack>
    </VStack>
  );
}
