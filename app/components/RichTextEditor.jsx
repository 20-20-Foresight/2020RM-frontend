import React, { useEffect } from "react";
import { Box, HStack, IconButton, Tooltip } from "@chakra-ui/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";

const HEADING_CYCLE = [2, 3, null];

function nextHeadingLevel(editor) {
  const currentIndex = HEADING_CYCLE.findIndex((level) =>
    level ? editor.isActive("heading", { level }) : !editor.isActive("heading")
  );
  return HEADING_CYCLE[(currentIndex + 1) % HEADING_CYCLE.length];
}

const TOOLBAR_GROUPS = [
  [
    {
      label: "H",
      isActive: (editor) => editor.isActive("heading"),
      run: (editor) => {
        const level = nextHeadingLevel(editor);
        const chain = editor.chain().focus();
        (level ? chain.toggleHeading({ level }) : chain.setParagraph()).run();
      },
    },
    { label: "B", fontWeight: 700, isActive: (editor) => editor.isActive("bold"), run: (editor) => editor.chain().focus().toggleBold().run() },
    { label: "I", fontStyle: "italic", isActive: (editor) => editor.isActive("italic"), run: (editor) => editor.chain().focus().toggleItalic().run() },
    { label: "S", textDecoration: "line-through", isActive: (editor) => editor.isActive("strike"), run: (editor) => editor.chain().focus().toggleStrike().run() },
  ],
  [
    { label: "•", isActive: (editor) => editor.isActive("bulletList"), run: (editor) => editor.chain().focus().toggleBulletList().run() },
    { label: "1.", fontSize: "11px", isActive: (editor) => editor.isActive("orderedList"), run: (editor) => editor.chain().focus().toggleOrderedList().run() },
    { label: "☑", fontSize: "12px", isActive: (editor) => editor.isActive("taskList"), run: (editor) => editor.chain().focus().toggleTaskList().run() },
  ],
  [
    {
      label: "🔗",
      fontSize: "12px",
      isActive: (editor) => editor.isActive("link"),
      run: (editor) => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run();
          return;
        }
        const url = window.prompt("Link URL");
        if (url) {
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }
      },
    },
    { label: "❝", fontSize: "12px", isActive: (editor) => editor.isActive("blockquote"), run: (editor) => editor.chain().focus().toggleBlockquote().run() },
    { label: "</>", fontSize: "10px", fontWeight: 600, isActive: (editor) => editor.isActive("code"), run: (editor) => editor.chain().focus().toggleCode().run() },
  ],
  [
    {
      label: "🖼",
      fontSize: "12px",
      isActive: () => false,
      run: (editor) => {
        const url = window.prompt("Image URL");
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      },
    },
    {
      label: "▦",
      fontSize: "12px",
      isActive: () => false,
      run: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
  ],
];

function Toolbar({ editor }) {
  return (
    <HStack
      spacing={1}
      px={3}
      py={1.5}
      borderBottomWidth="1px"
      borderColor="gray.200"
      bg="gray.50"
      flexWrap="wrap"
      flexShrink={0}
    >
      {TOOLBAR_GROUPS.map((group, groupIndex) => (
        <HStack key={groupIndex} spacing={1} borderRightWidth={groupIndex < TOOLBAR_GROUPS.length - 1 ? "1px" : 0} borderColor="gray.200" pr={groupIndex < TOOLBAR_GROUPS.length - 1 ? 2 : 0} mr={groupIndex < TOOLBAR_GROUPS.length - 1 ? 1 : 0}>
          {group.map((button) => (
            <Tooltip key={button.label} label="" isDisabled>
              <IconButton
                aria-label={button.label}
                size="xs"
                minW="30px"
                minH="30px"
                variant="ghost"
                bg={button.isActive(editor) ? "white" : "transparent"}
                borderWidth="1px"
                borderColor={button.isActive(editor) ? "gray.200" : "transparent"}
                color="gray.700"
                fontSize={button.fontSize || "14px"}
                fontWeight={button.fontWeight || 700}
                fontStyle={button.fontStyle}
                textDecoration={button.textDecoration}
                onClick={() => button.run(editor)}
                icon={<Box as="span">{button.label}</Box>}
              />
            </Tooltip>
          ))}
        </HStack>
      ))}
    </HStack>
  );
}

/**
 * Renders one client-side Tiptap editor instance. Outputs and accepts real
 * HTML (getHTML()/setContent()) rather than Markdown, so headings/bold/lists
 * survive round-trips intact — this is what replaced Toast UI Editor, whose
 * Markdown-based document model silently stripped inline formatting on every
 * save/load. Heading/paragraph styling is applied via our own CSS below
 * rather than by trying to preserve arbitrary inline styles from pasted Word
 * content, so formatting stays visually consistent across the app.
 * @param {{
 *   value?: string,
 *   onChange?: (value: string) => void,
 *   placeholder?: string,
 *   height?: string
 * }} props
 * @returns {JSX.Element}
 */
export function RichTextEditor({ value = "", onChange, placeholder = "", height = "240px" }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: value,
    onUpdate({ editor: updatedEditor }) {
      onChange?.(updatedEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const nextValue = value || "";
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, false);
    }
  }, [editor, value]);

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
      bg="white"
      display="flex"
      flexDirection="column"
      height={height}
      sx={{
        ".tiptap-content": {
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          padding: "0.875rem 1rem",
        },
        ".ProseMirror": {
          outline: "none",
          fontSize: "14px",
          lineHeight: 1.6,
          minHeight: "100%",
        },
        ".ProseMirror p": { margin: "0 0 0.75em" },
        ".ProseMirror h1": { fontSize: "26px", fontWeight: 700, margin: "0.6em 0 0.4em", color: "gray.800" },
        ".ProseMirror h2": { fontSize: "22px", fontWeight: 700, margin: "0.6em 0 0.4em", color: "#1A202C" },
        ".ProseMirror h3": { fontSize: "16px", fontWeight: 700, margin: "0.6em 0 0.4em", color: "#1A202C" },
        ".ProseMirror ul, .ProseMirror ol": { paddingLeft: "1.4em", margin: "0 0 0.75em" },
        ".ProseMirror ul[data-type='taskList']": { listStyle: "none", paddingLeft: "0.2em" },
        ".ProseMirror ul[data-type='taskList'] li": { display: "flex", alignItems: "flex-start", gap: "0.4em" },
        ".ProseMirror blockquote": {
          borderLeft: "3px solid #CBD5E0",
          margin: "0 0 0.75em",
          paddingLeft: "1em",
          color: "#4A5568",
        },
        ".ProseMirror code": {
          bg: "gray.100",
          borderRadius: "3px",
          px: "0.25em",
          fontSize: "13px",
        },
        ".ProseMirror pre": { bg: "gray.100", borderRadius: "6px", padding: "0.75em", overflowX: "auto" },
        ".ProseMirror a": { color: "blue.600", textDecoration: "underline" },
        ".ProseMirror img": { maxWidth: "100%" },
        ".ProseMirror table": { borderCollapse: "collapse", margin: "0 0 0.75em" },
        ".ProseMirror th, .ProseMirror td": { border: "1px solid #CBD5E0", padding: "0.4em 0.6em" },
        ".ProseMirror th": { bg: "gray.50", fontWeight: 700 },
        ".ProseMirror p.is-editor-empty:first-of-type::before": {
          content: "attr(data-placeholder)",
          color: "gray.400",
          float: "left",
          height: 0,
          pointerEvents: "none",
        },
      }}
    >
      {editor ? <Toolbar editor={editor} /> : null}
      <Box className="tiptap-content">
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
