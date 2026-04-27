import React from "react";
import {
  ImportListDrawer,
  ImportListPlayground,
  RESEGMENTATION_IMPORT_DEMO_CONFIG,
} from "./ImportListDrawer";
import { buildMappedRows } from "../../../models/resegmentation-import.mjs";

const organizationParsedImport = {
  sourceColumns: [
    { sourceKey: "col_0", sourceLabel: "Organization UUID" },
    { sourceKey: "col_1", sourceLabel: "Company" },
    { sourceKey: "col_2", sourceLabel: "Location" },
    { sourceKey: "col_3", sourceLabel: "LinkedIn URL" },
    { sourceKey: "col_4", sourceLabel: "Website" },
    { sourceKey: "col_5", sourceLabel: "Comment" },
  ],
  sourceRows: [
    {
      rowNumber: 2,
      sourceValues: {
        col_0: "7c60d7f0-34c8-4370-84fa-12522d6100b8",
        col_1: "Rose Builders Group",
        col_2: "Greater Chicago Area",
        col_3: "https://www.linkedin.com/company/rose-builders-group/",
        col_4: "https://www.rosebuilders.com/about",
        col_5: "Priority account",
      },
    },
    {
      rowNumber: 3,
      sourceValues: {
        col_0: "",
        col_1: "Beacon Health Partners",
        col_2: "Nashville, TN",
        col_3: "https://www.linkedin.com/company/beacon-health-partners/",
        col_4: "beaconhealthpartners.com",
        col_5: "Bring into test list",
      },
    },
    {
      rowNumber: 4,
      sourceValues: {
        col_0: "",
        col_1: "",
        col_2: "Remote",
        col_3: "linkedin.com/company/not-full-url",
        col_4: "https://invalid example.com",
        col_5: "Should fail validation",
      },
    },
  ],
  totalRowCount: 3,
  omittedRowCount: 0,
};

const organizationSourceToDestination = {
  col_0: "organizationUuid",
  col_1: "organizationName",
  col_2: "location",
  col_3: "linkedin",
  col_4: "website",
  col_5: "skip",
};

const organizationMappedRows = buildMappedRows({
  sourceColumns: organizationParsedImport.sourceColumns,
  sourceRows: organizationParsedImport.sourceRows,
  sourceToDestination: organizationSourceToDestination,
});

const organizationLookupRows = organizationMappedRows.map((row, index) => {
  if (row.validation.status !== "valid") {
    return row;
  }

  return {
    ...row,
    lookup: {
      status: index === 1 ? "unmatched" : "matched",
      messages:
        index === 1
          ? ["No existing organization matched this row."]
          : row.values.organizationUuid
            ? ["Organization UUID was used as the primary match key."]
            : [],
      match:
        index === 1
          ? null
          : {
              uuid: row.values.organizationUuid || `org-${index + 1}`,
              name: row.values.organizationName,
            },
    },
  };
});

const organizationImportedRows = organizationLookupRows.map((row, index) => ({
  ...row,
  import:
    row.lookup.status === "matched"
      ? {
          status: "imported",
          messages: [],
          membershipUuid: `membership-${index + 1}`,
        }
      : {
          status: "skipped",
          messages: ["Only matched organizations can be imported."],
        },
}));

const researchRequestConfig = {
  title: "Import research requests",
  description:
    "The shell stays the same even when the import target changes. Only the config and mapped columns differ.",
  subjectLabelSingular: "request",
  subjectLabelPlural: "requests",
  destinationLabel: "Destination queue",
  maxRows: 50,
  columnDefinitions: [
    {
      key: "requestName",
      label: "Request Name",
      required: true,
    },
    {
      key: "organizationName",
      label: "Target Organization",
      required: true,
    },
    {
      key: "priority",
      label: "Priority",
    },
    {
      key: "notes",
      label: "Notes",
    },
  ],
  destinationMode: "select",
  destinationName: "April Research Queue",
  unmatchedColumnBehavior: "do_not_save",
  validateValues(values) {
    const messages = [];
    if (!String(values.requestName || "").trim()) {
      messages.push("Request Name is required.");
    }
    if (!String(values.organizationName || "").trim()) {
      messages.push("Target Organization is required.");
    }
    return {
      status: messages.length ? "invalid" : "valid",
      messages,
    };
  },
  buildMockLookupRows(rows) {
    return rows.map((row, index) => ({
      ...row,
      lookup:
        row.validation?.status === "valid"
          ? {
              status: "matched",
              messages: [],
              match: {
                uuid: `request-match-${index + 1}`,
                name: row.values.requestName,
              },
            }
          : row.lookup,
    }));
  },
  buildMockImportRows(rows) {
    return rows.map((row, index) => ({
      ...row,
      import:
        row.lookup?.status === "matched"
          ? {
              status: "imported",
              messages: [],
              membershipUuid: `request-membership-${index + 1}`,
            }
          : {
              status: "skipped",
              messages: ["Only matched requests can be imported."],
            },
    }));
  },
};

