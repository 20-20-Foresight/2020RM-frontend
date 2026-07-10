import React, { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ExclusionRulesEditor } from "./ExclusionRulesEditor";
import { COOLDOWN_OPTIONS, MOCK_EMAIL_EXCLUSION_LISTS } from "../../../models/email-blast-mock-data.mjs";

export default {
  title: "Organisms/ExclusionRulesEditor",
  component: ExclusionRulesEditor
};

function Playground({
  initialCooldownHours = 48,
  initialExcludes = [],
  initialExcludePersonal = true,
  initialExcludeWork = false,
  initialExcludedPeople = [],
  initialExclusionListIds = [],
}) {
  const [cooldownHours, setCooldownHours] = useState(initialCooldownHours);
  const [permanentExcludes, setPermanentExcludes] = useState(initialExcludes);
  const [excludePersonalEmails, setExcludePersonalEmails] = useState(initialExcludePersonal);
  const [excludeWorkEmails, setExcludeWorkEmails] = useState(initialExcludeWork);
  const [excludedPeople, setExcludedPeople] = useState(initialExcludedPeople);
  const [selectedExclusionListIds, setSelectedExclusionListIds] = useState(initialExclusionListIds);

  return (
    <Box maxW="1100px">
      <ExclusionRulesEditor
        cooldownOptions={COOLDOWN_OPTIONS}
        cooldownHours={cooldownHours}
        onCooldownHoursChange={setCooldownHours}
        excludePersonalEmails={excludePersonalEmails}
        onExcludePersonalEmailsChange={setExcludePersonalEmails}
        excludeWorkEmails={excludeWorkEmails}
        onExcludeWorkEmailsChange={setExcludeWorkEmails}
        permanentExcludes={permanentExcludes}
        onPermanentExcludesChange={setPermanentExcludes}
        excludedPeople={excludedPeople}
        onExcludedPeopleChange={setExcludedPeople}
        exclusionLists={MOCK_EMAIL_EXCLUSION_LISTS}
        selectedExclusionListIds={selectedExclusionListIds}
        onSelectedExclusionListIdsChange={setSelectedExclusionListIds}
      />
    </Box>
  );
}

export function Default() {
  return <Playground />;
}

export function WithOverrides() {
  return <Playground initialExcludes={["board-conflict@meridian.org", "*@pacificventures.com"]} />;
}

export function BothCategoriesOn() {
  return <Playground initialExcludePersonal initialExcludeWork />;
}

export function WithExcludedPeople() {
  return (
    <Playground
      initialExcludedPeople={[
        { id: "p1", name: "Alexandra Grant", email: "alexandra.grant@harringtongroup.com" },
        { id: "p2", name: "Michael Torres", email: "michael.torres@atlanticpartners.com" },
      ]}
    />
  );
}

export function WithExclusionListsSelected() {
  return <Playground initialExclusionListIds={["excl-recent-15d", "excl-existing-clients"]} />;
}
