const test = require("node:test");
const assert = require("node:assert/strict");

test("estimateAudienceSize returns the full base pool when no filters are set", async () => {
  const { estimateAudienceSize } = await import("../app/models/email-blast-mock-data.mjs");

  const size = estimateAudienceSize({
    positionLevels: [],
    disciplines: [],
    regions: [],
    companySizeBands: [],
  });

  assert.ok(size > 0);
});

test("estimateAudienceSize narrows as more filter dimensions are applied", async () => {
  const { estimateAudienceSize } = await import("../app/models/email-blast-mock-data.mjs");

  const unfiltered = estimateAudienceSize({
    positionLevels: [],
    disciplines: [],
    regions: [],
    companySizeBands: [],
  });
  const narrowed = estimateAudienceSize({
    positionLevels: ["c-suite"],
    disciplines: ["finance"],
    regions: ["northeast"],
    companySizeBands: ["under-500"],
  });

  assert.ok(narrowed < unfiltered);
});

test("estimateAudienceSize is deterministic for the same filters", async () => {
  const { estimateAudienceSize } = await import("../app/models/email-blast-mock-data.mjs");

  const filters = {
    positionLevels: ["vp"],
    disciplines: ["technology"],
    regions: ["west"],
    companySizeBands: ["500-5000"],
  };

  assert.equal(estimateAudienceSize(filters), estimateAudienceSize(filters));
});

test("estimateAudienceSize never returns a negative count", async () => {
  const { estimateAudienceSize } = await import("../app/models/email-blast-mock-data.mjs");

  const size = estimateAudienceSize({
    positionLevels: ["c-suite", "svp-evp", "vp", "director", "manager", "individual-contributor"],
    disciplines: ["hr", "finance", "technology", "operations", "sales-marketing", "legal"],
    regions: ["northeast", "mid-atlantic", "southeast", "midwest", "southwest", "west"],
    companySizeBands: ["under-500", "500-5000", "5000-20000", "over-20000"],
  });

  assert.ok(size >= 0);
});

test("statusIndex resolves known statuses and falls back to 0 for unknown ones", async () => {
  const { statusIndex } = await import("../app/models/email-blast-mock-data.mjs");

  assert.equal(statusIndex("draft"), 0);
  assert.equal(statusIndex("sent"), 5);
  assert.equal(statusIndex("not-a-real-status"), 0);
});

test("getCannedListPage returns a full page sized to pageSize and totals matching approxSize", async () => {
  const { getCannedListPage, CANNED_AUDIENCE_LISTS } = await import("../app/models/email-blast-mock-data.mjs");

  const list = CANNED_AUDIENCE_LISTS[0];
  const firstPage = getCannedListPage(list.id, 0, 25);

  assert.equal(firstPage.people.length, 25);
  assert.equal(firstPage.total, list.approxSize);
  assert.equal(firstPage.page, 0);
  assert.ok(firstPage.people.every((person) => person.name && person.email));
});

test("getCannedListPage is deterministic and pages don't overlap", async () => {
  const { getCannedListPage, CANNED_AUDIENCE_LISTS } = await import("../app/models/email-blast-mock-data.mjs");

  const list = CANNED_AUDIENCE_LISTS[0];
  const pageOneAgain = getCannedListPage(list.id, 0, 25);
  const pageOne = getCannedListPage(list.id, 0, 25);
  const pageTwo = getCannedListPage(list.id, 1, 25);

  assert.deepEqual(pageOne.people, pageOneAgain.people);
  const pageOneIds = new Set(pageOne.people.map((p) => p.id));
  assert.ok(pageTwo.people.every((p) => !pageOneIds.has(p.id)));
});

test("getCannedListPage clamps to the last page when asked to go past the end", async () => {
  const { getCannedListPage, CANNED_AUDIENCE_LISTS } = await import("../app/models/email-blast-mock-data.mjs");

  const list = CANNED_AUDIENCE_LISTS.find((entry) => entry.approxSize < 500) || CANNED_AUDIENCE_LISTS[0];
  const farPage = getCannedListPage(list.id, 9999, 25);

  assert.equal(farPage.page, farPage.totalPages - 1);
  assert.ok(farPage.people.length > 0);
});

test("isServiceClientManager matches only the client manager's exact name", async () => {
  const { isServiceClientManager } = await import("../app/models/email-blast-mock-data.mjs");

  const service = { clientManager: "Tom B." };
  assert.equal(isServiceClientManager(service, "Tom B."), true);
  assert.equal(isServiceClientManager(service, "Sarah K."), false);
  assert.equal(isServiceClientManager(null, "Tom B."), false);
  assert.equal(isServiceClientManager({}, "Tom B."), false);
});

test("getClientEmailDomain derives the domain from the primary contact's email", async () => {
  const { getClientEmailDomain } = await import("../app/models/email-blast-mock-data.mjs");

  const service = { primaryContact: { email: "azillig@fallon.com" }, company: { name: "The Fallon Company" } };
  assert.equal(getClientEmailDomain(service), "fallon.com");
});

test("getClientEmailDomain falls back to a slugified company name when there's no contact email", async () => {
  const { getClientEmailDomain } = await import("../app/models/email-blast-mock-data.mjs");

  const service = { company: { name: "The Fallon Company" } };
  assert.equal(getClientEmailDomain(service), "falloncompany.com");
});

