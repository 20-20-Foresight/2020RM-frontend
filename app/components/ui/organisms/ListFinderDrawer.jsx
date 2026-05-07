import React, { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";

function defaultGetItemId(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  return String(item.uuid || item.id || item.name || "").trim();
}

function defaultGetItemLabel(item) {
  if (!item || typeof item !== "object") {
    return "Untitled item";
  }

  return String(item.name || item.label || item.uuid || item.id || "Untitled item").trim();
}

function defaultGetSearchText(item) {
  if (!item || typeof item !== "object") {
    return "";
  }

  return `${item.name || ""} ${item.uuid || ""} ${item.id || ""}`.trim();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Generic side drawer for finding and selecting one saved list-like record.
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   title?: string,
 *   searchLabel?: string,
 *   searchPlaceholder?: string,
 *   items?: object[],
 *   selectedItemId?: string,
 *   onSelectItem?: (item: object) => void,
 *   createActionLabel?: string,
 *   onCreateAction?: (() => void)|null,
 *   emptyStateMessage?: string,
 *   getItemId?: (item: object) => string,
 *   getItemLabel?: (item: object) => string,
 *   getSearchText?: (item: object) => string,
 *   renderItemMeta?: ((item: object, options: {isSelected: boolean}) => React.ReactNode)|null
 * }} props
 * @returns {JSX.Element}
 */
export default function ListFinderDrawer({
  isOpen,
  onClose,
  title = "Find List",
  searchLabel = "Search Lists",
  searchPlaceholder = "Search by list name",
  items = [],
  selectedItemId = "",
  onSelectItem = () => {},
  createActionLabel = "",
  onCreateAction = null,
  emptyStateMessage = "No matching items were found.",
  getItemId = defaultGetItemId,
  getItemLabel = defaultGetItemLabel,
  getSearchText = defaultGetSearchText,
  renderItemMeta = null,
}) {
  const [query, setQuery] = useState("");
  const normalizedSelectedId = String(selectedItemId || "").trim();
  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const sourceItems = Array.isArray(items) ? items : [];
    if (!normalizedQuery) {
      return sourceItems;
    }

    return sourceItems.filter((item) =>
      normalizeText(getSearchText(item)).includes(normalizedQuery)
    );
  }, [getSearchText, items, query]);

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader borderBottomWidth="1px">{title}</DrawerHeader>
        <DrawerBody>
          <VStack align="stretch" spacing={4} mt={2}>
            <FormControl>
              <FormLabel fontSize="sm">{searchLabel}</FormLabel>
              <Input
                size="sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
              />
            </FormControl>

            {typeof onCreateAction === "function" && createActionLabel ? (
              <Button
                type="button"
                variant="outline"
                colorScheme="blue"
                alignSelf="flex-start"
                onClick={onCreateAction}
              >
                {createActionLabel}
              </Button>
            ) : null}

            <VStack align="stretch" spacing={2}>
              {filteredItems.length ? (
                filteredItems.map((item) => {
                  const itemId = String(getItemId(item) || "").trim();
                  const isSelected = itemId === normalizedSelectedId;
                  return (
                    <Button
                      key={itemId || getItemLabel(item)}
                      type="button"
                      variant={isSelected ? "solid" : "outline"}
                      colorScheme={isSelected ? "blue" : "gray"}
                      justifyContent="space-between"
                      h="auto"
                      py={3}
                      px={3}
                      onClick={() => {
                        onSelectItem(item);
                        onClose();
                      }}
                    >
                      <VStack align="start" spacing={0} flex="1" minW={0}>
                        <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                          {getItemLabel(item)}
                        </Text>
                        {typeof renderItemMeta === "function" ? renderItemMeta(item, { isSelected }) : null}
                      </VStack>
                    </Button>
                  );
                })
              ) : (
                <Alert status="info" borderRadius="lg">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">{emptyStateMessage}</AlertDescription>
                </Alert>
              )}
            </VStack>
          </VStack>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
