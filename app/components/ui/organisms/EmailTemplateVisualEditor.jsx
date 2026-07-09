import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Alert, AlertDescription, AlertIcon, Box, Spinner, Text } from "@chakra-ui/react";

/**
 * Resolves the actual React component from the mixed CJS/ESM package shape.
 * @param {Record<string, unknown>|null|undefined} module
 * @returns {import("react").ComponentType<any>|null}
 */
function resolveEmailEditorComponent(module) {
  if (module?.EmailEditor) {
    return module.EmailEditor;
  }

  if (module?.default?.EmailEditor) {
    return module.default.EmailEditor;
  }

  if (module?.default?.default) {
    return module.default.default;
  }

  if (module?.default) {
    return module.default;
  }

  return null;
}

/**
 * Client-only wrapper around the Unlayer React editor.
 * @param {{
 *   initialDesign?: Record<string, unknown>|null,
 *   minHeight?: string
 * }} props
 * @param {import("react").Ref<{exportContent: () => Promise<{design: Record<string, unknown>|null, html: string}>}>} ref
 * @returns {import("react").ReactNode}
 */
export const EmailTemplateVisualEditor = forwardRef(function EmailTemplateVisualEditor(
  {
    initialDesign = null,
    minHeight = "480px"
  },
  ref
) {
  const editorRef = useRef(null);
  const [EditorComponent, setEditorComponent] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    import("react-email-editor")
      .then((module) => {
        if (!isActive) {
          return;
        }

        setEditorComponent(() => resolveEmailEditorComponent(module));
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : "Unable to load the email editor.");
      });

    return () => {
      isActive = false;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    exportContent() {
      return new Promise((resolve) => {
        const editorInstance = editorRef.current?.editor;
        if (!editorInstance || typeof editorInstance.exportHtml !== "function") {
          resolve({
            design: initialDesign,
            html: ""
          });
          return;
        }

        editorInstance.exportHtml((data) => {
          resolve({
            design: data?.design && typeof data.design === "object" ? data.design : null,
            html: typeof data?.html === "string" ? data.html : ""
          });
        });
      });
    }
  }), [initialDesign]);

  /**
   * Loads the current design once the editor is ready.
   */
  function handleReady() {
    setIsReady(true);
    const editorInstance = editorRef.current?.editor;
    if (initialDesign && editorInstance && typeof editorInstance.loadDesign === "function") {
      editorInstance.loadDesign(initialDesign);
    }
  }

  if (loadError) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  if (!EditorComponent) {
    return (
      <Box
        minH={minHeight}
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
        bg="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        gap={2}
      >
        <Spinner size="sm" color="blue.500" />
        <Text fontSize="sm" color="gray.500">Loading email editor…</Text>
      </Box>
    );
  }

  return (
    <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden" bg="white">
      <EditorComponent
        key={JSON.stringify(initialDesign || {})}
        ref={editorRef}
        minHeight={minHeight}
        onReady={handleReady}
        options={{
          appearance: {
            theme: "light"
          },
          features: {
            stockImages: false
          }
        }}
      />
      {!isReady ? (
        <Box px={3} py={2} borderTop="1px solid" borderColor="gray.100" bg="gray.50">
          <Text fontSize="xs" color="gray.500">Preparing canvas…</Text>
        </Box>
      ) : null}
    </Box>
  );
});
