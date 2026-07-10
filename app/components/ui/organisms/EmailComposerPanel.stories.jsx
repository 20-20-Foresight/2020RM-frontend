import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { EmailComposerPanel } from "./EmailComposerPanel";
import {
  MOCK_EMAIL_FOOTER_SNIPPETS,
  MOCK_EMAIL_HEADER_SNIPPETS,
  MOCK_EMAIL_STARTER_TEMPLATES,
  SAMPLE_COMPOSE_DESIGN,
} from "../../../models/email-blast-mock-data.mjs";

export default {
  title: "Organisms/EmailComposerPanel",
  component: EmailComposerPanel
};

function Playground({ initialDesign = null }) {
  const [selectedStarterTemplateId, setSelectedStarterTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [headerSnippetId, setHeaderSnippetId] = useState("header-standard");
  const [footerSnippetId, setFooterSnippetId] = useState("footer-standard");

  return (
    <Box maxW="960px">
      <EmailComposerPanel
        starterTemplates={MOCK_EMAIL_STARTER_TEMPLATES}
        selectedStarterTemplateId={selectedStarterTemplateId}
        onSelectStarterTemplate={setSelectedStarterTemplateId}
        subject={subject}
        onSubjectChange={setSubject}
        previewText={previewText}
        onPreviewTextChange={setPreviewText}
        headerSnippets={MOCK_EMAIL_HEADER_SNIPPETS}
        footerSnippets={MOCK_EMAIL_FOOTER_SNIPPETS}
        headerSnippetId={headerSnippetId}
        onHeaderSnippetChange={setHeaderSnippetId}
        footerSnippetId={footerSnippetId}
        onFooterSnippetChange={setFooterSnippetId}
        initialDesign={initialDesign}
      />
    </Box>
  );
}

export function Default() {
  return <Playground />;
}

export function WithSampleContent() {
  return <Playground initialDesign={SAMPLE_COMPOSE_DESIGN} />;
}
