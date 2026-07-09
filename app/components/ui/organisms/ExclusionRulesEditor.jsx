import React, { useState } from "react";
import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Input,
  Select,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import { PERSONAL_EMAIL_DOMAINS } from "../../../models/email-blast-mock-data.mjs";
import { ExclusionListPicker } from "./ExclusionListPicker";

/**
 * The exclusion layer applied before a query is frozen into a send snapshot:
 * any number of pre-built "email exclusion lists" (a dynamic-list concept
 * discussed on the process-discovery call) on the left, and everything
 * else — cooldown window, personal/work-email toggles, the wildcard-capable
 * always-exclude list, and specific excluded people — on the right, each
 * section visually separated so the tab reads as several small decisions
 * instead of one dense block.
 * @param {{
 *   cooldownOptions: Array<{key: string, label: string, hours: number}>,
 *   cooldownHours: number,
 *   onCooldownHoursChange: (hours: number) => void,
 *   excludePersonalEmails: boolean,
 *   onExcludePersonalEmailsChange: (value: boolean) => void,
 *   excludeWorkEmails: boolean,
 *   onExcludeWorkEmailsChange: (value: boolean) => void,
 *   permanentExcludes: string[],
 *   onPermanentExcludesChange: (excludes: string[]) => void,
 *   excludedPeople?: Array<{id: string, name: string, email: string}>,
 *   onExcludedPeopleChange?: (people: Array<{id: string, name: string, email: string}>) => void,
 *   exclusionLists?: Array<{id: string, label: string, description: string, count: number}>,
 *   selectedExclusionListIds?: string[],
 *   onSelectedExclusionListIdsChange?: (ids: string[]) => void
 * }} props
 */
export function ExclusionRulesEditor({
  cooldownOptions,
  cooldownHours,
  onCooldownHoursChange,
  excludePersonalEmails,
  onExcludePersonalEmailsChange,
  excludeWorkEmails,
  onExcludeWorkEmailsChange,
  permanentExcludes,
  onPermanentExcludesChange,
  excludedPeople = [],
  onExcludedPeopleChange,
  exclusionLists = [],
  selectedExclusionListIds = [],
  onSelectedExclusionListIdsChange,
}) {
  const [draftExclude, setDraftExclude] = useState("");

  function handleAddExclude() {
    const value = draftExclude.trim();
    if (!value || permanentExcludes.includes(value)) {
      setDraftExclude("");
      return;
    }
    onPermanentExcludesChange([...permanentExcludes, value]);
    setDraftExclude("");
  }

  function handleRemoveExclude(value) {
    onPermanentExcludesChange(permanentExcludes.filter((entry) => entry !== value));
  }

  const effectiveRuleCount =
    permanentExcludes.length +
    (excludePersonalEmails ? 1 : 0) +
    (excludeWorkEmails ? 1 : 0) +
    excludedPeople.length +
    selectedExclusionListIds.length;

  return (
    <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={8} alignItems="start">
      <GridItem>
        <FormControl>
          <FormLabel fontSize="sm">Email exclusion lists</FormLabel>
          <FormHelperText mt={0} mb={3}>
            Select as many as apply — anyone on a selected list is held out of this send, on top of the rules
            on the right. No limit.
          </FormHelperText>
          {exclusionLists.length ? (
            <ExclusionListPicker
              lists={exclusionLists}
              selectedListIds={selectedExclusionListIds}
              onSelectedListIdsChange={onSelectedExclusionListIdsChange || (() => {})}
            />
          ) : (
            <Text fontSize="sm" color="gray.400">No exclusion lists available.</Text>
          )}
        </FormControl>
      </GridItem>

      <GridItem>
        <VStack align="stretch" spacing={4} divider={<Divider />}>
          <FormControl>
            <FormLabel fontSize="sm">Cooldown window</FormLabel>
            <Select
              value={String(cooldownHours)}
              onChange={(event) => onCooldownHoursChange(Number(event.target.value))}
              maxW="280px"
            >
              {cooldownOptions.map((option) => (
                <option key={option.key} value={option.hours}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FormHelperText>
              Recipients who received any blast within this window are held out of this send.
            </FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Category excludes</FormLabel>
            <VStack align="stretch" spacing={2}>
              <Box>
                <Checkbox
                  isChecked={excludePersonalEmails}
                  onChange={(event) => onExcludePersonalEmailsChange(event.target.checked)}
                >
                  Exclude personal emails
                </Checkbox>
                <FormHelperText ml={6} mt={0}>
                  Exclude sending email to a person's home/personal email addresses, such as{" "}
                  {PERSONAL_EMAIL_DOMAINS.slice(0, 2).join(" and ")}.
                </FormHelperText>
              </Box>
              <Box>
                <Checkbox
                  isChecked={excludeWorkEmails}
                  onChange={(event) => onExcludeWorkEmailsChange(event.target.checked)}
                >
                  Exclude work emails
                </Checkbox>
                <FormHelperText ml={6} mt={0}>
                  Exclude sending email to a person's work email, such as @kkr.com and @2020foresight.com.
                </FormHelperText>
              </Box>
            </VStack>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Always exclude</FormLabel>
            <HStack>
              <Input
                placeholder="name@company.com or *@company.com"
                value={draftExclude}
                onChange={(event) => setDraftExclude(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddExclude();
                  }
                }}
              />
              <IconButton aria-label="Add exclusion" icon={<FiPlus />} onClick={handleAddExclude} />
            </HStack>
            <FormHelperText>
              Wildcards allowed (e.g. "*@company.com" excludes an entire domain). Permanent — these
              never receive a blast, regardless of targeting.
            </FormHelperText>
            {permanentExcludes.length ? (
              <Box mt={2}>
                <HStack flexWrap="wrap" spacing={2}>
                  {permanentExcludes.map((entry) => (
                    <Tag key={entry} borderRadius="full" size="md">
                      <TagLabel>{entry}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveExclude(entry)} />
                    </Tag>
                  ))}
                </HStack>
              </Box>
            ) : null}
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Excluded people</FormLabel>
            <FormHelperText mt={0} mb={2}>
              Specific individuals excluded from the recipient list — add these from the Recipients tab.
            </FormHelperText>
            {excludedPeople.length ? (
              <HStack flexWrap="wrap" spacing={2}>
                {excludedPeople.map((person) => (
                  <Tag key={person.id} borderRadius="full" size="md">
                    <TagLabel>{person.name} — {person.email}</TagLabel>
                    {onExcludedPeopleChange ? (
                      <TagCloseButton
                        onClick={() => onExcludedPeopleChange(excludedPeople.filter((entry) => entry.id !== person.id))}
                      />
                    ) : null}
                  </Tag>
                ))}
              </HStack>
            ) : (
              <Text fontSize="sm" color="gray.400">None</Text>
            )}
          </FormControl>

          <Text fontSize="xs" color="gray.500">
            {effectiveRuleCount} exclusion rule{effectiveRuleCount === 1 ? "" : "s"} applied to this send.
          </Text>
        </VStack>
      </GridItem>
    </Grid>
  );
}
