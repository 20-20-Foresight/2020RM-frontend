const test = require("node:test");
const assert = require("node:assert/strict");

test("buildResegmentationImportLookupRequest includes only valid rows with lookup identifiers", async () => {
  const {
    buildResegmentationImportLookupRequest,
  } = await import("../app/models/resegmentation-import-session.mjs");

  const request = buildResegmentationImportLookupRequest([
    {
      rowNumber: 2,
      values: {
        organizationUuid: "org-1",
        organizationName: "Rose Builders Group",
        website: "rosebuilders.com",
      },
      validation: {
        status: "valid",
        messages: [],
      },
    },
    {
      rowNumber: 3,
      values: {
        organizationName: "",
      },
      validation: {
        status: "invalid",
        messages: ["Organization Name is required."],
      },
    },
    {
      rowNumber: 4,
      values: {
        notes: "No lookup identifiers",
      },
      validation: {
        status: "valid",
        messages: [],
      },
    },
  ]);

  assert.deepEqual(request, {
    rows: [
      {
        rowNumber: 2,
        values: {
          organizationUuid: "org-1",
          organizationName: "Rose Builders Group",
          website: "rosebuilders.com",
        },
      },
    ],
  });
});

test("applyResegmentationImportLookupResults merges lookup states by row number", async () => {
  const {
    applyResegmentationImportLookupResults,
  } = await import("../app/models/resegmentation-import-session.mjs");

  const rows = [
    {
      rowNumber: 2,
      validation: {
        status: "valid",
        messages: [],
      },
      lookup: {
        status: "ready_for_lookup",
        messages: [],
        match: null,
      },
      import: {
        status: "idle",
        messages: [],
      },
    },
    {
      rowNumber: 3,
      validation: {
        status: "invalid",
        messages: ["Broken row"],
      },
      lookup: {
        status: "blocked",
        messages: [],
        match: null,
      },
      import: {
        status: "idle",
        messages: [],
      },
    },
  ];

  const nextRows = applyResegmentationImportLookupResults(rows, [
    {
      rowNumber: 2,
      lookup: {
        status: "matched",
        messages: [],
        match: {
          uuid: "org-1",
          name: "Rose Builders Group",
        },
      },
    },
  ]);

  assert.deepEqual(nextRows, [
    {
      rowNumber: 2,
      validation: {
        status: "valid",
        messages: [],
      },
      lookup: {
        status: "matched",
        messages: [],
        match: {
          uuid: "org-1",
          name: "Rose Builders Group",
        },
      },
      import: {
        status: "idle",
        messages: [],
      },
    },
    {
      rowNumber: 3,
      validation: {
        status: "invalid",
        messages: ["Broken row"],
      },
      lookup: {
        status: "blocked",
        messages: [],
        match: null,
      },
      import: {
        status: "idle",
        messages: [],
      },
    },
  ]);
});

test("buildResegmentationImportCommitRequest preserves row order and extra metadata", async () => {
  const {
    buildResegmentationImportCommitRequest,
  } = await import("../app/models/resegmentation-import-session.mjs");

  const request = buildResegmentationImportCommitRequest({
    destinationName: "Resegmentation Test 2026-04-27",
    rows: [
      {
        rowNumber: 2,
        values: {
          notes: "Priority account",
        },
        extraValues: {
          Owner: "Dan",
        },
        lookup: {
          status: "matched",
          match: {
            uuid: "org-1",
          },
        },
      },
      {
        rowNumber: 3,
        values: {
          notes: "Unmatched row",
        },
        extraValues: {
          Owner: "Sam",
        },
        lookup: {
          status: "unmatched",
          match: null,
        },
      },
    ],
    unmatchedColumnBehavior: "save_as_membership_metadata_and_show_in_list_view",
  });

  assert.deepEqual(request, {
    listName: "Resegmentation Test 2026-04-27",
    unmatchedColumnBehavior: "save_as_membership_metadata_and_show_in_list_view",
    listTypeSlug: "LIST",
    listSubTypeSlug: "ORGANIZATION",
    subjectType: "organization",
    membershipMode: "static",
    rows: [
      {
        rowNumber: 2,
        match: {
          uuid: "org-1",
        },
        values: {
          notes: "Priority account",
        },
        extraValues: {
          Owner: "Dan",
        },
      },
    ],
  });
});

test("countImportedMemberships de-duplicates repeated membership uuids", async () => {
  const {
    countImportedMemberships,
  } = await import("../app/models/resegmentation-import-session.mjs");

  assert.equal(
    countImportedMemberships([
      {
        import: {
          status: "imported",
          membershipUuid: "membership-1",
        },
      },
      {
        import: {
          status: "imported",
          membershipUuid: "membership-1",
        },
      },
      {
        import: {
          status: "imported",
          membershipUuid: "membership-2",
        },
      },
    ]),
    2
  );
});
