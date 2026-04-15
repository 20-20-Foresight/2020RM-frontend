import React from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  Text,
  Textarea,
  VStack
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";
import { SurfaceCard } from "../atoms/SurfaceCard";
import { LabeledContentBlock } from "../molecules/LabeledContentBlock";
import { RichTextField } from "../molecules/RichTextField";

/**
 * Reads a trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Returns whether one category row is retired.
 * @param {{deletedOn?: string}} row
 * @returns {boolean}
 */
function isRetiredRow(row) {
  return Boolean(readTrimmedString(row?.deletedOn));
}

/**
 * Renders trusted HTML content produced by the rich text editor.
 * @param {{html?: string}} props
 * @returns {JSX.Element|null}
 */
function DescriptionMarkup({ html = "" }) {
  if (!readTrimmedString(html)) {
    return null;
  }

  return (
    <Box
      color="gray.700"
      sx={{
        p: { marginBottom: "0.75rem" },
        "p:last-of-type": { marginBottom: 0 },
        ul: { paddingLeft: "1.25rem", marginBottom: "0.75rem" },
        ol: { paddingLeft: "1.25rem", marginBottom: "0.75rem" }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Renders one category card in either display or edit mode.
 * @param {{
 *   title: string,
 *   retired?: boolean,
 *   highlightState?: "saving"|"saved"|null,
 *   isEditing?: boolean,
 *   supportsPreference?: boolean,
 *   draftRow?: {
 *     id?: string,
 *     label?: string,
 *     dimensionId?: string,
 *     description?: string,
 *     examplesText?: string,
 *     preference?: number|null,
 *     deletedOn?: string
 *   }|null,
 *   dimensionName?: string,
 *   descriptionHtml?: string,
 *   examplesText?: string,
 *   dimensionOptions?: Array<{id: string, label: string}>,
 *   onEdit?: () => void,
 *   onSave?: () => void,
 *   onCancel?: () => void,
 *   onToggleRetired?: () => void,
 *   onDraftChange?: (field: string, value: string|number|null) => void
 * }} props
 * @returns {JSX.Element}
 */
export function CategoryEditorCard({
  title,
  retired = false,
  highlightState = null,
  isEditing = false,
  supportsPreference = false,
  draftRow = null,
  dimensionName = "",
  descriptionHtml = "",
  examplesText = "",
  dimensionOptions = [],
  onEdit,
  onSave,
  onCancel,
  onToggleRetired,
  onDraftChange
}) {
  const tone = isEditing ? "editing" : highlightState === "saving" ? "saving" : highlightState === "saved" ? "saved" : "default";

  return (
    <SurfaceCard tone={tone}>
      {isEditing && draftRow ? (
        <VStack align="stretch" spacing={4}>
          <Flex justify="space-between" align="start" gap={4}>
            <Heading size="sm">{readTrimmedString(draftRow.id) ? "Edit Category" : "New Category"}</Heading>
            {onToggleRetired ? (
              <Button size="sm" variant="ghost" colorScheme={isRetiredRow(draftRow) ? "green" : "red"} onClick={onToggleRetired}>
                {isRetiredRow(draftRow) ? "Restore" : "Retire"}
              </Button>
            ) : null}
          </Flex>

          <FormControl>
            <FormLabel>Name</FormLabel>
            <Input value={draftRow.label || ""} onChange={(event) => onDraftChange?.("label", event.target.value)} bg="white" />
          </FormControl>

          <FormControl>
            <FormLabel>Dimension</FormLabel>
            <Select value={draftRow.dimensionId || ""} onChange={(event) => onDraftChange?.("dimensionId", event.target.value)} bg="white">
              <option value="">Select a dimension</option>
              {dimensionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormControl>

          <RichTextField
            label="Description"
            value={draftRow.description || ""}
            onChange={(value) => onDraftChange?.("description", value)}
            height="280px"
          />

          <FormControl>
            <FormLabel>Examples</FormLabel>
            <Textarea
              value={draftRow.examplesText || ""}
              onChange={(event) => onDraftChange?.("examplesText", event.target.value)}
              minH="112px"
              bg="white"
              placeholder="One or more examples"
            />
          </FormControl>

          {supportsPreference && draftRow.preference ? (
            <Text color="gray.500" fontSize="sm">
              {`Preference order: ${draftRow.preference}`}
            </Text>
          ) : null}

          <HStack justify="flex-end" spacing={3}>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={onSave}>
              Save
            </Button>
          </HStack>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4}>
          <Flex justify="space-between" align="start" gap={4}>
            <Box>
              <Heading size="md">{title || "Untitled Category"}</Heading>
              <HStack spacing={2} mt={2} flexWrap="wrap">
                {dimensionName ? <Badge colorScheme="gray">{dimensionName}</Badge> : null}
                {retired ? <Badge colorScheme="red">Retired</Badge> : null}
              </HStack>
            </Box>

            <HStack spacing={2}>
              {onToggleRetired ? (
                <Button size="sm" variant="ghost" colorScheme={retired ? "green" : "red"} onClick={onToggleRetired}>
                  {retired ? "Restore" : "Retire"}
                </Button>
              ) : null}
              <Button size="sm" leftIcon={<EditIcon />} variant="outline" colorScheme="blue" onClick={onEdit}>
                Edit
              </Button>
            </HStack>
          </Flex>

          <LabeledContentBlock label="Description:" emptyText="No description">
            <DescriptionMarkup html={descriptionHtml} />
          </LabeledContentBlock>

          {readTrimmedString(examplesText) ? (
            <LabeledContentBlock label="Examples:">
              <Text color="gray.700" whiteSpace="pre-wrap">
                {examplesText}
              </Text>
            </LabeledContentBlock>
          ) : null}
        </VStack>
      )}
    </SurfaceCard>
  );
}
