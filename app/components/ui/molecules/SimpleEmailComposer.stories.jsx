import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { SimpleEmailComposer } from "./SimpleEmailComposer";

const STARTER_TEMPLATES = [
  {
    id: "starter-cfo-search",
    label: "CFO / Finance Executive Search",
    subject: "A confidential opportunity for a Finance leader",
    bodyHtml:
      '<h2 style="font-size:22px">Chief Financial Officer</h2><p>We have been retained by a growth-stage company to recruit a <strong>Chief Financial Officer</strong>, and your background stood out right away.</p><h3 style="font-size:16px">Role</h3><p>The Chief Financial Officer will serve as a strategic partner to the CEO and board, overseeing financial planning, capital strategy, and reporting as the business scales.</p><h3 style="font-size:16px">Location</h3><p>Flexible, with a preference for candidates able to travel to the company\'s headquarters periodically.</p>',
  },
  {
    id: "starter-general-es-outreach",
    label: "General Executive Search Outreach",
    subject: "A search you may want to hear about",
    bodyHtml:
      '<h2 style="font-size:22px">A Confidential Search Opportunity</h2><p>We are conducting a confidential retained search on behalf of a well-regarded client, and your background came up right away as a strong fit.</p><h3 style="font-size:16px">Role</h3><p>This is a senior leadership position with broad scope and visibility, suited to someone with a track record of building teams and driving results in a similar industry.</p><h3 style="font-size:16px">Location</h3><p>Flexible. Further details available once we\'ve had a chance to speak.</p>',
  },
];

export default {
  title: "Molecules/SimpleEmailComposer",
  component: SimpleEmailComposer
};

function Playground() {
  const [selectedStarterTemplateId, setSelectedStarterTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  function handleSelectStarterTemplate(templateId) {
    setSelectedStarterTemplateId(templateId);
    const template = STARTER_TEMPLATES.find((entry) => entry.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBodyHtml(template.bodyHtml);
    }
  }

  return (
    <Box maxW="720px">
      <SimpleEmailComposer
        starterTemplates={STARTER_TEMPLATES}
        selectedStarterTemplateId={selectedStarterTemplateId}
        onSelectStarterTemplate={handleSelectStarterTemplate}
        subject={subject}
        onSubjectChange={setSubject}
        bodyHtml={bodyHtml}
        onBodyHtmlChange={setBodyHtml}
      />
    </Box>
  );
}

export function Default() {
  return <Playground />;
}
