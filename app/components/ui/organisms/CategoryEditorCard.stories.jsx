import React, { useState } from "react";
import { CategoryEditorCard } from "./CategoryEditorCard";

const dimensionOptions = [
  { id: "focus", label: "Focus" },
  { id: "industry", label: "Industry" }
];

export default {
  title: "Organisms/CategoryEditorCard",
  component: CategoryEditorCard
};

export function Display() {
  return (
    <CategoryEditorCard
      title="3rd Party Property Management"
      dimensionName="Focus"
      descriptionHtml="<p>This is a focus area for <strong>cookies</strong>.</p>"
      examplesText={"CookieOps\nProperty workflows"}
    />
  );
}

export function Saving() {
  return (
    <CategoryEditorCard
      title="3rd Party Property Management"
      dimensionName="Focus"
      descriptionHtml="<p>This is a focus area for <strong>cookies</strong>.</p>"
      examplesText={"CookieOps\nProperty workflows"}
      highlightState="saving"
    />
  );
}

export function Editing() {
  const [draftRow, setDraftRow] = useState({
    id: "focus-3pp",
    label: "3rd Party Property Management",
    dimensionId: "focus",
    description: "<p>This is a focus area for <strong>cookies</strong>.</p>",
    examplesText: "CookieOps\nProperty workflows",
    preference: 2,
    deletedOn: ""
  });

  function updateDraftField(field, value) {
    setDraftRow((currentValue) => ({
      ...currentValue,
      [field]: value
    }));
  }

  return (
    <CategoryEditorCard
      title={draftRow.label}
      isEditing
      supportsPreference
      draftRow={draftRow}
      dimensionOptions={dimensionOptions}
      onDraftChange={updateDraftField}
      onSave={() => {}}
      onCancel={() => {}}
      onToggleRetired={() => {}}
    />
  );
}
