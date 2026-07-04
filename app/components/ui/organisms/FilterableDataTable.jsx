import React from "react";
import {
  Badge,
  Box,
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
import { ColumnFilterHeader } from "../molecules/ColumnFilterHeader";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function defaultMatch(value, filterValue, filterType) {
  const normalizedValue = readTrimmedString(value).toLowerCase();
  const normalizedFilter = readTrimmedString(filterValue).toLowerCase();

  if (!normalizedFilter) {
    return true;
  }

  if (filterType === "select") {
    return normalizedValue === normalizedFilter;
  }

  return normalizedValue.includes(normalizedFilter);
}

function resolveFilterValue(column, row) {
  if (typeof column.filter?.getValue === "function") {
    return column.filter.getValue(row);
  }

  const rawValue = row?.[column.key];
  return rawValue == null ? "" : String(rawValue);
}

export function FilterableDataTable({
  columns,
  sections,
  getRowKey,
  getRowProps,
  tableSize = "sm",
}) {
  const [filters, setFilters] = React.useState({});
  const [draftFilters, setDraftFilters] = React.useState({});
  const [openFilterKeys, setOpenFilterKeys] = React.useState({});

  const allRows = React.useMemo(
    () => sections.flatMap((section) => (Array.isArray(section.rows) ? section.rows : [])),
    [sections]
  );

  const resolvedColumns = React.useMemo(
    () =>
      columns.map((column) => {
        const filterConfig = column.filter || null;
        const options =
          filterConfig?.type === "select"
            ? typeof filterConfig.options === "function"
              ? filterConfig.options(allRows)
              : filterConfig.options || []
            : null;

        return {
          ...column,
          filter: filterConfig
            ? {
                ...filterConfig,
                options,
              }
            : null,
        };
      }),
    [allRows, columns]
  );

  const filteredSections = React.useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        filteredRows: (Array.isArray(section.rows) ? section.rows : []).filter((row) =>
          resolvedColumns.every((column) => {
            const filterConfig = column.filter;
            if (!filterConfig || filterConfig.type === "none") {
              return true;
            }

            const activeFilter = filters[column.key];
            if (!readTrimmedString(activeFilter)) {
              return true;
            }

            if (typeof filterConfig.match === "function") {
              return filterConfig.match(row, activeFilter);
            }

            return defaultMatch(
              resolveFilterValue(column, row),
              activeFilter,
              filterConfig.type
            );
          })
        ),
      })),
    [filters, resolvedColumns, sections]
  );

  function toggleFilter(key) {
    setOpenFilterKeys((currentKeys) => ({
      ...currentKeys,
      [key]: !currentKeys[key],
    }));
  }

  function updateDraftFilter(key, value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }

  function applyFilter(key, explicitValue) {
    const nextValue = readTrimmedString(
      typeof explicitValue === "string" ? explicitValue : draftFilters[key]
    );

    setFilters((currentFilters) => {
      if (!nextValue) {
        const nextFilters = { ...currentFilters };
        delete nextFilters[key];
        return nextFilters;
      }

      return {
        ...currentFilters,
        [key]: nextValue,
      };
    });

    setOpenFilterKeys((currentKeys) => ({
      ...currentKeys,
      [key]: false,
    }));
  }

  function clearFilter(key) {
    setFilters((currentFilters) => {
      const nextFilters = { ...currentFilters };
      delete nextFilters[key];
      return nextFilters;
    });

    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [key]: "",
    }));
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      overflow="hidden"
      bg="white"
      boxShadow="sm"
    >
      <Table size={tableSize} variant="simple">
        <Thead>
          <Tr>
            {resolvedColumns.map((column) => (
              <Th
                key={column.key}
                py={2.5}
                color="gray.500"
                fontWeight="semibold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wider"
                w={column.width}
                textAlign={column.align === "right" ? "right" : undefined}
              >
                {column.filter && column.filter.type !== "none" ? (
                  <ColumnFilterHeader
                    columnKey={column.key}
                    label={column.label}
                    isOpen={Boolean(openFilterKeys[column.key])}
                    activeValue={filters[column.key] || ""}
                    draftValue={draftFilters[column.key] || ""}
                    onToggle={() => toggleFilter(column.key)}
                    onDraftChange={(value) => updateDraftFilter(column.key, value)}
                    onApply={(value) => applyFilter(column.key, value)}
                    onClear={() => clearFilter(column.key)}
                    selectOptions={column.filter.options}
                    autoFocus
                  />
                ) : (
                  <Text>{column.label}</Text>
                )}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {filteredSections.map((section) => (
            <React.Fragment key={section.key}>
              {section.hideHeader ? null : (
                <Tr bg="gray.50">
                  <Td colSpan={resolvedColumns.length} py={4}>
                    <VStack align="start" spacing={1}>
                      <HStack spacing={2}>
                        <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                          {section.title}
                        </Text>
                        <Badge colorScheme="gray" variant="subtle" fontSize="xs">
                          {section.filteredRows.length}
                        </Badge>
                      </HStack>
                      {section.description ? (
                        <Text fontSize="xs" color="gray.500">
                          {section.description}
                        </Text>
                      ) : null}
                    </VStack>
                  </Td>
                </Tr>
              )}
              {section.filteredRows.length > 0 ? (
                section.filteredRows.map((row) => {
                  const rowProps = typeof getRowProps === "function" ? getRowProps(row, section) : {};

                  return (
                    <Tr key={getRowKey(row)} _hover={{ bg: "gray.50" }} transition="opacity 0.2s" {...rowProps}>
                      {resolvedColumns.map((column) => (
                        <Td
                          key={`${getRowKey(row)}:${column.key}`}
                          py={3}
                          textAlign={column.align === "right" ? "right" : undefined}
                        >
                          {column.renderCell(row, section)}
                        </Td>
                      ))}
                    </Tr>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan={resolvedColumns.length} py={8}>
                    <Text fontSize="sm" color="gray.500" textAlign="center">
                      {section.emptyText || "No rows match the current filters."}
                    </Text>
                  </Td>
                </Tr>
              )}
            </React.Fragment>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default FilterableDataTable;
