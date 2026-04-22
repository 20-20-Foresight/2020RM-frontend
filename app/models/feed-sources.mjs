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
      }
    }
  },
  biscred: {
    label: "Biscred",
    color: "teal",
    description: "Commercial real estate companies — developers, investors, and operators",
    filters: {
      assetClasses: {
        label: "Asset Classes",
        type: "multiselect",
        settingsKey: "assetClasses",
        options: [
          "Data Center",
          "Affordable Housing",
          "Land",
          "Senior Living",
          "Life Sciences",
          "Industrial",
          "Retail",
          "Office",
          "Multifamily",
          "Hotel / Hospitality",
          "Healthcare",
          "Mixed Use",
          "Self Storage",
          "Student Housing"
        ]
      },
      industries: {
        label: "Industries",
        type: "multiselect",
        settingsKey: "industries",
        options: [
          "Developer",
          "Institutional Investor",
          "Real Estate Investment Firm",
          "Real Estate Investment Trust (REIT)",
          "Private Equity",
          "CRE Broker",
          "Property Management",
          "Residential",
          "Corporates"
        ]
      }
    }
  },
  revenuebase: {
    label: "RevenueBase",
    color: "purple",
    description: "B2B contact and company enrichment for targeted outreach",
    filters: {
      jobTitles: {
        label: "Job Titles",
        type: "tags",
        settingsKey: "jobTitles",
        placeholder: "e.g. CFO, VP Finance, Managing Director",
        description: "Press Enter or comma to add a title"
      },
      industries: {
        label: "Industries",
        type: "tags",
        settingsKey: "industries",
        placeholder: "e.g. Real Estate, Private Equity, Finance",
        description: "Press Enter or comma to add an industry"
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
