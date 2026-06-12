import React, { useEffect } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
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

const REQUESTED_SOURCE_OPTIONS = [
  { value: "Website", label: "Website" },
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "Sales Navigator", label: "Sales Navigator" },
];

const REQUEST_REASON_OPTIONS = [
  { value: "From Email Request", label: "From Email Request" },
];

export function CompanyResearchRequestDrawer({ isOpen, onClose, fetcher, onSuccess }) {
  const isSubmitting = fetcher.state !== "idle";
  const error = fetcher.data?.error || null;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      onSuccess?.(fetcher.data.request || null);
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">Request Research</DrawerHeader>

        <fetcher.Form method="post" action="/tools/company-research">
          <DrawerBody py={5}>
            <VStack align="stretch" spacing={4}>
              {error ? (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              ) : null}

              <input type="hidden" name="intent" value="create_manual_request" />

              <FormControl isRequired>
                <FormLabel fontSize="sm">Company</FormLabel>
                <Input name="companyName" placeholder="e.g. Acme Capital" />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Website</FormLabel>
                <Input name="website" placeholder="https://example.com" />
                <FormHelperText>Website or LinkedIn URL is required.</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">LinkedIn URL</FormLabel>
                <Input
                  name="linkedInUrl"
                  placeholder="https://www.linkedin.com/company/example"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Additional Sources</FormLabel>
                <CheckboxGroup defaultValue={["Website"]}>
                  <Stack spacing={2}>
                    {REQUESTED_SOURCE_OPTIONS.map((option) => (
                      <Checkbox
                        key={option.value}
                        name="requestedSources"
                        value={option.value}
                      >
                        {option.label}
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
                <FormHelperText>
                  Stored on the request for queue provenance and operator review.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Reason</FormLabel>
                <Select name="requestReason" defaultValue="From Email Request">
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
                Create Request
              </Button>
            </Box>
          </DrawerFooter>
        </fetcher.Form>
      </DrawerContent>
    </Drawer>
  );
}