export default {
  title: "Organisms/ImportListDrawer",
  component: ImportListDrawer,
};

export function Playground() {
  return <ImportListPlayground />;
}

export function MappingAndValidation() {
  return (
    <ImportListDrawer
      isOpen
      onClose={() => {}}
      title={RESEGMENTATION_IMPORT_DEMO_CONFIG.title}
      description={RESEGMENTATION_IMPORT_DEMO_CONFIG.description}
      subjectLabelSingular={RESEGMENTATION_IMPORT_DEMO_CONFIG.subjectLabelSingular}
      subjectLabelPlural={RESEGMENTATION_IMPORT_DEMO_CONFIG.subjectLabelPlural}
      destinationLabel={RESEGMENTATION_IMPORT_DEMO_CONFIG.destinationLabel}
      phase="map"
      parsedImport={organizationParsedImport}
      sourceToDestination={organizationSourceToDestination}
      rows={organizationMappedRows}
      maxRows={RESEGMENTATION_IMPORT_DEMO_CONFIG.maxRows}
      columnDefinitions={RESEGMENTATION_IMPORT_DEMO_CONFIG.columnDefinitions}
      destinationMode="new"
      destinationName="Resegmentation Test 2026-04-27"
      fileName="organization-import.xlsx"
      showOverlay={false}
      allowBackgroundInteraction
    />
  );
}

export function LookupReview() {
  return (
    <ImportListDrawer
      isOpen
      onClose={() => {}}
      title={RESEGMENTATION_IMPORT_DEMO_CONFIG.title}
      description={RESEGMENTATION_IMPORT_DEMO_CONFIG.description}
      subjectLabelSingular={RESEGMENTATION_IMPORT_DEMO_CONFIG.subjectLabelSingular}
      subjectLabelPlural={RESEGMENTATION_IMPORT_DEMO_CONFIG.subjectLabelPlural}
      destinationLabel={RESEGMENTATION_IMPORT_DEMO_CONFIG.destinationLabel}
      phase="lookup"
      parsedImport={organizationParsedImport}
      sourceToDestination={organizationSourceToDestination}
      rows={organizationLookupRows}
      maxRows={RESEGMENTATION_IMPORT_DEMO_CONFIG.maxRows}
      columnDefinitions={RESEGMENTATION_IMPORT_DEMO_CONFIG.columnDefinitions}
      destinationMode="select"
      destinationName="Resegmentation Test 2026-04-27"
      fileName="organization-import.xlsx"
      showOverlay={false}
      allowBackgroundInteraction
    />
  );
}

export function ImportComplete() {
  return (
    <ImportListDrawer
      isOpen
      onClose={() => {}}
      title={RESEGMENTATION_IMPORT_DEMO_CONFIG.title}
      description={RESEGMENTATION_IMPORT_DEMO_CONFIG.description}
      subjectLabelSingular={RESEGMENTATION_IMPORT_DEMO_CONFIG.subjectLabelSingular}
      subjectLabelPlural={RESEGMENTATION_IMPORT_DEMO_CONFIG.subjectLabelPlural}
      destinationLabel={RESEGMENTATION_IMPORT_DEMO_CONFIG.destinationLabel}
      phase="complete"
      parsedImport={organizationParsedImport}
      sourceToDestination={organizationSourceToDestination}
      rows={organizationImportedRows}
      maxRows={RESEGMENTATION_IMPORT_DEMO_CONFIG.maxRows}
      columnDefinitions={RESEGMENTATION_IMPORT_DEMO_CONFIG.columnDefinitions}
      destinationMode="new"
      destinationName="Resegmentation Test 2026-04-27"
      unmatchedColumnBehavior="save_as_membership_metadata_and_show_in_list_view"
      fileName="organization-import.xlsx"
      showOverlay={false}
      allowBackgroundInteraction
    />
  );
}

export function AlternateUseCase() {
  return (
    <ImportListPlayground
      config={researchRequestConfig}
    />
  );
}
