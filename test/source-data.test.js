const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PRIMARY_RECORD_TAB_KEY,
  buildSourceDataTabs,
  buildSalesforceRecordCards,
  hasSourceDataTabs,
  resolveSourceDataTabKey
} = require("../app/models/source-data");

test("buildSourceDataTabs returns primary and supported source tabs in display order", () => {
  const tabs = buildSourceDataTabs({
    entityType: "organization",
    data: {
      record: {
        uuid: "org-1",
        externalOrganizations: [
          { uuid: "ext-sf", source: "salesforce" },
          { uuid: "ext-ln", source: "linkedin", profile: "linkedin-row" },
          { uuid: "ext-sn", source: "salesnav", profile: "salesnav-row" },
          { uuid: "ext-cb", source: "crunchbase", profile: "crunchbase-row" },
          { uuid: "ext-unknown", source: "pitchbook" }
        ]
      }
    }
  });

  assert.deepEqual(
    tabs.map((tab) => tab.label),
    ["Primary Record", "Salesforce", "LinkedIn", "SalesNavigator", "Crunchbase"]
  );
  assert.equal(Array.isArray(tabs[1].value), true);
  assert.equal(tabs[1].value[0].uuid, "ext-sf");
  assert.equal(tabs[2].value.uuid, "ext-ln");
  assert.equal(tabs[3].value.uuid, "ext-sn");
  assert.equal(tabs[4].value.uuid, "ext-cb");
});

test("buildSourceDataTabs groups duplicate source rows into one tab payload", () => {
  const tabs = buildSourceDataTabs({
    data: {
      externalOrganizations: [
        { uuid: "ext-1", source: "biscred" },
        { uuid: "ext-2", source: "biscred" }
      ]
    }
  });
  const biscredTab = tabs.find((tab) => tab.label === "Biscred");

  assert.ok(Array.isArray(biscredTab.value));
  assert.deepEqual(
    biscredTab.value.map((record) => record.uuid),
    ["ext-1", "ext-2"]
  );
});

test("buildSalesforceRecordCards formats Salesforce rows as linked cards", () => {
  const cards = buildSalesforceRecordCards([
    {
      uuid: "ext-sf-1",
      name: "Acme Salesforce",
      source: "salesforce",
      externalId: "001ABC",
      metadata: {
        salesforcerecordtype: "Satellite Office",
        website: "acme.example",
        socials: {
          linkedin: "linkedin.com/company/acme"
        },
        raw: {
          name: "Acme (Chicago Office)",
          salesforce_id: "001ABC",
          billing_city: "Chicago",
          billing_state: "Illinois",
          billing_country: "United States",
          website: "acme.example"
        }
      }
    }
  ]);

  assert.deepEqual(cards, [
    {
      key: "ext-sf-1",
      name: "Acme (Chicago Office)",
      href: "https://2020-foresight.lightning.force.com/001ABC",
      typeLabel: "Satellite Office",
      locationLabel: "Chicago, Illinois, United States",
      websiteUrl: "https://acme.example",
      websiteLabel: "acme.example",
      linkedInUrl: "https://linkedin.com/company/acme",
      linkedInLabel: "LinkedIn"
    }
  ]);
});

test("resolveSourceDataTabKey prefers the first source tab and falls back to primary", () => {
  const tabs = buildSourceDataTabs({
    data: {
      record: {
        uuid: "org-1",
        related: {
          externalOrganizations: [{ uuid: "ext-1", source: "preqin" }]
        }
      }
    }
  });

  assert.equal(hasSourceDataTabs(tabs), true);
  assert.equal(resolveSourceDataTabKey(tabs, "source"), "source-preqin");
  assert.equal(resolveSourceDataTabKey(tabs, "primary"), PRIMARY_RECORD_TAB_KEY);
});
