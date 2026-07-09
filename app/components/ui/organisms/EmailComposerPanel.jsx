import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Box, FormControl, FormLabel, HStack, Input, Select, SimpleGrid, VStack } from "@chakra-ui/react";
import { EmailTemplateVisualEditor } from "./EmailTemplateVisualEditor";

/**
 * Composes the blast email directly in the in-house visual editor instead of
 * drafting in Word and having Research recreate it in Salesforce. Subject,
 * preview text, an optional "start from" template, and the shared
 * header/footer snippet slots (same concept as the Email Templates tool)
 * sit alongside the drag-and-drop body editor. Preview rendering lives in
 * the wizard's separate Preview Email step, not here.
 * @param {{
 *   starterTemplates: Array<{id: string, label: string, subject: string, previewText: string}>,
 *   selectedStarterTemplateId: string,
 *   onSelectStarterTemplate: (id: string) => void,
 *   subject: string,
 *   onSubjectChange: (subject: string) => void,
 *   previewText: string,
 *   onPreviewTextChange: (previewText: string) => void,
 *   headerSnippets: Array<{id: string, label: string}>,
 *   footerSnippets: Array<{id: string, label: string}>,
 *   headerSnippetId: string,
 *   onHeaderSnippetChange: (id: string) => void,
 *   footerSnippetId: string,
 *   onFooterSnippetChange: (id: string) => void,
 *   initialDesign?: object|null
 * }} props
 * @param {import("react").Ref<{exportContent: () => Promise<{design: object|null, html: string, subject: string, previewText: string}>}>} ref
 */
export const EmailComposerPanel = forwardRef(function EmailComposerPanel(
  {
    starterTemplates,
    selectedStarterTemplateId,
    onSelectStarterTemplate,
    subject,
    onSubjectChange,
    previewText,
    onPreviewTextChange,
    headerSnippets,
    footerSnippets,
    headerSnippetId,
    onHeaderSnippetChange,
    footerSnippetId,
    onFooterSnippetChange,
    initialDesign = null,
  },
  ref
) {
  const editorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    async exportContent() {
      const editorContent = (await editorRef.current?.exportContent()) || { design: null, html: "" };
      return { ...editorContent, subject, previewText };
    },
  }));

  return (
    <VStack align="stretch" spacing={3} w="full">
      <HStack spacing={4} align="flex-start">
        <FormControl maxW="280px">
          <FormLabel fontSize="sm">Start from</FormLabel>
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
        <FormControl flex={1}>
          <FormLabel fontSize="sm">Subject</FormLabel>
          <Input value={subject} onChange={(event) => onSubjectChange(event.target.value)} />
        </FormControl>
        <FormControl flex={1}>
          <FormLabel fontSize="sm">Preview text</FormLabel>
          <Input value={previewText} onChange={(event) => onPreviewTextChange(event.target.value)} />
        </FormControl>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">Header Snippet</FormLabel>
          <Select value={headerSnippetId} onChange={(event) => onHeaderSnippetChange(event.target.value)}>
            <option value="">No header</option>
            {headerSnippets.map((snippet) => (
              <option key={snippet.id} value={snippet.id}>
                {snippet.label}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Footer Snippet</FormLabel>
          <Select value={footerSnippetId} onChange={(event) => onFooterSnippetChange(event.target.value)}>
            <option value="">No footer</option>
            {footerSnippets.map((snippet) => (
              <option key={snippet.id} value={snippet.id}>
                {snippet.label}
              </option>
            ))}
          </Select>
        </FormControl>
      </SimpleGrid>

      <Box w="full" flex="1" minH={0}>
        <FormLabel fontSize="sm">Message</FormLabel>
        <EmailTemplateVisualEditor ref={editorRef} minHeight="720px" initialDesign={initialDesign} />
      </Box>
    </VStack>
  );
});
