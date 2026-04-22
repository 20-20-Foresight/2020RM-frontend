import React, { useEffect, useState } from "react";
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
  InputGroup,
  InputRightAddon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  VStack,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import { Form, Link, useNavigation } from "@remix-run/react";
import { MdArrowBack, MdDelete, MdSave } from "react-icons/md";
import { SurfaceCard } from "./ui/atoms/SurfaceCard";
import { SectionLabel } from "./ui/atoms/SectionLabel";
import { getFeedSourceColor, getFeedSourceLabel, FEED_SOURCES, FEED_SOURCE_KEYS } from "../models/feed-sources.mjs";
import { readFeedFormIntent } from "../models/feed-form-intent.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
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
              <Tag size="sm" colorScheme="blue" borderRadius="full">
                <TagLabel>{tag}</TagLabel>
                <TagCloseButton onClick={() => removeTag(tag)} />
              </Tag>
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

// ---------------------------------------------------------------------------
// Source filter editor
// ---------------------------------------------------------------------------

function SourceFiltersCard({ sourceKey, settings, onSettingsChange }) {
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
          const currentValue = settings[filterDef.settingsKey] ?? (filterDef.type === "range" ? {} : []);

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
                {filterDef.description && filterDef.type !== "tags" && (
                  <FormHelperText fontSize="xs" mt={1.5}>
                    {filterDef.description}
                  </FormHelperText>
                )}
              </FormControl>
            </Box>
          );
        })}
      </VStack>
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// Editor form body (shared between new/edit)
// ---------------------------------------------------------------------------

