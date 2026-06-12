import React, { useMemo, useState } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Grid,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";

const DAY_ORDER = [
  { key: "sun", label: "Sunday" },
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
];

const DEFAULT_HOURS = {
  sun: { from: "", to: "" },
  mon: { from: "09:00", to: "17:00" },
  tue: { from: "07:00", to: "17:00" },
  wed: { from: "09:00", to: "17:00" },
  thu: { from: "07:00", to: "17:00" },
  fri: { from: "09:00", to: "17:00" },
  sat: { from: "", to: "" },
};

const DEFAULT_SETTINGS = {
  maxResearchDaily: 5,
  workHours: DEFAULT_HOURS,
};

function formatTime(value) {
  if (!value) return "Set time";
  const [rawHour, rawMinute] = String(value).split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "Set time";
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getUsageColorScheme(currentCount, maxCount) {
  if (!maxCount || currentCount <= 0) return "gray";
  const usedRatio = currentCount / maxCount;
  if (usedRatio >= 1) return "red";
  if (usedRatio >= 0.99) return "orange";
  return "green";
}

function TimeBubble({ value, isEditing, onClick, onChange, onBlur, onKeyDown }) {
  if (isEditing) {
    return (
      <Input
        type="time"
        size="sm"
        width="9rem"
        value={value || ""}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoFocus
        bg="white"
      />
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      borderRadius="full"
      bg="gray.50"
      onClick={onClick}
      minW="9rem"
      justifyContent="center"
    >
      {formatTime(value)}
    </Button>
  );
}

export function CompanyResearchPriorityManagerPage({
  initialSettings = DEFAULT_SETTINGS,
  initialVersion = null,
  initialActivity = {
    activeNowCount: 0,
    pendingCount: 0,
    governedActiveCount: 0,
    manualOverrideCount: 0,
  },
}) {
  const fetcher = useFetcher();
  const [maxResearchDaily, setMaxResearchDaily] = useState(
    Number(initialSettings?.maxResearchDaily || DEFAULT_SETTINGS.maxResearchDaily)
  );
  const [draftMaxResearchDaily, setDraftMaxResearchDaily] = useState(
    String(initialSettings?.maxResearchDaily || DEFAULT_SETTINGS.maxResearchDaily)
  );
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [workHours, setWorkHours] = useState(initialSettings?.workHours || DEFAULT_HOURS);
  const [editingTimeSlot, setEditingTimeSlot] = useState(null);
  const [settingsVersion, setSettingsVersion] = useState(initialVersion);

  const activeNowCount = Number(initialActivity?.governedActiveCount || 0);
  const totalProcessingCount = Number(initialActivity?.activeNowCount || 0);
  const pendingCount = Number(initialActivity?.pendingCount || 0);
  const usageColorScheme = useMemo(
    () => getUsageColorScheme(activeNowCount, maxResearchDaily),
    [activeNowCount, maxResearchDaily]
  );

  function openMaxEditor() {
    setDraftMaxResearchDaily(String(maxResearchDaily));
    setIsEditingMax(true);
  }

  function submitSettings(nextSettings, nextVersion = settingsVersion) {
    const formData = new FormData();
    formData.set("settingsJson", JSON.stringify(nextSettings));
    if (Number.isFinite(nextVersion)) {
      formData.set("expectedVersion", String(nextVersion));
    }
    fetcher.submit(formData, { method: "post" });
  }

  function commitMaxEditor() {
    const nextValue = Number.parseInt(draftMaxResearchDaily, 10);
    if (Number.isInteger(nextValue) && nextValue > 0) {
      setMaxResearchDaily(nextValue);
      submitSettings({
        maxResearchDaily: nextValue,
        workHours,
      });
    }
    setIsEditingMax(false);
  }

  function updateWorkHour(dayKey, slot, nextValue) {
    setWorkHours((current) => ({
      ...current,
      [dayKey]: {
        ...current[dayKey],
        [slot]: nextValue,
      },
    }));
  }

  React.useEffect(() => {
    if (fetcher.data?.ok) {
      if (Number.isFinite(fetcher.data.version)) {
        setSettingsVersion(fetcher.data.version);
      }
      if (fetcher.data.settings?.workHours) {
        setWorkHours(fetcher.data.settings.workHours);
      }
      if (Number.isFinite(fetcher.data.settings?.maxResearchDaily)) {
        setMaxResearchDaily(fetcher.data.settings.maxResearchDaily);
        setDraftMaxResearchDaily(String(fetcher.data.settings.maxResearchDaily));
      }
    }
  }, [fetcher.data]);

  return (
    <Box px={{ base: 4, md: 8 }} pb={{ base: 6, md: 8 }}>
      <Grid templateColumns={{ base: "1fr", xl: "repeat(2, minmax(0, 1fr))" }} gap={6} alignItems="start">
        <Card bg="white">
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                Maximum Research Daily
              </Text>
              <Box
                borderWidth="1px"
                borderColor={`${usageColorScheme}.200`}
                bg={`${usageColorScheme}.50`}
                borderRadius="2xl"
                p={5}
                cursor="pointer"
                onClick={() => {
                  if (!isEditingMax) openMaxEditor();
                }}
              >
                <VStack align="stretch" spacing={4}>
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Heading size="lg" color={`${usageColorScheme}.800`}>
                        Capacity
                      </Heading>
                    </Box>
                    <Badge colorScheme={usageColorScheme} variant="subtle" borderRadius="full" px={3} py={1}>
                      Resets midnight CST
                    </Badge>
                  </HStack>

                  {isEditingMax ? (
                    <VStack align="stretch" spacing={3}>
                      <Text fontSize="sm" color="gray.700">
                        Change the Maximum Research
                      </Text>
                      <Input
                        size="lg"
                        type="number"
                        min={1}
                        value={draftMaxResearchDaily}
                        onChange={(event) => setDraftMaxResearchDaily(event.target.value)}
                        onBlur={commitMaxEditor}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === "Escape") {
                            setDraftMaxResearchDaily(String(maxResearchDaily));
                            setIsEditingMax(false);
                          }
                        }}
                        bg="white"
                        autoFocus
                      />
                    </VStack>
                  ) : (
                    <Stack spacing={1}>
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                        <Box
                          borderWidth="1px"
                          borderColor="whiteAlpha.700"
                          bg="whiteAlpha.700"
                          borderRadius="xl"
                          px={4}
                          py={3}
                        >
                          <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                            Processing
                          </Text>
                          <Text fontSize="2xl" fontWeight="700" color="gray.800">
                            {totalProcessingCount}
                          </Text>
                        </Box>
                        <Box
                          borderWidth="1px"
                          borderColor="whiteAlpha.700"
                          bg="whiteAlpha.700"
                          borderRadius="xl"
                          px={4}
                          py={3}
                        >
                          <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                            Pending
                          </Text>
                          <Text fontSize="2xl" fontWeight="700" color="gray.800">
                            {pendingCount}
                          </Text>
                        </Box>
                        <Box
                          borderWidth="1px"
                          borderColor="whiteAlpha.700"
                          bg="whiteAlpha.700"
                          borderRadius="xl"
                          px={4}
                          py={3}
                        >
                          <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                            Limit
                          </Text>
                          <Text fontSize="2xl" fontWeight="700" color="gray.800">
                            {maxResearchDaily}
                          </Text>
                        </Box>
                      </SimpleGrid>
                      <Divider />
                      <Text fontSize="sm" color="gray.600">
                        Manual Runs can exceed the limit set here.
                      </Text>
                    </Stack>
                  )}
                </VStack>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        <Card bg="white">
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                Work Hours
              </Text>

              {DAY_ORDER.map((day) => {
                const schedule = workHours[day.key] || { from: "", to: "" };
                return (
                  <Box key={day.key} borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={4}>
                    <Text fontWeight="semibold" color="gray.900">
                      {day.label}
                    </Text>
                    <Stack direction={{ base: "column", md: "row" }} spacing={3} mt={3}>
                      <VStack align="start" spacing={1} flex="1">
                        <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                          From
                        </Text>
                        <TimeBubble
                          value={schedule.from}
                          isEditing={editingTimeSlot?.dayKey === day.key && editingTimeSlot?.slot === "from"}
                          onClick={() => setEditingTimeSlot({ dayKey: day.key, slot: "from" })}
                          onChange={(event) => updateWorkHour(day.key, "from", event.target.value)}
                          onBlur={(event) => {
                            const nextValue = event.target.value;
                            const nextHours = {
                              ...workHours,
                              [day.key]: {
                                ...schedule,
                                from: nextValue,
                              },
                            };
                            setWorkHours(nextHours);
                            setEditingTimeSlot(null);
                            submitSettings({
                              maxResearchDaily,
                              workHours: nextHours,
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                            if (event.key === "Escape") {
                              setEditingTimeSlot(null);
                            }
                          }}
                        />
                      </VStack>
                      <VStack align="start" spacing={1} flex="1">
                        <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
                          To
                        </Text>
                        <TimeBubble
                          value={schedule.to}
                          isEditing={editingTimeSlot?.dayKey === day.key && editingTimeSlot?.slot === "to"}
                          onClick={() => setEditingTimeSlot({ dayKey: day.key, slot: "to" })}
                          onChange={(event) => updateWorkHour(day.key, "to", event.target.value)}
                          onBlur={(event) => {
                            const nextValue = event.target.value;
                            const nextHours = {
                              ...workHours,
                              [day.key]: {
                                ...schedule,
                                to: nextValue,
                              },
                            };
                            setWorkHours(nextHours);
                            setEditingTimeSlot(null);
                            submitSettings({
                              maxResearchDaily,
                              workHours: nextHours,
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                            if (event.key === "Escape") {
                              setEditingTimeSlot(null);
                            }
                          }}
                        />
                      </VStack>
                    </Stack>
                  </Box>
                );
              })}
            </VStack>
          </CardBody>
        </Card>
      </Grid>
    </Box>
  );
}
