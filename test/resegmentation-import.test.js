const test = require("node:test");
const assert = require("node:assert/strict");
const XLSX = require("xlsx");

test("parseImportWorkbook reads the first worksheet and caps rows to maxRows", async () => {
  const {
    parseImportWorkbook,
  } = await import("../app/models/resegmentation-import.mjs");

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Organization Name", "Website"],
    ["Acme Capital", "https://www.acme.com/about"],
    ["Beacon Partners", "beacon.example"],
    ["Cedar Group", "https://cedar.example/path"],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Import");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const parsed = parseImportWorkbook(buffer, { maxRows: 2 });

  assert.deepEqual(parsed.sourceColumns, [
    { sourceKey: "col_0", sourceLabel: "Organization Name" },
    { sourceKey: "col_1", sourceLabel: "Website" },
  ]);
  assert.equal(parsed.totalRowCount, 3);
  assert.equal(parsed.omittedRowCount, 1);
  assert.deepEqual(parsed.sourceRows, [
    {
      rowNumber: 2,
      sourceValues: {
        col_0: "Acme Capital",
        col_1: "https://www.acme.com/about",
      },
    },
    {
      rowNumber: 3,
      sourceValues: {
        col_0: "Beacon Partners",
        col_1: "beacon.example",
      },
    },
  ]);
});

test("normalizeWebsiteToDomain strips protocol, path, and www", async () => {
  const {
    normalizeWebsiteToDomain,
  } = await import("../app/models/resegmentation-import.mjs");

  assert.equal(
    normalizeWebsiteToDomain("https://www.example.com/path?q=1"),
    "example.com"
  );
  assert.equal(normalizeWebsiteToDomain("subdomain.example.com/hello"), "subdomain.example.com");
  assert.equal(normalizeWebsiteToDomain(""), "");
});

test("buildInitialColumnMapping auto-matches expected import aliases", async () => {
  const {
    buildInitialColumnMapping,
  } = await import("../app/models/resegmentation-import.mjs");

  const mapping = buildInitialColumnMapping([
    { sourceKey: "col_0", sourceLabel: "Organization UUID" },
    { sourceKey: "col_1", sourceLabel: "Company" },
    { sourceKey: "col_2", sourceLabel: "LinkedIn URL" },
    { sourceKey: "col_3", sourceLabel: "Custom Comment" },
  ]);

  assert.deepEqual(mapping, {
    col_0: "organizationUuid",
    col_1: "organizationName",
    col_2: "linkedin",
    col_3: "skip",
  });
});

test("buildInitialColumnMapping infers common import columns from labels and sample values", async () => {
  const {
    buildInitialColumnMapping,
  } = await import("../app/models/resegmentation-import.mjs");

  const mapping = buildInitialColumnMapping(
    [
      { sourceKey: "col_0", sourceLabel: "Record ID" },
      { sourceKey: "col_1", sourceLabel: "Company" },
      { sourceKey: "col_2", sourceLabel: "Profile" },
      { sourceKey: "col_3", sourceLabel: "URL" },
      { sourceKey: "col_4", sourceLabel: "Where" },
    ],
    [
      {
        rowNumber: 2,
        sourceValues: {
          col_0: "7c60d7f0-34c8-4370-84fa-12522d6100b8",
          col_1: "Rose Builders Group",
          col_2: "https://www.linkedin.com/company/rose-builders-group/",
          col_3: "https://www.rosebuilders.com/about",
          col_4: "Greater Chicago Area",
        },
      },
      {
        rowNumber: 3,
        sourceValues: {
          col_0: "8c60d7f0-34c8-4370-84fa-12522d6100b8",
          col_1: "Beacon Health Partners",
          col_2: "https://www.linkedin.com/company/beacon-health-partners/",
          col_3: "beaconhealthpartners.com",
          col_4: "Nashville, TN",
        },
      },
    ]
  );

  assert.deepEqual(mapping, {
    col_0: "organizationUuid",
    col_1: "organizationName",
    col_2: "linkedin",
    col_3: "website",
    col_4: "location",
  });
});

test("buildMappedRows normalizes website values and blocks invalid rows", async () => {
  const {
    buildMappedRows,
  } = await import("../app/models/resegmentation-import.mjs");

  const rows = buildMappedRows({
    sourceColumns: [
      { sourceKey: "col_0", sourceLabel: "Company" },
      { sourceKey: "col_1", sourceLabel: "Website" },
      { sourceKey: "col_2", sourceLabel: "LinkedIn URL" },
      { sourceKey: "col_3", sourceLabel: "Comment" },
    ],
    sourceRows: [
      {
        rowNumber: 2,
        sourceValues: {
          col_0: "Acme Capital",
          col_1: "https://www.acme.com/about",
          col_2: "https://www.linkedin.com/company/acme-capital/",
          col_3: "Priority account",
        },
      },
      {
        rowNumber: 3,
        sourceValues: {
          col_0: "",
          col_1: "https://www.example.com",
          col_2: "linkedin.com/company/not-full-url",
          col_3: "Missing name",
        },
      },
    ],
    sourceToDestination: {
      col_0: "organizationName",
      col_1: "website",
      col_2: "linkedin",
      col_3: "skip",
    },
  });

  assert.equal(rows[0].values.website, "acme.com");
  assert.equal(rows[0].validation.status, "valid");
  assert.deepEqual(rows[0].extraValues, {
    Comment: "Priority account",
  });

  assert.equal(rows[1].validation.status, "invalid");
  assert.deepEqual(rows[1].validation.messages, [
    "Organization Name is required when Organization UUID is not supplied.",
    "LinkedIn must be a full LinkedIn organization URL.",
  ]);
  assert.equal(rows[1].lookup.status, "blocked");
});
