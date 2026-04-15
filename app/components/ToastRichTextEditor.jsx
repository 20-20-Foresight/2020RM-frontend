import React from "react";
import { Box } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

/**
 * Renders one client-side Toast UI editor instance.
 * @param {{
 *   value?: string,
 *   onChange?: (value: string) => void,
 *   placeholder?: string,
 *   height?: string
 * }} props
 * @returns {JSX.Element}
 */
export function ToastRichTextEditor({
  value = "",
  onChange,
  placeholder = "",
  height = "240px"
}) {
  const hostRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const lastValueRef = useRef(value);

  onChangeRef.current = onChange;
  valueRef.current = value;
  lastValueRef.current = value;

  useEffect(() => {
    let cancelled = false;

    async function mountEditor() {
      if (!hostRef.current || editorRef.current || typeof window === "undefined") {
        return;
      }

      await import("@toast-ui/editor/dist/toastui-editor.css");
      const { Editor } = await import("@toast-ui/editor");
      if (cancelled || !hostRef.current) {
        return;
      }

      const editor = new Editor({
        el: hostRef.current,
        height,
        initialEditType: "wysiwyg",
        previewStyle: "tab",
        initialValue: "",
        placeholder,
        hideModeSwitch: true,
        usageStatistics: false,
        autofocus: false,
        toolbarItems: [
          ["heading", "bold", "italic", "strike"],
          ["ul", "ol", "task"],
          ["link", "quote", "code"],
          ["image", "table"]
        ]
      });

      editor.setHTML(valueRef.current || "", false);
      editor.changeMode("wysiwyg", true);

      editor.on("change", () => {
        const nextValue = editor.getHTML();
        if (nextValue === lastValueRef.current) {
          return;
        }

        lastValueRef.current = nextValue;
        onChangeRef.current?.(nextValue);
      });

      editorRef.current = editor;
    }

    mountEditor();

    return () => {
      cancelled = true;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [height, placeholder]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    const nextValue = value || "";
    const currentValue = editorRef.current.getHTML();
    if (currentValue !== nextValue) {
      lastValueRef.current = nextValue;
      editorRef.current.setHTML(nextValue, false);
    }

    if (!editorRef.current.isWysiwygMode()) {
      editorRef.current.changeMode("wysiwyg", true);
    }
  }, [value]);

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
      bg="white"
      sx={{
        ".toastui-editor-defaultUI": {
          border: "0",
          display: "flex",
          flexDirection: "column",
          minHeight: height,
          height,
          backgroundColor: "white"
        },
        ".toastui-editor-toolbar, .toastui-editor-defaultUI-toolbar": {
          display: "flex !important",
          flex: "0 0 auto",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.375rem",
          minHeight: "44px",
          px: "0.75rem",
          py: "0.375rem",
          borderBottom: "1px solid",
          borderColor: "gray.200",
          backgroundColor: "gray.50"
        },
        ".toastui-editor-toolbar-group": {
          display: "flex",
          alignItems: "center",
          gap: "0.25rem"
        },
        ".toastui-editor-toolbar-divider": {
          width: "1px",
          alignSelf: "stretch",
          backgroundColor: "gray.200",
          mx: "0.25rem"
        },
        ".toastui-editor-toolbar button, .toastui-editor-defaultUI-toolbar button": {
          minWidth: "30px",
          minHeight: "30px",
          borderRadius: "0.375rem",
          border: "1px solid",
          borderColor: "transparent",
          backgroundColor: "transparent",
          position: "relative",
          color: "gray.700"
        },
        ".toastui-editor-toolbar button:hover, .toastui-editor-defaultUI-toolbar button:hover": {
          backgroundColor: "white",
          borderColor: "gray.200"
        },
        ".toastui-editor-toolbar-icons": {
          backgroundImage: "none !important",
          backgroundColor: "transparent",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0",
          lineHeight: 1
        },
        ".toastui-editor-toolbar-icons::before": {
          fontSize: "14px",
          fontWeight: 700,
          color: "currentColor"
        },
        ".toastui-editor-toolbar-icons.heading::before": {
          content: '"H"'
        },
        ".toastui-editor-toolbar-icons.bold::before": {
          content: '"B"'
        },
        ".toastui-editor-toolbar-icons.italic::before": {
          content: '"I"',
          fontStyle: "italic"
        },
        ".toastui-editor-toolbar-icons.strike::before": {
          content: '"S"',
          textDecoration: "line-through"
        },
        ".toastui-editor-toolbar-icons.bullet-list::before": {
          content: '"•"'
        },
        ".toastui-editor-toolbar-icons.ordered-list::before": {
          content: '"1."',
          fontSize: "11px"
        },
        ".toastui-editor-toolbar-icons.task-list::before": {
          content: '"☑"',
          fontSize: "12px"
        },
        ".toastui-editor-toolbar-icons.link::before": {
          content: '"🔗"',
          fontSize: "12px"
        },
        ".toastui-editor-toolbar-icons.quote::before": {
          content: '"❝"',
          fontSize: "12px"
        },
        ".toastui-editor-toolbar-icons.code::before": {
          content: '"</>"',
          fontSize: "10px",
          fontWeight: 600
        },
        ".toastui-editor-toolbar-icons.image::before": {
          content: '"🖼"',
          fontSize: "12px"
        },
        ".toastui-editor-toolbar-icons.table::before": {
          content: '"▦"',
          fontSize: "12px"
        },
        ".toastui-editor-main": {
          flex: "1 1 auto",
          minHeight: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column"
        },
        ".toastui-editor-main-container": {
          position: "relative",
          flex: "1 1 auto",
          height: "100%"
        },
        ".toastui-editor-md-container": {
          display: "none !important"
        },
        ".toastui-editor-ww-container": {
          display: "block !important",
          flex: "1 1 auto",
          height: "100%",
          overflow: "hidden"
        },
        ".toastui-editor-ww-container > .toastui-editor": {
          height: "100%"
        },
        ".toastui-editor-mode-switch": {
          display: "none !important"
        },
        ".toastui-editor-contents, .toastui-editor-ww-container .ProseMirror": {
          fontSize: "14px",
          lineHeight: 1.6,
          minHeight: "100%",
          padding: "0.875rem 1rem"
        },
        ".toastui-editor-ww-container .toastui-editor-contents": {
          height: "100%",
          overflowY: "auto"
        },
        ".toastui-editor-ww-container .ProseMirror": {
          outline: "none"
        }
      }}
    >
      <Box ref={hostRef} />
    </Box>
  );
}