test("getClientEmailDomain returns an empty string when there's nothing to derive from", async () => {
  const { getClientEmailDomain } = await import("../app/models/email-blast-mock-data.mjs");

  assert.equal(getClientEmailDomain(null), "");
  assert.equal(getClientEmailDomain({}), "");
});

test("getCustomQueryPage total matches estimateAudienceSize for the same filters", async () => {
  const { getCustomQueryPage, estimateAudienceSize } = await import("../app/models/email-blast-mock-data.mjs");

  const filters = { positionLevels: ["c-suite"], disciplines: ["finance"], regions: [], companySizeBands: [] };
  const page = getCustomQueryPage(filters, 0, 25);

  assert.equal(page.total, estimateAudienceSize(filters));
});

test("getCustomQueryPage changes its preview when filters change", async () => {
  const { getCustomQueryPage } = await import("../app/models/email-blast-mock-data.mjs");

  const pageA = getCustomQueryPage({ positionLevels: ["c-suite"], disciplines: [], regions: [], companySizeBands: [] }, 0, 25);
  const pageB = getCustomQueryPage({ positionLevels: ["manager"], disciplines: [], regions: [], companySizeBands: [] }, 0, 25);

  assert.notDeepEqual(pageA.people, pageB.people);
});

test("splitChunkByValues produces exactly two chunks summing to the original size", async () => {
  const { splitChunkByValues } = await import("../app/models/email-blast-mock-data.mjs");

  const chunk = { label: "All Recipients", estimatedSize: 1200 };
  const [first, second] = splitChunkByValues(chunk, "position-level", ["c-suite", "svp-evp"]);

  assert.equal(first.estimatedSize + second.estimatedSize, 1200);
  assert.ok(first.label.includes("Position Level"));
  assert.equal(first.status, "scheduled");
  assert.equal(first.scheduledAt, null);
  assert.equal(second.status, "scheduled");
});

test("splitChunkByValues sizes the first chunk proportionally to the selected share of values", async () => {
  const { splitChunkByValues, CHUNK_SPLIT_TYPES } = await import("../app/models/email-blast-mock-data.mjs");

  const positionLevelCount = CHUNK_SPLIT_TYPES.find((t) => t.key === "position-level").options.length;
  const chunk = { label: "All Recipients", estimatedSize: positionLevelCount * 100 };
  const [first] = splitChunkByValues(chunk, "position-level", ["c-suite"]);

  assert.equal(first.estimatedSize, 100);
});

test("splitChunkByCount splits an unevenly-divisible chunk into full batches plus a remainder", async () => {
  const { splitChunkByCount } = await import("../app/models/email-blast-mock-data.mjs");

  const chunks = splitChunkByCount({ label: "All Recipients", estimatedSize: 4343 }, 500);

  assert.equal(chunks.length, 9);
  assert.ok(chunks.slice(0, 8).every((c) => c.estimatedSize === 500));
  assert.equal(chunks[8].estimatedSize, 343);
  assert.equal(chunks.reduce((sum, c) => sum + c.estimatedSize, 0), 4343);
});

test("splitChunkByCount splits an evenly-divisible chunk with no remainder chunk", async () => {
  const { splitChunkByCount } = await import("../app/models/email-blast-mock-data.mjs");

  const chunks = splitChunkByCount({ label: "All Recipients", estimatedSize: 1000 }, 500);

  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((c) => c.estimatedSize === 500));
});

test("getChunkPeoplePage returns a page sized to the chunk's own estimatedSize", async () => {
  const { getChunkPeoplePage } = await import("../app/models/email-blast-mock-data.mjs");

  const chunk = { id: "chunk-test-1", estimatedSize: 40 };
  const firstPage = getChunkPeoplePage(chunk, 0, 25);
  const secondPage = getChunkPeoplePage(chunk, 1, 25);

  assert.equal(firstPage.total, 40);
  assert.equal(firstPage.people.length, 25);
  assert.equal(secondPage.people.length, 15);
  assert.ok(firstPage.people.every((person) => person.name && person.email));
});

test("getChunkPeoplePage gives different chunks distinct people even at the same size", async () => {
  const { getChunkPeoplePage } = await import("../app/models/email-blast-mock-data.mjs");

  const pageA = getChunkPeoplePage({ id: "chunk-test-a", estimatedSize: 10 }, 0, 25);
  const pageB = getChunkPeoplePage({ id: "chunk-test-b", estimatedSize: 10 }, 0, 25);

  assert.notDeepEqual(pageA.people, pageB.people);
});

test("derivePersonSendStatus reflects the chunk's lifecycle stage", async () => {
  const { derivePersonSendStatus } = await import("../app/models/email-blast-mock-data.mjs");

  assert.equal(derivePersonSendStatus("scheduled", 0), "Not sent yet");
  assert.equal(derivePersonSendStatus("queued", 3), "Queued");
  assert.ok(["Delivered", "Sending"].includes(derivePersonSendStatus("processing", 0)));
  assert.ok(["Delivered", "Opened", "Clicked", "Bounced"].includes(derivePersonSendStatus("completed", 0)));
});

test("derivePersonSendStatus is deterministic for the same chunk status and index", async () => {
  const { derivePersonSendStatus } = await import("../app/models/email-blast-mock-data.mjs");

  assert.equal(derivePersonSendStatus("completed", 7), derivePersonSendStatus("completed", 7));
});