function FeedEditorForm({ feed, isNew, actionData }) {
  const navigation = useNavigation();
  const [name, setName] = useState(feed.name || "");
  const [source, setSource] = useState(feed.source || "");
  const [description, setDescription] = useState(feed.description || "");
  const [enabled, setEnabled] = useState(feed.enabled !== false);
  const [intervalDays, setIntervalDays] = useState(String(feed.interval_days ?? 7));
  const [recordsLimit, setRecordsLimit] = useState(String(feed.records_limit ?? ""));
  const [crmAgeDays, setCrmAgeDays] = useState(String(feed.crm_age_days ?? ""));
  const [nextRunAt, setNextRunAt] = useState(toDatetimeLocalValue(feed.next_run_at));
  const [settings, setSettings] = useState(feed.settings || {});
  const [tone, setTone] = useState("default");

  const sourceColor = getFeedSourceColor(source);
  const isSourceLocked = !isNew && !!feed.source;
  const navigationIntent = readFeedFormIntent(navigation.formData);
  const isSaving =
    navigation.state !== "idle" &&
    (navigationIntent === "create" || navigationIntent === "update");

  useEffect(() => {
    if (navigation.state === "idle" && tone === "saving") {
      setTone("default");
    }
  }, [navigation.state, tone]);

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
      {/* Serialize settings as JSON for the action */}
      <input type="hidden" name="settingsJson" value={JSON.stringify(settings)} />

      <VStack align="stretch" spacing={4}>
        {actionData?.error && (
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            <AlertDescription fontSize="sm">{actionData.error}</AlertDescription>
          </Alert>
        )}

        {/* Basic info */}
        <SurfaceCard tone={tone}>
          <VStack align="stretch" spacing={4}>
            <SectionLabel>Basic Configuration</SectionLabel>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Feed Name</FormLabel>
                <Input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. US Wealth Managers (AUM 100M+)"
                  size="sm"
                  onFocus={() => setTone("editing")}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm">Source</FormLabel>
                {isSourceLocked ? (
                  <HStack spacing={2} h="32px" align="center">
                    <Badge colorScheme={sourceColor} fontSize="sm" px={2.5} py={1} borderRadius="md">
                      {getFeedSourceLabel(source)}
                    </Badge>
                    <input type="hidden" name="source" value={source} />
                    <Text fontSize="xs" color="gray.400">
                      (cannot change after creation)
                    </Text>
                  </HStack>
                ) : (
                  <Select
                    name="source"
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      setSettings({});
                    }}
                    placeholder="Select a source..."
                    size="sm"
                    onFocus={() => setTone("editing")}
                  >
                    {FEED_SOURCE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {getFeedSourceLabel(key)}
                      </option>
                    ))}
                  </Select>
                )}
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel fontSize="sm">Description</FormLabel>
              <Textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional — describe the purpose of this feed"
                size="sm"
                rows={2}
                resize="none"
                onFocus={() => setTone("editing")}
              />
            </FormControl>

            <FormControl>
              <HStack justify="space-between">
                <Box>
                  <FormLabel fontSize="sm" mb={0}>
                    Enabled
                  </FormLabel>
                  <FormHelperText fontSize="xs" mt={0.5}>
                    Disabled feeds are skipped by the scheduler
                  </FormHelperText>
                </Box>
                <Switch
                  name="enabled"
                  colorScheme={sourceColor || "blue"}
                  isChecked={enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    setTone("editing");
                  }}
                  value="true"
                />
              </HStack>
            </FormControl>
          </VStack>
        </SurfaceCard>

        {/* Schedule & limits */}
        <SurfaceCard>
          <VStack align="stretch" spacing={4}>
            <SectionLabel>Schedule & Limits</SectionLabel>

            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Run Interval</FormLabel>
                <InputGroup size="sm">
                  <NumberInput
                    value={intervalDays}
                    min={1}
                    max={365}
                    onChange={(val) => {
                      setIntervalDays(val);
                      setTone("editing");
                    }}
                    w="full"
                  >
                    <NumberInputField name="interval_days" borderRightRadius={0} />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <InputRightAddon>days</InputRightAddon>
                </InputGroup>
                <FormHelperText fontSize="xs">How often this feed runs</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Records Per Run</FormLabel>
                <NumberInput
                  value={recordsLimit}
                  min={1}
                  max={10000}
                  onChange={(val) => {
                    setRecordsLimit(val);
                    setTone("editing");
                  }}
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
                  Max contacts queued per run
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">CRM Age (days)</FormLabel>
                <NumberInput
                  value={crmAgeDays}
                  min={1}
                  onChange={(val) => {
                    setCrmAgeDays(val);
                    setTone("editing");
                  }}
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
                  Skip contacts touched within N days
                </FormHelperText>
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel fontSize="sm">Next Run At</FormLabel>
              <Input
                name="next_run_at"
                type="datetime-local"
                value={nextRunAt}
                onChange={(e) => {
                  setNextRunAt(e.target.value);
                  setTone("editing");
                }}
                size="sm"
                maxW="280px"
              />
              <FormHelperText fontSize="xs">
                Leave blank to run on next scheduled cycle
              </FormHelperText>
            </FormControl>
          </VStack>
        </SurfaceCard>

        {/* Source-specific filters */}
        {source && (
          <SourceFiltersCard
            sourceKey={source}
            settings={settings}
            onSettingsChange={(next) => {
              setSettings(next);
              setTone("editing");
            }}
          />
        )}

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
            Back to Feeds
          </Button>
          <HStack spacing={3}>
            {!isNew && (
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
            )}
            <Button
              type="submit"
              colorScheme="blue"
              size="sm"
              leftIcon={<MdSave />}
              isLoading={isSaving}
            >
              {isNew ? "Create Feed" : "Save Changes"}
            </Button>
          </HStack>
        </Flex>
      </VStack>
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
            Last Run
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
        {(feed.last_result_count != null || feed.last_queued_count != null) && (
          <HStack spacing={4}>
            {feed.last_result_count != null && (
              <VStack spacing={0} align="end">
                <Text fontSize="lg" fontWeight="bold" color={`${color}.700`} lineHeight="1">
                  {feed.last_result_count.toLocaleString()}
                </Text>
                <Text fontSize="xs" color="gray.500">found</Text>
              </VStack>
            )}
            {feed.last_queued_count != null && (
              <VStack spacing={0} align="end">
                <Text fontSize="lg" fontWeight="bold" color={`${color}.700`} lineHeight="1">
                  {feed.last_queued_count.toLocaleString()}
                </Text>
                <Text fontSize="xs" color="gray.500">queued</Text>
              </VStack>
            )}
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
export function FeedEditPage({ feed, actionData }) {
  const sourceColor = getFeedSourceColor(feed.source);

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
            Feeds
          </Button>
          <Text color="gray.300">/</Text>
          <Heading size="md" flex="1" noOfLines={1}>
            {feed.name}
          </Heading>
          <Badge colorScheme={sourceColor} fontSize="sm" px={2.5} py={0.5}>
            {getFeedSourceLabel(feed.source)}
          </Badge>
        </HStack>
      </Box>

      <VStack align="stretch" spacing={4} px={{ base: 4, md: 6 }} py={5} maxW="860px">
        <LastRunPanel feed={feed} />
        <FeedEditorForm feed={feed} isNew={false} actionData={actionData} />
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
export function FeedNewPage({ initialSource, actionData }) {
  const emptyFeed = {
    id: null,
    name: "",
    source: initialSource || "",
    description: "",
    interval_days: 7,
    records_limit: 100,
    crm_age_days: 90,
    enabled: true,
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
            Feeds
          </Button>
          <Text color="gray.300">/</Text>
          <Heading size="md">New Feed</Heading>
        </HStack>
      </Box>

      <VStack align="stretch" spacing={4} px={{ base: 4, md: 6 }} py={5} maxW="860px">
        <FeedEditorForm feed={emptyFeed} isNew actionData={actionData} />
      </VStack>
    </VStack>
  );
}
