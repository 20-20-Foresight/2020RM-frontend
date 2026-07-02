import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CompanyResearchQueueTable } from "./CompanyResearchQueueTable";

const SECTION_DRAWER_POLL_INTERVAL_MS = 60_000;

function readLocalDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetDateRange(preset) {
  const now = new Date();
  if (preset === "this_week") {
    const start = new Date(now);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return {
      dateFrom: readLocalDate(start),
      dateTo: readLocalDate(now),
    };
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      dateFrom: readLocalDate(start),
      dateTo: readLocalDate(now),
    };
  }
  return {
    dateFrom: "",
    dateTo: "",
  };
}

function buildQueryString(section, offset, filters) {
  const params = new URLSearchParams();
  params.set("section", section);
  params.set("limit", "50");
  params.set("offset", String(offset));
  if (filters.statuses) params.set("status", filters.statuses);
  if (filters.reasons) params.set("reason", filters.reasons);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return params.toString();
}

async function fetchSectionItems({ section, filters, offset }) {
  const response = await fetch(
    `/api/rest/company-research/items?${buildQueryString(section, offset, filters)}`,
    {
      headers: { accept: "application/json" },
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Unable to load queue items.");
  }
  return payload;
}

export function CompanyResearchQueueSectionDrawer({
  isOpen,
  onClose,
  section,
  title,
  onRerunRequest,
}) {
  const isCompleted = section === "completed";
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableFilters, setAvailableFilters] = useState({
    statuses: [],
    reasons: [],
  });
  const [filters, setFilters] = useState({
    statuses: "",
    reasons: "",
    datePreset: "",
    dateFrom: "",
    dateTo: "",
  });

  async function loadItems({ reset = false, showLoading = true } = {}) {
    const offset = reset ? 0 : items.length;
    if (showLoading) {
      setLoading(true);
    }
    try {
      const payload = await fetchSectionItems({
        section,
        filters,
        offset,
      });
      const nextItems = Array.isArray(payload?.items?.items) ? payload.items.items : [];
      setItems((current) => (reset ? nextItems : [...current, ...nextItems]));
      setTotal(Number(payload?.items?.total || 0));
      setHasMore(Boolean(payload?.items?.hasMore));
      setAvailableFilters(
        isCompleted
          ? {
              statuses: Array.isArray(payload?.items?.availableFilters?.statuses)
                ? payload.items.availableFilters.statuses
                : [],
              reasons: Array.isArray(payload?.items?.availableFilters?.reasons)
                ? payload.items.availableFilters.reasons
                : [],
            }
          : { statuses: [], reasons: [] }
      );
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load queue items.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let isActive = true;

    async function refresh(reset = true, showLoading = false) {
      try {
        if (showLoading) {
          setLoading(true);
        }
        const payload = await fetchSectionItems({
          section,
          filters,
          offset: reset ? 0 : items.length,
        });
        if (!isActive) {
          return;
        }
        const nextItems = Array.isArray(payload?.items?.items) ? payload.items.items : [];
        setItems((current) => (reset ? nextItems : [...current, ...nextItems]));
        setTotal(Number(payload?.items?.total || 0));
        setHasMore(Boolean(payload?.items?.hasMore));
        setAvailableFilters(
          isCompleted
            ? {
                statuses: Array.isArray(payload?.items?.availableFilters?.statuses)
                  ? payload.items.availableFilters.statuses
                  : [],
                reasons: Array.isArray(payload?.items?.availableFilters?.reasons)
                  ? payload.items.availableFilters.reasons
                  : [],
              }
            : { statuses: [], reasons: [] }
        );
        setError("");
      } catch (loadError) {
        if (!isActive) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load queue items.");
      } finally {
        if (isActive && showLoading) {
          setLoading(false);
        }
      }
    }

    setItems([]);
    refresh(true, true);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh(true, false);
      }
    }, SECTION_DRAWER_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [filters, isCompleted, isOpen, section]);

  const appliedFilterCount = useMemo(
    () =>
      (filters.statuses ? 1 : 0) +
      (filters.reasons ? 1 : 0) +
      (filters.datePreset ? 1 : 0) +
      (filters.dateFrom ? 1 : 0) +
      (filters.dateTo ? 1 : 0),
    [filters]
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="full">
      <DrawerOverlay />
      <DrawerContent maxW={{ base: "100vw", lg: "75vw" }}>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">{title}</DrawerHeader>
        <DrawerBody py={5}>
          <VStack align="stretch" spacing={5}>
            {isCompleted ? (
              <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
                <VStack align="stretch" spacing={4}>
                  <HStack justify="space-between" align="center">
                    <Text fontWeight="semibold">Filters</Text>
                    <Text fontSize="sm" color="gray.500">
                      {appliedFilterCount ? `${appliedFilterCount} active` : "No filters"}
                    </Text>
                  </HStack>
                  <Stack direction={{ base: "column", md: "row" }} spacing={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">Statuses</FormLabel>
                      <Select
                        size="sm"
                        value={filters.statuses}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            statuses: event.target.value,
                          }))
                        }
                      >
                        <option value="">All statuses</option>
                        {availableFilters.statuses.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Reasons</FormLabel>
                      <Select
                        size="sm"
                        value={filters.reasons}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            reasons: event.target.value,
                          }))
                        }
                      >
                        <option value="">All reasons</option>
                        {availableFilters.reasons.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Date Range</FormLabel>
                      <Select
                        size="sm"
                        value={filters.datePreset}
                        onChange={(event) =>
                          setFilters((current) => {
                            const preset = event.target.value;
                            if (preset === "custom") {
                              return {
                                ...current,
                                datePreset: preset,
                              };
                            }
                            return {
                              ...current,
                              datePreset: preset,
                              ...getPresetDateRange(preset),
                            };
                          })
                        }
                      >
                        <option value="">All dates</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="custom">Custom</option>
                      </Select>
                    </FormControl>
                  </Stack>
                  <HStack spacing={4} align="end">
                    <FormControl>
                      <FormLabel fontSize="sm">Date From</FormLabel>
                      <Input
                        type="date"
                        size="sm"
                        value={filters.dateFrom}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            datePreset: "custom",
                            dateFrom: event.target.value,
                          }))
                        }
                        isDisabled={filters.datePreset !== "custom"}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">Date To</FormLabel>
                      <Input
                        type="date"
                        size="sm"
                        value={filters.dateTo}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            datePreset: "custom",
                            dateTo: event.target.value,
                          }))
                        }
                        isDisabled={filters.datePreset !== "custom"}
                      />
                    </FormControl>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => loadItems({ reset: true })}
                      isLoading={loading}
                    >
                      Apply
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            ) : null}

            <HStack justify="space-between" align="center">
              <Text fontSize="sm" color="gray.500">
                {loading && !items.length ? "Loading..." : `${total.toLocaleString()} items`}
              </Text>
            </HStack>

            {error ? (
              <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={4}>
                <Text color="red.700" fontSize="sm">
                  {error}
                </Text>
              </Box>
            ) : null}

            {loading && !items.length ? (
              <HStack spacing={3} color="gray.500">
                <Spinner size="sm" />
                <Text fontSize="sm">Loading queue items…</Text>
              </HStack>
            ) : (
              <CompanyResearchQueueTable
                items={items}
                section={section}
                onRerunRequest={onRerunRequest}
              />
            )}
          </VStack>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px" justifyContent="space-between">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {hasMore ? (
            <Button
              colorScheme="blue"
              variant="outline"
              onClick={() => loadItems({ reset: false })}
              isLoading={loading}
            >
              Load more
            </Button>
          ) : null}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
