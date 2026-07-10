import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Grid,
  GridItem,
  HStack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { AudienceListCard } from "../molecules/AudienceListCard";
import { TargetingFilterBuilder } from "../molecules/TargetingFilterBuilder";
import { getCannedListPage, getCustomQueryPage } from "../../../models/email-blast-mock-data.mjs";

const CUSTOM_LIST_ID = "custom";
const PAGE_SIZE = 25;

function hasAnyFilterSelected(filters) {
  return (
    Boolean(filters?.positionLevels?.length) ||
    Boolean(filters?.disciplines?.length) ||
    Boolean(filters?.regions?.length) ||
    Boolean(filters?.companySizeBands?.length)
  );
}

function PeopleResultsTable({ pageData, onPreviousPage, onNextPage }) {
  return (
    <Box>
      <HStack justify="space-between" mb={3}>
        <Text fontSize="sm" color="gray.600">
          Showing {pageData.people.length ? pageData.page * pageData.pageSize + 1 : 0}
          –{pageData.page * pageData.pageSize + pageData.people.length} of{" "}
          {pageData.total.toLocaleString()}
        </Text>
        <HStack>
          <Button size="sm" variant="outline" onClick={onPreviousPage} isDisabled={pageData.page === 0}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onNextPage}
            isDisabled={pageData.page >= pageData.totalPages - 1}
          >
            Next
          </Button>
        </HStack>
      </HStack>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Title</Th>
            <Th>Company</Th>
            <Th>Email</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pageData.people.map((person) => (
            <Tr key={person.id}>
              <Td fontSize="sm">{person.name}</Td>
              <Td fontSize="sm" color="gray.600">{person.title}</Td>
              <Td fontSize="sm" color="gray.600">{person.company}</Td>
              <Td fontSize="xs" color="gray.500">{person.email}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

/**
 * Tab 1 of the Email Blast Request wizard: a left-hand grid of selectable
 * audience-list cards (plus a "build custom criteria" option) and a
 * right-hand preview — a paginated people table, for either a canned list
 * or a custom targeting query (both use the same preview table; the custom
 * one regenerates as filters change).
 * @param {{
 *   cannedLists: Array<{id: string, label: string, summary: string, approxSize: number}>,
 *   selectedListId: string,
 *   onSelectListId: (id: string) => void,
 *   positionLevelOptions: Array<{key: string, label: string}>,
 *   disciplineOptions: Array<{key: string, label: string}>,
 *   regionOptions: Array<{key: string, label: string}>,
 *   companySizeOptions: Array<{key: string, label: string}>,
 *   customFilters: object,
 *   onCustomFiltersChange: (filters: object) => void
 * }} props
 */
export function RecipientPicker({
  cannedLists,
  selectedListId,
  onSelectListId,
  positionLevelOptions,
  disciplineOptions,
  regionOptions,
  companySizeOptions,
  customFilters,
  onCustomFiltersChange,
}) {
  const [cannedPage, setCannedPage] = useState(0);
  const [customPage, setCustomPage] = useState(0);

  useEffect(() => {
    setCannedPage(0);
  }, [selectedListId]);

  useEffect(() => {
    setCustomPage(0);
  }, [customFilters]);

  const isCustom = selectedListId === CUSTOM_LIST_ID;
  const hasCustomFilters = isCustom && hasAnyFilterSelected(customFilters);
  const cannedPageData = !isCustom && selectedListId ? getCannedListPage(selectedListId, cannedPage, PAGE_SIZE) : null;
  const customPageData = hasCustomFilters ? getCustomQueryPage(customFilters, customPage, PAGE_SIZE) : null;

  return (
    <Grid templateColumns={{ base: "1fr", lg: "320px 1fr" }} gap={6}>
      <GridItem>
        <VStack align="stretch" spacing={3}>
          {cannedLists.map((list) => (
            <AudienceListCard
              key={list.id}
              label={list.label}
              description={list.summary}
              count={list.approxSize}
              isSelected={selectedListId === list.id}
              onClick={() => onSelectListId(list.id)}
            />
          ))}
          <AudienceListCard
            label="Build custom criteria"
            description="Target by position level, discipline, region, and company size"
            isSelected={isCustom}
            onClick={() => onSelectListId(CUSTOM_LIST_ID)}
          />
        </VStack>
      </GridItem>

      <GridItem>
        {isCustom ? (
          <VStack align="stretch" spacing={5}>
            <TargetingFilterBuilder
              positionLevelOptions={positionLevelOptions}
              disciplineOptions={disciplineOptions}
              regionOptions={regionOptions}
              companySizeOptions={companySizeOptions}
              filters={customFilters}
              onFiltersChange={onCustomFiltersChange}
            />
            <Divider />
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                Preview
              </Text>
              {customPageData ? (
                <PeopleResultsTable
                  pageData={customPageData}
                  onPreviousPage={() => setCustomPage((current) => Math.max(0, current - 1))}
                  onNextPage={() =>
                    setCustomPage((current) => Math.min(customPageData.totalPages - 1, current + 1))
                  }
                />
              ) : (
                <Text color="gray.500" fontSize="sm">
                  Set at least one filter above to preview recipients.
                </Text>
              )}
            </Box>
          </VStack>
        ) : cannedPageData ? (
          <PeopleResultsTable
            pageData={cannedPageData}
            onPreviousPage={() => setCannedPage((current) => Math.max(0, current - 1))}
            onNextPage={() => setCannedPage((current) => Math.min(cannedPageData.totalPages - 1, current + 1))}
          />
        ) : (
          <Text color="gray.500" fontSize="sm">
            Select a list to preview recipients.
          </Text>
        )}
      </GridItem>
    </Grid>
  );
}
