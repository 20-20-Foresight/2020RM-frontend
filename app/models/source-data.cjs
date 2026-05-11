const PRIMARY_RECORD_TAB_KEY = "primary-record";
const SALESFORCE_BASE_URL = "https://2020-foresight.lightning.force.com";

const SUPPORTED_SOURCE_TABS = [
  {
    key: "salesforce",
    label: "Salesforce",
    aliases: ["salesforce"],
    renderMode: "salesforce-cards"
  },
  {
    key: "revenuebase",
    label: "RevenueBase",
    aliases: ["revenuebase"]
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    aliases: ["linkedin"]
  },
  {
    key: "salesnavigator",
    label: "SalesNavigator",
    aliases: ["salesnavigator", "salesnav"]
  },
  {
    key: "biscred",
    label: "Biscred",
    aliases: ["biscred"]
  },
  {
    key: "bigdough",
    label: "BigDough",
    aliases: ["bigdough"]
  },
  {
    key: "crunchbase",
    label: "Crunchbase",
    aliases: ["crunchbase"]
  },
  {
    key: "preqin",
    label: "Preqin",
    aliases: ["preqin"]
  }
];

const EXTERNAL_ORGANIZATION_PATHS = [
  ["externalOrganizations"],
  ["record", "externalOrganizations"],
  ["record", "external_organizations"],
  ["record", "related", "externalOrganizations"],
  ["record", "related", "external_organizations"],
  ["record", "metadata", "externalOrganizations"]
];

