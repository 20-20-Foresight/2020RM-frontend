/**
 * Static configuration for each supported search feed source.
 * Each source defines its label, color, and filter schema.
 * Filters drive the dynamic filter editor in the feed creation/edit form.
 */
export const FEED_SOURCES = {
  preqin: {
    label: "Preqin",
    color: "blue",
    description: "Institutional investors, asset managers, and private market participants",
    filters: {
      investorType: {
        label: "Investor Type",
        type: "multiselect",
        settingsKey: "investorType",
        options: [
          "Wealth Manager",
          "Asset Manager",
          "Fund Manager",
          "Fund of Funds Manager",
          "Family Office - Multi",
          "Family Office - Single",
          "Investment Trust",
          "Investment Company",
          "Investment Bank",
          "Investment Consultant",
          "Private Equity Firm",
          "Hedge Fund",
          "Pension Fund",
          "Endowment"
        ]
      },
      location: {
        label: "Location",
        type: "multiselect",
        settingsKey: "location",
        options: ["us", "uk", "eu", "asia", "global"],
        optionLabels: {
          us: "United States",
          uk: "United Kingdom",
          eu: "Europe",
          asia: "Asia Pacific",
          global: "Global"
        }
      },
      aum: {
        label: "AUM Range (USD mn)",
        type: "range",
        settingsKey: "aum",
        description: "Filter by Assets Under Management. Leave blank for no limit.",
        unit: "mn"
      },
      onlyNewCompanies: {
        label: "New Companies Only",
        type: "checkbox",
        settingsKey: "onlyNewCompanies",
        description: "Page through source results until enough companies not already in CRM are found.",
        summaryValue: "New Companies"
      }
    }
  },
  biscred: {
    label: "Biscred",
    color: "teal",
    description: "Commercial real estate companies via direct Biscred keyword search",
    filters: {
      keywords: {
        label: "Keywords",
        type: "tags",
        settingsKey: "keywords",
        placeholder: "e.g. Data Center, affordable housing, REIT",
        description: "Each term is sent to the Biscred company keyword search"
      }
    }
  },
  revenuebase: {
    label: "RevenueBase",
    color: "purple",
    description: "Company search and enrichment via direct RevenueBase API filters",
    filters: {
      keywords: {
        label: "Keywords",
        type: "tags",
        settingsKey: "keywords",
        placeholder: "e.g. Data Center, power infrastructure, logistics",
        description: "Matches company specialties and descriptive fields"
      },
      industries: {
        label: "Industries",
        type: "tags",
        settingsKey: "industries",
        placeholder: "e.g. Real Estate, Private Equity, Finance",
        description: "Press Enter or comma to add an industry"
      },
      countries: {
        label: "Countries",
        type: "tags",
        settingsKey: "countries",
        placeholder: "e.g. United States, Canada, United Kingdom",
        description: "Optional. Limit RevenueBase results to one or more countries."
      },
      revenueRange: {
        label: "Annual Revenue Range (USD)",
        type: "range",
        settingsKey: "revenueRange",
        description: "Filter companies by annual revenue. Leave blank for no limit.",
        unit: "USD"
      },
      employeeRange: {
        label: "Employee Count Range",
        type: "range",
        settingsKey: "employeeRange",
        description: "Filter companies by headcount. Leave blank for no limit.",
        unit: "employees"
      },
      onlyNewCompanies: {
        label: "New Companies Only",
        type: "checkbox",
        settingsKey: "onlyNewCompanies",
        description: "Page through RevenueBase results until enough companies not already in CRM are found.",
        summaryValue: "New Companies"
      }
    }
  },
  salesforce: {
    label: "Salesforce",
    color: "orange",
    description: "Search existing Salesforce Accounts and queue the ones that need a fresh ESRA run",
    filters: {
      countries: {
        label: "Country",
        type: "tags",
        settingsKey: "countries",
        placeholder: "e.g. US, CA, United States, Canada",
        description: "Optional. Matches Salesforce account billing country."
      },
      stateProvinces: {
        label: "State / Province",
        type: "tags",
        settingsKey: "stateProvinces",
        placeholder: "e.g. TX, NY, Ontario",
        description: "Optional. Matches Salesforce account billing state or province."
      },
      emIndustries: {
        label: "EM Industry",
        type: "tags",
        settingsKey: "emIndustries",
        placeholder: "e.g. REIT, Hospitality, Office",
        description: "Optional. Exact match against Salesforce EM Industry."
      },
      focus: {
        label: "Focus",
        type: "tags",
        settingsKey: "focus",
        placeholder: "e.g. Data Center, Industrial, Multi-family",
        description: "Optional. Each value is matched with LIKE against Salesforce Focus."
      },
      lastEsraOlderThanDays: {
        label: "Days Old",
        type: "number",
        settingsKey: "lastEsraOlderThanDays",
        placeholder: "e.g. 30",
        description: "Only include accounts never ingested or ingested before this cutoff.",
        min: 1,
        summaryLabel: "days old",
        summaryLast: true
      }
    }
  },
  list: {
    label: "List",
    color: "cyan",
    description: "Use an existing organization list or upload a CSV/XLSX file to create one for this feed",
    filters: {
      sourceListName: {
        label: "List",
        type: "listFinder",
        settingsKey: "sourceListName",
        description: "Choose an existing list or upload a CSV/XLSX file to create a new list."
      }
    }
  }
};

/** @type {string[]} */
export const FEED_SOURCE_KEYS = Object.keys(FEED_SOURCES);

/**
 * Returns the static config for one feed source key.
 * @param {string|null|undefined} source
 * @returns {{label: string, color: string, description: string, filters: object}|null}
 */
export function getFeedSourceConfig(source) {
  if (!source) return null;
  return FEED_SOURCES[source.toLowerCase()] || null;
}

/**
 * Returns display label for a source key.
 * @param {string|null|undefined} source
 * @returns {string}
 */
export function getFeedSourceLabel(source) {
  return getFeedSourceConfig(source)?.label || source || "Unknown";
}

/**
 * Returns Chakra color scheme for a source key.
 * @param {string|null|undefined} source
 * @returns {string}
 */
export function getFeedSourceColor(source) {
  return getFeedSourceConfig(source)?.color || "gray";
}
