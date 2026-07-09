import React from "react";
import { Box, FormControl, FormLabel, Input, Select, VStack } from "@chakra-ui/react";
import { RichTextField } from "./RichTextField";

/**
 * The recruiter-facing compose step: just a subject, an optional starter
 * template to seed it from, and a plain WYSIWYG body (the same rich text
 * editor used for Notes) that recruiters can paste Word content straight
 * into. Deliberately does not expose the full drag-and-drop email builder —
 * that lives on the research/marketing side (EmailComposerPanel), which
 * turns this text into the final polished email.
 * @param {{
 *   starterTemplates: Array<{id: string, label: string, subject: string, bodyHtml: string}>,
 *   selectedStarterTemplateId: string,
 *   onSelectStarterTemplate: (id: string) => void,
 *   subject: string,
 *   onSubjectChange: (subject: string) => void,
 *   bodyHtml: string,
 *   onBodyHtmlChange: (bodyHtml: string) => void
 * }} props
 */
export function SimpleEmailComposer({
  starterTemplates,
  selectedStarterTemplateId,
  onSelectStarterTemplate,
  subject,
  onSubjectChange,
  bodyHtml,
  onBodyHtmlChange,
}) {
  return (
    <VStack align="stretch" spacing={4} w="full">
      <FormControl>
        <FormLabel fontSize="sm">Subject</FormLabel>
        <Input value={subject} onChange={(event) => onSubjectChange(event.target.value)} />
      </FormControl>

      <FormControl maxW="280px">
        <FormLabel fontSize="sm">Select from template</FormLabel>
        <Select
          placeholder="Blank email"
          value={selectedStarterTemplateId}
          onChange={(event) => onSelectStarterTemplate(event.target.value)}
        >
          {starterTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </Select>
      </FormControl>

      <Box w="50%">
        <RichTextField
          label="Message"
          value={bodyHtml}
          onChange={onBodyHtmlChange}
          placeholder="Write your message, or paste it in from Word..."
          height="420px"
        />
      </Box>
    </VStack>
  );
}
