import React from "react";
import { Box, Text, VStack } from "@chakra-ui/react";
import { EmailTemplateVisualEditor } from "./EmailTemplateVisualEditor";

export default {
  title: "Organisms/EmailTemplateVisualEditor",
  component: EmailTemplateVisualEditor
};

/**
 * The real Unlayer editor is dynamically imported client-side and needs a
 * live DOM mount to render its canvas — Storybook shows the loading state
 * that appears the instant the component mounts, then the editor takes over.
 */
export function Default() {
  return (
    <VStack align="stretch" spacing={3}>
      <Text fontSize="sm" color="gray.600">
        Drag-and-drop email builder used by the Email Templates tool and the Email Blast Request
        composer. Loads the Unlayer editor client-side.
      </Text>
      <Box>
        <EmailTemplateVisualEditor />
      </Box>
    </VStack>
  );
}

export function WithMinHeight() {
  return <EmailTemplateVisualEditor minHeight="320px" />;
}
