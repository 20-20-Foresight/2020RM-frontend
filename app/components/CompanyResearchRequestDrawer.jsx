import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  Stack,
  Textarea,
  VStack,
} from "@chakra-ui/react";

const DATA_PROVIDER_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "salesnav", label: "Sales Navigator" },
  { value: "biscred", label: "Biscred" },
  { value: "preqin", label: "Preqin" },
  { value: "revenuebase", label: "RevenueBase" },
];
const HIDDEN_DATA_PROVIDER_VALUES = new Set(["website"]);
const DEFAULT_DATA_PROVIDERS = DATA_PROVIDER_OPTIONS.map((option) => option.value).filter(
  (value) => !HIDDEN_DATA_PROVIDER_VALUES.has(value)
);

const REQUEST_REASON_OPTIONS = [
  { value: "From Email Request", label: "From Email Request" },
];

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDataProviders(value) {
  const items = Array.isArray(value) ? value : [];
  const unique = Array.from(
    new Set(items.map((entry) => readTrimmedString(entry)).filter(Boolean))
  ).filter((entry) => !HIDDEN_DATA_PROVIDER_VALUES.has(entry));
  return unique.length ? unique : DEFAULT_DATA_PROVIDERS;
}

export function CompanyResearchRequestDrawer({
  isOpen,
  onClose,
  fetcher,
  onSuccess,
  initialValues = null,
}) {
  const isSubmitting = fetcher.state !== "idle";
  const error = fetcher.data?.error || null;
  const defaults = useMemo(
    () => ({
      companyName: readTrimmedString(initialValues?.companyName),
      website: readTrimmedString(initialValues?.website),
      linkedInUrl: readTrimmedString(initialValues?.linkedInUrl),
      dataProviders: normalizeDataProviders(initialValues?.dataProviders),
      requestReason:
        readTrimmedString(initialValues?.requestReason) || "From Email Request",
      notes: readTrimmedString(initialValues?.notes),
      originLabel: readTrimmedString(initialValues?.originLabel || initialValues?.requestSourceLabel),
    }),
    [initialValues]
  );
  const formKey = useMemo(() => JSON.stringify(defaults), [defaults]);
  const isRerunRequest = defaults.originLabel === "Rerun Request";
  const [selectedDataProviders, setSelectedDataProviders] = useState(
    defaults.dataProviders
  );
  const lastHandledSuccessRef = useRef(null);

  useEffect(() => {
    setSelectedDataProviders(defaults.dataProviders);
  }, [defaults]);

  useEffect(() => {
    if (fetcher.state !== "idle") {
      return;
    }
    if (!fetcher.data?.ok) {
      lastHandledSuccessRef.current = null;
      return;
    }
    if (lastHandledSuccessRef.current === fetcher.data) {
      return;
    }
    lastHandledSuccessRef.current = fetcher.data;
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      onSuccess?.(fetcher.data.request || null);
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          {isRerunRequest ? "Rerun Company Research" : "Request Research"}
        </DrawerHeader>

        <fetcher.Form key={formKey} method="post" action="/tools/company-research">
          <DrawerBody py={5}>
            <VStack align="stretch" spacing={4}>
              {error ? (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <input type="hidden" name="intent" value="create_manual_request" />
              <input
                type="hidden"
                name="originLabel"
                value={defaults.originLabel}
              />
              <FormControl isRequired>
                <FormLabel fontSize="sm">Company</FormLabel>
                <Input
                  name="companyName"
                  placeholder="e.g. Acme Capital"
                  defaultValue={defaults.companyName}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Website</FormLabel>
                <Input
                  name="website"
                  placeholder="https://example.com"
                  defaultValue={defaults.website}
                />
                <FormHelperText>Website or LinkedIn URL is required.</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">LinkedIn URL</FormLabel>
                <Input
                  name="linkedInUrl"
                  placeholder="https://www.linkedin.com/company/example"
                  defaultValue={defaults.linkedInUrl}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Data Providers</FormLabel>
                <Stack spacing={2}>
                  {DATA_PROVIDER_OPTIONS.map((option) => (
                    <Checkbox
                      key={option.value}
                      name={`requestSource_${option.value}`}
                      value="true"
                      style={
                        HIDDEN_DATA_PROVIDER_VALUES.has(option.value)
                          ? { display: "none" }
                          : undefined
                      }
                      isChecked={selectedDataProviders.includes(option.value)}
                      onChange={(event) => {
                        setSelectedDataProviders((current) => {
                          const next = new Set(current);
                          if (event.target.checked) {
                            next.add(option.value);
                          } else {
                            next.delete(option.value);
                          }
                          return DATA_PROVIDER_OPTIONS.map(({ value }) => value).filter(
                            (value) => next.has(value)
                          );
                        });
                      }}
                    >
                      {option.label}
                    </Checkbox>
                  ))}
                </Stack>
                <FormHelperText>
                  Every provider sent to the backend is explicit here.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Reason</FormLabel>
                <Select name="requestReason" defaultValue={defaults.requestReason}>
                  {REQUEST_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <FormHelperText>
                  Stored in Salesforce `Reason__c`.
                </FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm">Notes</FormLabel>
                <Textarea
                  name="notes"
                  placeholder="Why should this company enter Company Research?"
                  minH="120px"
                  defaultValue={defaults.notes}
                />
                <FormHelperText>
                  Stored in Salesforce `Notes__c`.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <Checkbox name="runNow" value="true">
                  Run now
                </Checkbox>
                <FormHelperText>
                  Prioritizes this manual request at the queue level.
                </FormHelperText>
              </FormControl>
            </VStack>
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px">
            <Box display="flex" gap={3}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isSubmitting}
                loadingText="Submitting"
              >
                {isRerunRequest ? "Create Rerun Request" : "Create Request"}
              </Button>
            </Box>
          </DrawerFooter>
        </fetcher.Form>
      </DrawerContent>
    </Drawer>
  );
}
