import React from "react";
import { ChakraProvider, Box } from "@chakra-ui/react";
import { theme } from "../app/theme";
import "@toast-ui/editor/dist/toastui-editor.css";

/** @type {import('@storybook/react').Preview} */
const preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      expanded: true
    }
  },
  decorators: [
    (Story) => (
      <ChakraProvider theme={theme} resetCSS>
        <Box minH="100vh" bg="gray.50" p={6}>
          <Story />
        </Box>
      </ChakraProvider>
    )
  ]
};

export default preview;