function readTrimmedString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function getNestedValue(value, path) {
  let current = value;

  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeSourceName(value) {
  return readTrimmedString(value)?.toLowerCase() || null;
}

function resolveSupportedSource(value) {
  const normalized = normalizeSourceName(value);
  if (!normalized) {
    return null;
  }

  return (
    SUPPORTED_SOURCE_TABS.find((source) => source.aliases.includes(normalized)) || null
  );
}

function readExternalOrganizationSource(externalOrganization) {
  return (
    readTrimmedString(externalOrganization?.source) ||
    readTrimmedString(externalOrganization?.Source) ||
    readTrimmedString(externalOrganization?.sourceName) ||
    readTrimmedString(externalOrganization?.metadata?.source) ||
    readTrimmedString(externalOrganization?.metadata?.Source) ||
    readTrimmedString(externalOrganization?.metadata?.raw?.source) ||
    readTrimmedString(externalOrganization?.metadata?.raw?.Source) ||
    null
  );
}

function collectExternalOrganizations(data) {
  for (const path of EXTERNAL_ORGANIZATION_PATHS) {
    const value = getNestedValue(data, path);
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function readFirstString(values) {
  for (const value of values) {
    const normalized = readTrimmedString(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeHttpUrl(value) {
  const normalized = readTrimmedString(value);
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(normalized)) {
    return `https://${normalized}`;
  }

  return null;
}

function normalizeLinkedInUrl(value) {
  const normalized = readTrimmedString(value);
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^linkedin\.com\//i.test(normalized) || /^www\.linkedin\.com\//i.test(normalized)) {
    return `https://${normalized}`;
  }

  if (/^[a-z0-9-]+$/i.test(normalized)) {
    return `https://www.linkedin.com/company/${normalized}`;
  }

  return null;
}

function readUrlLabel(value) {
  const normalized = readTrimmedString(value);
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    return url.hostname.replace(/^www\./i, "") || normalized;
  } catch (error) {
    return normalized;
  }
}

function readSalesforceRaw(externalOrganization) {
  return isPlainObject(externalOrganization?.metadata?.raw)
    ? externalOrganization.metadata.raw
    : {};
}

function readSalesforceLocationLabel(externalOrganization) {
  const raw = readSalesforceRaw(externalOrganization);
  const city = readFirstString([
    raw.billing_city,
    raw.BillingAddress?.city,
    raw.BillingCity,
    raw.company_city_c,
    raw.Company_City__c,
    raw.city,
    raw.City
  ]);
  const state = readFirstString([
    raw.billing_state,
    raw.billing_state_code,
    raw.BillingAddress?.state,
    raw.BillingState,
    raw.company_state_c,
    raw.Company_State__c,
    raw.state,
    raw.State,
    raw.BillingStateCode
  ]);
  const country = readFirstString([
    raw.billing_country,
    raw.billing_country_code,
    raw.BillingAddress?.country,
    raw.BillingCountry,
    raw.company_country_c,
    raw.Company_Country__c,
    raw.country,
    raw.Country,
    raw.BillingCountryCode
  ]);

  return [city, state, country].filter(Boolean).join(", ") || null;
}

function readSalesforceTypeLabel(externalOrganization) {
  const raw = readSalesforceRaw(externalOrganization);
  const explicitType = readFirstString([raw.type, raw.Type]);
  if (explicitType) {
    return explicitType;
  }

  const recordType = readFirstString([
    externalOrganization?.metadata?.salesforcerecordtype,
    externalOrganization?.metadata?.salesforceRecordType,
    raw.record_type_name,
    raw.RecordType?.Name
  ]);
  if (recordType) {
    return recordType;
  }

  const genericType = readFirstString([raw.attributes?.type]);
  if (genericType && genericType.toLowerCase() !== "account") {
    return genericType;
  }

  return null;
}

function readSalesforceWebsiteUrl(externalOrganization) {
  const raw = readSalesforceRaw(externalOrganization);
  return normalizeHttpUrl(
    readFirstString([
      externalOrganization?.metadata?.website,
      raw.website,
      raw.Website,
      raw.Website__c
    ])
  );
}

function readSalesforceLinkedInUrl(externalOrganization) {
  const raw = readSalesforceRaw(externalOrganization);
  return normalizeLinkedInUrl(
    readFirstString([
      externalOrganization?.metadata?.socials?.linkedin,
      raw.LinkedInURL__c,
      raw.LID__LinkedIn_Company_Id__c
    ])
  );
}

function buildSalesforceRecordCards(value) {
  const rows = Array.isArray(value) ? value : value ? [value] : [];

  return rows
    .map((externalOrganization, index) => {
      const raw = readSalesforceRaw(externalOrganization);
      const salesforceId = readFirstString([
        raw.salesforce_id,
        externalOrganization?.externalId,
        raw.Id
      ]);
      const websiteUrl = readSalesforceWebsiteUrl(externalOrganization);
      const linkedInUrl = readSalesforceLinkedInUrl(externalOrganization);

      return {
        key:
          readFirstString([
            externalOrganization?.uuid,
            raw.salesforce_id,
            externalOrganization?.externalId,
            raw.Id
          ]) || `salesforce-record-${index}`,
        name: readFirstString([
          raw.name,
          externalOrganization?.name,
          raw.Name
        ]) || "Unnamed Salesforce record",
        href: salesforceId ? `${SALESFORCE_BASE_URL}/${salesforceId}` : null,
        typeLabel: readSalesforceTypeLabel(externalOrganization),
        locationLabel: readSalesforceLocationLabel(externalOrganization),
        websiteUrl,
        websiteLabel: readUrlLabel(websiteUrl) || "Website",
        linkedInUrl,
        linkedInLabel: "LinkedIn"
      };
    })
    .filter((card) => card.name || card.locationLabel || card.websiteUrl || card.linkedInUrl);
}

function buildSourceDataTabs(options = {}) {
  const data = options.data && typeof options.data === "object" ? options.data : {};
  const entityType =
    typeof options.entityType === "string" && options.entityType.trim()
      ? options.entityType.trim()
      : "record";
  const tabs = [
    {
      key: PRIMARY_RECORD_TAB_KEY,
      label: "Primary Record",
      description: `Raw primary ${entityType} record`,
      value: data.record && typeof data.record === "object" ? data.record : null
    }
  ];

  const externalOrganizations = collectExternalOrganizations(data);

  SUPPORTED_SOURCE_TABS.forEach((sourceConfig) => {
    const matches = externalOrganizations.filter((externalOrganization) => {
      const source = readExternalOrganizationSource(externalOrganization);
      if (!source) {
        return false;
      }

      return resolveSupportedSource(source)?.key === sourceConfig.key;
    });

    if (!matches.length) {
      return;
    }

    tabs.push({
      key: `source-${sourceConfig.key}`,
      label: sourceConfig.label,
      description:
        sourceConfig.renderMode === "salesforce-cards"
          ? `${sourceConfig.label} organization records`
          : `Raw ${sourceConfig.label} organization record`,
      renderMode: sourceConfig.renderMode || "json",
      value:
        sourceConfig.renderMode === "salesforce-cards"
          ? matches
          : matches.length === 1
            ? matches[0]
            : matches
    });
  });

  return tabs;
}

function hasSourceDataTabs(tabs) {
  return (Array.isArray(tabs) ? tabs : []).some((tab) => tab?.key !== PRIMARY_RECORD_TAB_KEY);
}

function resolveSourceDataTabKey(tabs, preferredView = "primary") {
  const normalizedTabs = Array.isArray(tabs) ? tabs : [];
  const primaryTab = normalizedTabs.find((tab) => tab?.key === PRIMARY_RECORD_TAB_KEY) || null;

  if (preferredView === "source") {
    const sourceTab = normalizedTabs.find((tab) => tab?.key !== PRIMARY_RECORD_TAB_KEY) || null;
    if (sourceTab) {
      return sourceTab.key;
    }
  }

  return primaryTab?.key || normalizedTabs[0]?.key || PRIMARY_RECORD_TAB_KEY;
}

if (typeof module !== "undefined") {
  module.exports = {
    PRIMARY_RECORD_TAB_KEY,
    SUPPORTED_SOURCE_TABS,
    buildSourceDataTabs,
    buildSalesforceRecordCards,
    collectExternalOrganizations,
    hasSourceDataTabs,
    resolveSourceDataTabKey
  };
}
