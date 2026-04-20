const { buildOrganizationSegmentationViewModel } = require("./organization-segmentation.cjs");
const {
  getSearchResultFieldValue,
  readObjectPath,
  resolveSchemaFieldPath
} = require("./search-result.cjs");

const DESCRIPTION_FIELD_PATHS = [
  "description",
  "metadata.description",
  "metadata.summary",
  "metadata.about"
];

const WEBSITE_FIELD_PATHS = [
  "metadata.website",
  "metadata.domain",
  "website",
  "domain"
];

const LINKEDIN_FIELD_PATHS = [
  "metadata.socials.linkedin",
  "linkedin"
];

const PHONE_FIELD_PATHS = [
  "metadata.phone",
  "metadata.phoneNumber",
  "metadata.phone_number",
  "phone",
  "phonenumber"
];

const COMPANY_SIZE_FIELD_PATHS = [
  "metadata.company_size",
  "metadata.companysize",
  "metadata.employee_range",
  "metadata.employeecount",
  "metadata.employee_count",
  "metadata.employees"
];

const REVENUE_FIELD_PATHS = [
  "metadata.annual_revenue",
  "metadata.annualrevenue",
  "metadata.revenue",
  "metadata.arr"
];

const CUSTOMER_SINCE_FIELD_PATHS = [
  "metadata.customer_since",
  "metadata.customerSince",
  "metadata.client_since",
  "metadata.createdon",
  "metadata.created_at"
];

/**
 * Resolves one preferred field value using schema first, then dotted-path fallback.
 * @param {object|null} record
 * @param {object|null} schema
 * @param {string[]} preferredPaths
 * @returns {string|null}
 */
function resolvePreferredFieldValue(record, schema, preferredPaths) {
  const schemaFieldPath = resolveSchemaFieldPath(schema, preferredPaths);
  if (schemaFieldPath) {
    const schemaValue = getSearchResultFieldValue(record, schemaFieldPath);
    if (schemaValue) {
      return schemaValue;
    }
  }

  for (const path of Array.isArray(preferredPaths) ? preferredPaths : []) {
    const value = getSearchResultFieldValue(record, path);
    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * Returns one trimmed display-safe string.
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeDisplayString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const asString = typeof value === "number" ? String(value) : value;
  if (typeof asString !== "string") {
    return null;
  }
  const trimmed = asString.trim();
  return trimmed ? trimmed : null;
}

/**
 * Resolves the first usable phone value from one raw phone payload.
 * Supports flat strings, `{ phone, ext }`, and grouped objects like
 * `{ work, mobile, home, other }`.
 * @param {unknown} value
 * @returns {{base: string|null, ext: string|null}}
 */
function resolvePhoneParts(value) {
  if (!value) {
    return {
      base: null,
      ext: null
    };
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = resolvePhoneParts(entry);
      if (resolved.base) {
        return resolved;
      }
    }
    return {
      base: null,
      ext: null
    };
  }

  if (typeof value === "object") {
    const base =
      normalizeDisplayString(value.phone) ||
      normalizeDisplayString(value.number) ||
      normalizeDisplayString(value.value);
    const ext =
      normalizeDisplayString(value.ext) ||
      normalizeDisplayString(value.extension) ||
      normalizeDisplayString(value.phoneExt) ||
      normalizeDisplayString(value.phoneExtension);

    if (base) {
      return {
        base,
        ext
      };
    }

    for (const key of ["work", "mobile", "home", "other"]) {
      const resolved = resolvePhoneParts(value[key]);
      if (resolved.base) {
        return resolved;
      }
    }

    for (const nestedValue of Object.values(value)) {
      const resolved = resolvePhoneParts(nestedValue);
      if (resolved.base) {
        return resolved;
      }
    }
  }

  return {
    base: normalizeDisplayString(value),
    ext: null
  };
}

/**
 * Formats one raw phone payload for display.
 * @param {unknown} value
 * @returns {string|null}
 */
function formatPhoneDisplayValue(value) {
  const { base, ext } = resolvePhoneParts(value);
  if (!base) {
    return null;
  }
  return ext ? `${base} x${ext}` : base;
}

/**
 * Resolves one preferred phone value using schema first, then dotted-path fallback.
 * @param {object|null} record
 * @param {object|null} schema
 * @param {string[]} preferredPaths
 * @returns {string|null}
 */
function resolvePreferredPhoneValue(record, schema, preferredPaths) {
  const schemaFieldPath = resolveSchemaFieldPath(schema, preferredPaths);
  if (schemaFieldPath) {
    const schemaValue = formatPhoneDisplayValue(readObjectPath(record, schemaFieldPath));
    if (schemaValue) {
      return schemaValue;
    }
  }

  for (const path of Array.isArray(preferredPaths) ? preferredPaths : []) {
    const value = formatPhoneDisplayValue(readObjectPath(record, path));
    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * Ensures a URL includes a protocol so Chakra can render it as an external link.
 * @param {string|null} value
 * @returns {string|null}
 */
function normalizeUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Returns one display-safe organization name.
 * @param {object|null} record
 * @returns {string}
 */
function getOrganizationName(record) {
  return typeof record?.name === "string" && record.name.trim()
    ? record.name.trim()
    : "Unnamed organization";
}

/**
 * Returns initials for one organization heading.
 * @param {string} name
 * @returns {string}
 */
function buildOrganizationInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return "OR";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Formats one location heading.
 * @param {object|null} location
 * @returns {string}
 */
function formatLocationHeading(location) {
  const city =
    typeof location?.city === "string" && location.city.trim()
      ? location.city.trim()
      : null;
  const regionCode =
    typeof location?.regionCode === "string" && location.regionCode.trim()
      ? location.regionCode.trim()
      : null;
  const address =
    typeof location?.address === "string" && location.address.trim()
      ? location.address.trim()
      : null;

  if (city && regionCode) {
    return `${city}, ${regionCode}`;
  }

  return city || regionCode || address || "Location unavailable";
}

/**
 * Formats one supporting location address label.
 * @param {object|null} location
 * @returns {string}
 */
function formatLocationAddress(location) {
  const address =
    typeof location?.address === "string" && location.address.trim()
      ? location.address.trim()
      : null;

  if (address) {
    return address;
  }

  return "Address not available";
}

/**
 * Formats one location relationship badge.
 * @param {object|null} location
 * @returns {string}
 */
function formatLocationBadge(location) {
  if (location?.relationship?.metadata?.isHQ) {
    return "HQ";
  }

  const relation =
    typeof location?.relationship?.relation === "string" && location.relationship.relation.trim()
      ? location.relationship.relation.trim()
      : null;
  if (!relation) {
    return "Office";
  }

  return relation
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/**
 * Returns the best headquarters location label from a location list.
 * @param {object[]} locations
 * @returns {string}
 */
function getHeadquartersLabel(locations) {
  const normalizedLocations = Array.isArray(locations) ? locations : [];
  const hqLocation = normalizedLocations.find((location) => location?.relationship?.metadata?.isHQ);
  const preferredLocation = hqLocation || normalizedLocations[0] || null;

  return preferredLocation ? formatLocationHeading(preferredLocation) : "HQ unavailable";
}

/**
 * Reads expertise tags from segmentation and falls back to a neutral placeholder.
 * @param {object|null} record
 * @returns {string[]}
 */
function getOrganizationExpertiseTags(record) {
  const segmentation = buildOrganizationSegmentationViewModel(record);
  const values = [
    ...(Array.isArray(segmentation?.industries) ? segmentation.industries : []),
    ...(Array.isArray(segmentation?.focuses) ? segmentation.focuses : [])
  ].filter(Boolean);

  return values.length ? values.slice(0, 8) : ["Awaiting segmentation"];
}

/**
 * Formats one company-size label.
 * @param {string|null} value
 * @returns {string}
 */
function formatCompanySizeLabel(value) {
  if (!value) {
    return "0 employees";
  }

  return /\bemployees?\b/i.test(value) ? value : `${value} employees`;
}

/**
 * Formats one revenue label.
 * @param {string|null} value
 * @returns {string}
 */
function formatRevenueLabel(value) {
  if (!value) {
    return "$0";
  }

  return value;
}

/**
 * Formats one customer-since label.
 * @param {string|null} value
 * @returns {string}
 */
function formatCustomerSinceLabel(value) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

/**
 * Computes a placeholder account-health score based on available profile signals.
 * This is intentionally conservative until live health data is wired in.
 * @param {{
 *   description: string,
 *   websiteUrl: string|null,
 *   linkedInUrl: string|null,
 *   phone: string|null,
 *   expertiseTags: string[],
 *   hqLabel: string,
 *   locationCount: number
 * }} options
 * @returns {number}
 */
function computeAccountHealthScore(options) {
  let score = 0;

  if (options.description && options.description !== "No organization description is available yet.") {
    score += 20;
  }

  if (options.websiteUrl) {
    score += 15;
  }

  if (options.linkedInUrl) {
    score += 15;
  }

  if (options.phone) {
    score += 10;
  }

  if (Array.isArray(options.expertiseTags) && options.expertiseTags[0] !== "Awaiting segmentation") {
    score += 20;
  }

  if (options.hqLabel && options.hqLabel !== "HQ unavailable") {
    score += 10;
  }

  if (options.locationCount > 0) {
    score += 10;
  }

  return Math.max(0, Math.min(score, 100));
}

/**
 * Returns friendly account-health supporting labels.
 * @param {number} score
 * @returns {{engagementLabel: string, churnRiskLabel: string}}
 */
function getAccountHealthLabels(score) {
  if (!score) {
    return {
      engagementLabel: "Unknown",
      churnRiskLabel: "Unknown"
    };
  }

  if (score >= 70) {
    return {
      engagementLabel: "High",
      churnRiskLabel: "Minimal"
    };
  }

  if (score >= 40) {
    return {
      engagementLabel: "Moderate",
      churnRiskLabel: "Watch"
    };
  }

  return {
    engagementLabel: "Low",
    churnRiskLabel: "Elevated"
  };
}

/**
 * Builds the organization header view model used by the detail shell.
 * @param {{record: object|null, schema: object|null, locations: object[]}} options
 * @returns {{
 *   name: string,
 *   initials: string,
 *   hqLabel: string,
 *   phone: string|null,
 *   websiteLabel: string|null,
 *   websiteUrl: string|null,
 *   linkedInUrl: string|null
 * }}
 */
function buildOrganizationHeaderViewModel(options) {
  const record = options?.record && typeof options.record === "object" ? options.record : null;
  const schema = options?.schema && typeof options.schema === "object" ? options.schema : null;
  const locations = Array.isArray(options?.locations) ? options.locations : [];
  const name = getOrganizationName(record);
  const websiteLabel = resolvePreferredFieldValue(record, schema, WEBSITE_FIELD_PATHS);

  return {
    name,
    initials: buildOrganizationInitials(name),
    hqLabel: getHeadquartersLabel(locations),
    phone: resolvePreferredPhoneValue(record, schema, PHONE_FIELD_PATHS),
    websiteLabel,
    websiteUrl: normalizeUrl(websiteLabel),
    linkedInUrl: normalizeUrl(resolvePreferredFieldValue(record, schema, LINKEDIN_FIELD_PATHS))
  };
}

/**
 * Builds the overview tab's display data from available organization fields.
 * @param {{record: object|null, schema: object|null, locations: object[]}} options
 * @returns {{
 *   description: string,
 *   companySizeLabel: string,
 *   revenueLabel: string,
 *   customerSinceLabel: string,
 *   accountHealthScore: number,
 *   engagementLabel: string,
 *   churnRiskLabel: string,
 *   expertiseTags: string[]
 * }}
 */
function buildOrganizationOverviewViewModel(options) {
  const record = options?.record && typeof options.record === "object" ? options.record : null;
  const schema = options?.schema && typeof options.schema === "object" ? options.schema : null;
  const locations = Array.isArray(options?.locations) ? options.locations : [];
  const description =
    resolvePreferredFieldValue(record, schema, DESCRIPTION_FIELD_PATHS) ||
    "No organization description is available yet.";
  const header = buildOrganizationHeaderViewModel({
    record,
    schema,
    locations
  });
  const expertiseTags = getOrganizationExpertiseTags(record);
  const accountHealthScore = computeAccountHealthScore({
    description,
    websiteUrl: header.websiteUrl,
    linkedInUrl: header.linkedInUrl,
    phone: header.phone,
    expertiseTags,
    hqLabel: header.hqLabel,
    locationCount: locations.length
  });
  const healthLabels = getAccountHealthLabels(accountHealthScore);

  return {
    description,
    companySizeLabel: formatCompanySizeLabel(resolvePreferredFieldValue(record, schema, COMPANY_SIZE_FIELD_PATHS)),
    revenueLabel: formatRevenueLabel(resolvePreferredFieldValue(record, schema, REVENUE_FIELD_PATHS)),
    customerSinceLabel: formatCustomerSinceLabel(
      resolvePreferredFieldValue(record, schema, CUSTOMER_SINCE_FIELD_PATHS)
    ),
    accountHealthScore,
    engagementLabel: healthLabels.engagementLabel,
    churnRiskLabel: healthLabels.churnRiskLabel,
    expertiseTags
  };
}

/**
 * Builds the locations tab summary and card list.
 * @param {{locations: object[]}} options
 * @returns {{
 *   summary: {
 *     totalLocations: number,
 *     globalHeadcount: number,
 *     timezoneCount: number,
 *     hqLabel: string
 *   },
 *   cards: Array<{
 *     key: string,
 *     heading: string,
 *     address: string,
 *     badge: string,
 *     headcountLabel: string
 *   }>
 * }}
 */
function buildOrganizationLocationsViewModel(options) {
  const locations = Array.isArray(options?.locations) ? options.locations : [];
  const timezoneLabels = new Set();

  for (const location of locations) {
    const timezoneLabel =
      (typeof location?.countryCode === "string" && location.countryCode.trim()) ||
      (typeof location?.regionCode === "string" && location.regionCode.trim()) ||
      formatLocationHeading(location);
    timezoneLabels.add(timezoneLabel);
  }

  return {
    summary: {
      totalLocations: locations.length,
      globalHeadcount: 0,
      timezoneCount: timezoneLabels.size,
      hqLabel: getHeadquartersLabel(locations)
    },
    cards: locations.map((location, index) => {
      const heading = formatLocationHeading(location);

      return {
        key: `${heading}-${index}`,
        heading,
        address: formatLocationAddress(location),
        badge: formatLocationBadge(location),
        headcountLabel: "0 employees"
      };
    })
  };
}

module.exports = {
  buildOrganizationHeaderViewModel,
  buildOrganizationLocationsViewModel,
  buildOrganizationOverviewViewModel
};
