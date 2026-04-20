const {
  getSearchResultFieldValue,
  readObjectPath,
  resolveSchemaFieldPath
} = require("./search-result");

const TITLE_FIELD_PATHS = [
  "metadata.title",
  "metadata.jobtitle",
  "metadata.job_title",
  "metadata.position",
  "metadata.currenttitle",
  "title"
];

const COMPANY_FIELD_PATHS = [
  "metadata.company",
  "metadata.company_name",
  "metadata.organization",
  "metadata.organization_name",
  "metadata.employer",
  "metadata.employer_name",
  "metadata.currentcompany",
  "metadata.currentCompany",
  "currentcompany",
  "currentCompany",
  "company"
];

const LEVEL_FIELD_PATHS = [
  "metadata.level",
  "metadata.seniority",
  "metadata.seniority_level",
  "metadata.positionlevel",
  "metadata.positionLevel",
  "positionlevel",
  "positionLevel"
];

const SUMMARY_FIELD_PATHS = [
  "description",
  "metadata.description",
  "metadata.summary",
  "metadata.about"
];

const LINKEDIN_FIELD_PATHS = [
  "metadata.socials.linkedin",
  "socials.linkedin",
  "linkedin"
];

const AVATAR_FIELD_PATHS = [
  "metadata.photo",
  "metadata.profilephoto",
  "metadata.profile_photo",
  "metadata.avatar",
  "photo"
];

const WORK_EMAIL_FIELD_PATHS = [
  "metadata.primaryemail",
  "metadata.workemail",
  "metadata.email.work",
  "primaryemail",
  "workemail",
  "email"
];

const PERSONAL_EMAIL_FIELD_PATHS = [
  "metadata.email.personal",
  "metadata.personalemail",
  "metadata.personal_email",
  "personalemail"
];

const WORK_PHONE_FIELD_PATHS = [
  "metadata.phone",
  "metadata.phoneNumber",
  "metadata.phone_number",
  "phone"
];

const MOBILE_PHONE_FIELD_PATHS = [
  "metadata.mobilephone",
  "metadata.mobile_phone",
  "metadata.cellphone",
  "metadata.cell_phone",
  "metadata.mobile.number",
  "mobilephone"
];

const HOME_LOCATION_FIELD_PATHS = [
  "metadata.homeaddress",
  "metadata.home_address",
  "metadata.home.location",
  "metadata.homeLocation",
  "homeaddress",
  "location"
];

const TENURE_FIELD_PATHS = [
  "metadata.tenure",
  "metadata.yearsinrole",
  "metadata.years_in_role",
  "metadata.startdate",
  "metadata.start_date"
];

const COMPENSATION_FIELD_PATHS = [
  "metadata.compensation",
  "metadata.salary",
  "metadata.annual_compensation",
  "metadata.total_compensation"
];

const SKILLS_FIELD_PATHS = [
  "metadata.skills",
  "metadata.expertise",
  "metadata.specialties",
  "skills"
];

const WORK_HISTORY_FIELD_PATHS = [
  "metadata.work_history",
  "metadata.workhistory",
  "metadata.workHistory",
  "metadata.experience",
  "work_history",
  "workHistory"
];

const EDUCATION_FIELD_PATHS = [
  "metadata.education",
  "metadata.education_history"
];

const NOTE_FIELD_PATHS = [
  "metadata.contactstrengthnote",
  "metadata.contact_strength_note",
  "metadata.engagementnote",
  "metadata.engagement_note"
];

const TAG_FIELD_PATHS = [
  "metadata.tags",
  "metadata.contact_tags",
  "metadata.labels"
];

const PLACEHOLDER_WORK_HISTORY = [
  {
    title: "Director of Global Logistics",
    subtitle: "Global Prime Logistics • 2014 — 2018",
    description: "Managed a $45M annual budget and oversaw shipping operations for 14 regional hubs."
  },
  {
    title: "Operations Manager",
    subtitle: "Streamline Systems Inc. • 2010 — 2014",
    description: "Focused on internal process automation and vendor relationship management."
  }
];

const PLACEHOLDER_EXPERTISE_TAGS = [
  "Strategic Planning",
  "Operational Excellence",
  "Change Management",
  "Executive Leadership"
];

/**
 * Resolves one preferred schema-aware value without forcing it into a string.
 * @param {object|null} record
 * @param {object|null} schema
 * @param {string[]} preferredPaths
 * @returns {unknown}
 */
function resolvePreferredValue(record, schema, preferredPaths) {
  const schemaFieldPath = resolveSchemaFieldPath(schema, preferredPaths);
  if (schemaFieldPath) {
    const schemaValue = readObjectPath(record, schemaFieldPath);
    if (
      schemaValue != null &&
      (!(typeof schemaValue === "string") || schemaValue.trim())
    ) {
      return schemaValue;
    }
  }

  for (const path of Array.isArray(preferredPaths) ? preferredPaths : []) {
    const value = readObjectPath(record, path);
    if (value != null && (!(typeof value === "string") || value.trim())) {
      return value;
    }
  }

  return null;
}

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
  if (value == null) {
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
 * Supports flat strings, `{ phone, ext }`, and grouped objects such as
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
 * Returns one display-safe contact name.
 * @param {object|null} record
 * @returns {string}
 */
function getPersonName(record) {
  return typeof record?.name === "string" && record.name.trim()
    ? record.name.trim()
    : "Unnamed contact";
}

/**
 * Returns initials for one contact heading.
 * @param {string} name
 * @returns {string}
 */
function buildPersonInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return "CT";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Formats one location label.
 * @param {object|null} location
 * @returns {string}
 */
function formatLocationLabel(location) {
  const address = normalizeDisplayString(location?.address);
  if (address) {
    return address;
  }

  const city = normalizeDisplayString(location?.city);
  const regionCode = normalizeDisplayString(location?.regionCode);
  const countryCode = normalizeDisplayString(location?.countryCode);

  if (city && regionCode) {
    return `${city}, ${regionCode}`;
  }

  return city || regionCode || countryCode || "Location not available";
}

/**
 * Returns one normalized relation label from a location or relationship row.
 * @param {object|null} value
 * @returns {string}
 */
function getRelationName(value) {
  return normalizeDisplayString(value?.relationship?.relation || value?.relation || value?.type)?.toUpperCase() || "";
}

/**
 * Returns sorted employment relationships with current roles first.
 * @param {object[]} relationships
 * @returns {object[]}
 */
function getEmploymentRelationships(relationships) {
  const normalizedRelationships = Array.isArray(relationships) ? relationships : [];

  return normalizedRelationships
    .filter((relationship) => ["EMPLOYED_BY", "WORKS_AT"].includes(getRelationName(relationship)))
    .slice()
    .sort((left, right) => {
      const leftCurrent = isCurrentEmploymentRelationship(left) ? 1 : 0;
      const rightCurrent = isCurrentEmploymentRelationship(right) ? 1 : 0;
      if (leftCurrent !== rightCurrent) {
        return rightCurrent - leftCurrent;
      }

      return getRelationshipSortValue(right) - getRelationshipSortValue(left);
    });
}

/**
 * Returns one sortable date value for a relationship row.
 * @param {object|null} relationship
 * @returns {number}
 */
function getRelationshipSortValue(relationship) {
  const dateCandidates = [
    relationship?.periodend,
    relationship?.periodEnd,
    relationship?.end,
    relationship?.periodstart,
    relationship?.periodStart,
    relationship?.start
  ];

  for (const candidate of dateCandidates) {
    if (candidate == null || candidate === "") {
      continue;
    }

    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return 0;
}

/**
 * Returns whether one employment relationship appears current.
 * @param {object|null} relationship
 * @returns {boolean}
 */
function isCurrentEmploymentRelationship(relationship) {
  if (!relationship || typeof relationship !== "object") {
    return false;
  }

  if (relationship.current === true || relationship?.metadata?.current === true) {
    return true;
  }

  const endValue = relationship.periodend || relationship.periodEnd || relationship.end;
  if (endValue == null || endValue === "") {
    return true;
  }

  const endDate = new Date(endValue);
  return Number.isNaN(endDate.getTime()) ? false : endDate.getTime() >= Date.now();
}

/**
 * Returns the organization label from one employment relationship.
 * @param {object|null} relationship
 * @returns {string|null}
 */
function getEmploymentOrganizationLabel(relationship) {
  return (
    normalizeDisplayString(relationship?.organization?.name) ||
    normalizeDisplayString(relationship?.entity1?.name) ||
    normalizeDisplayString(relationship?.organizationName) ||
    normalizeDisplayString(relationship?.company)
  );
}

/**
 * Returns the title from one employment relationship.
 * @param {object|null} relationship
 * @returns {string|null}
 */
function getEmploymentTitle(relationship) {
  return (
    normalizeDisplayString(relationship?.metadata?.title) ||
    normalizeDisplayString(relationship?.title) ||
    normalizeDisplayString(relationship?.role)
  );
}

/**
 * Returns the current employer label from one relationship list.
 * @param {object[]} relationships
 * @returns {string|null}
 */
function getCurrentEmployerLabel(relationships) {
  return getEmploymentOrganizationLabel(getEmploymentRelationships(relationships)[0] || null);
}

/**
 * Returns current employer UUIDs from one relationship list.
 * @param {object[]} relationships
 * @returns {Set<string>}
 */
function getCurrentEmployerUUIDs(relationships) {
  const currentRelationships = getEmploymentRelationships(relationships);
  const currentUUIDs = currentRelationships
    .filter((relationship) => isCurrentEmploymentRelationship(relationship))
    .map((relationship) => normalizeDisplayString(relationship?.entity1uuid))
    .filter(Boolean);
  const fallbackUUID = normalizeDisplayString(currentRelationships[0]?.entity1uuid);

  return new Set(currentUUIDs.length ? currentUUIDs : fallbackUUID ? [fallbackUUID] : []);
}

/**
 * Returns the best office location for one person.
 * @param {object[]} locations
 * @param {object[]} relationships
 * @returns {string}
 */
function getOfficeLocationLabel(locations, relationships) {
  const normalizedLocations = Array.isArray(locations) ? locations : [];
  const officeLocations = normalizedLocations.filter((location) => getRelationName(location) === "OFFICE_OF");
  const currentEmployerUUIDs = getCurrentEmployerUUIDs(relationships);
  const matchedCurrentHqLocation = officeLocations.find(
    (location) =>
      currentEmployerUUIDs.has(normalizeDisplayString(location?.subject?.uuid)) &&
      location?.relationship?.metadata?.isHQ
  );
  const matchedCurrentLocation = officeLocations.find((location) =>
    currentEmployerUUIDs.has(normalizeDisplayString(location?.subject?.uuid))
  );
  const hqLocation = officeLocations.find((location) => location?.relationship?.metadata?.isHQ);

  return formatLocationLabel(matchedCurrentHqLocation || matchedCurrentLocation || hqLocation || officeLocations[0] || null)
    .replace("Location not available", "Office location not available");
}

/**
 * Returns the best home location label for one person.
 * @param {object[]} locations
 * @param {object|null} record
 * @param {object|null} schema
 * @returns {string}
 */
function getHomeLocationLabel(locations, record, schema) {
  const normalizedLocations = Array.isArray(locations) ? locations : [];
  const homeLocation = normalizedLocations.find((location) => getRelationName(location) === "RESIDES_AT");
  if (homeLocation) {
    return formatLocationLabel(homeLocation).replace("Location not available", "Home location not available");
  }

  return resolvePreferredFieldValue(record, schema, HOME_LOCATION_FIELD_PATHS) || "Home location not available";
}

/**
 * Splits one tag-like string into display tokens.
 * @param {string} value
 * @returns {string[]}
 */
function splitDisplayTokens(value) {
  return String(value || "")
    .split(/[\n,;•]+/g)
    .map((entry) => normalizeDisplayString(entry))
    .filter(Boolean);
}

/**
 * Converts one raw tag payload into trimmed display tags.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeStringArray(entry));
  }

  if (typeof value === "string") {
    return splitDisplayTokens(value);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const labeledValue =
    normalizeDisplayString(value.name) ||
    normalizeDisplayString(value.label) ||
    normalizeDisplayString(value.value) ||
    normalizeDisplayString(value.skill) ||
    normalizeDisplayString(value.title);
  if (labeledValue) {
    return splitDisplayTokens(labeledValue);
  }

  if (Object.values(value).every((entry) => typeof entry === "boolean")) {
    return Object.entries(value)
      .filter(([, isEnabled]) => isEnabled)
      .map(([entry]) => normalizeDisplayString(entry))
      .filter(Boolean);
  }

  return Object.values(value).flatMap((entry) => normalizeStringArray(entry));
}

/**
 * Builds the header chip labels for one contact.
 * @param {object|null} record
 * @param {object|null} schema
 * @param {string} levelLabel
 * @returns {string[]}
 */
function buildTagLabels(record, schema, levelLabel) {
  const configuredTags = normalizeStringArray(resolvePreferredValue(record, schema, TAG_FIELD_PATHS));
  if (configuredTags.length) {
    return configuredTags.slice(0, 2);
  }

  return ["Contact", levelLabel || "Synced Profile"];
}

/**
 * Formats one work history record from live or placeholder data.
 * @param {unknown} entry
 * @returns {{title: string, subtitle: string, description: string}|null}
 */
function formatWorkHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const title =
    normalizeDisplayString(entry.role) ||
    normalizeDisplayString(entry.title) ||
    normalizeDisplayString(entry.position);
  const organization =
    normalizeDisplayString(entry.organization) ||
    normalizeDisplayString(entry.company);
  const period =
    normalizeDisplayString(entry.period) ||
    formatRelationshipPeriod(entry);
  const subtitle = [organization, period].filter(Boolean).join(" • ");
  const description =
    normalizeDisplayString(entry.summary) ||
    normalizeDisplayString(entry.description) ||
    "Professional history details are not connected yet.";

  if (!title) {
    return null;
  }

  return {
    title,
    subtitle: subtitle || "History sync pending",
    description
  };
}

/**
 * Formats one education record from live or placeholder data.
 * @param {unknown} entry
 * @returns {{degree: string, institution: string, subtitle: string}|null}
 */
function formatEducationEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    degree:
      normalizeDisplayString(entry.degree) ||
      normalizeDisplayString(entry.program) ||
      "Education record",
    institution:
      normalizeDisplayString(entry.institution) ||
      normalizeDisplayString(entry.school) ||
      "Institution unavailable",
    subtitle:
      normalizeDisplayString(entry.subtitle) ||
      normalizeDisplayString(entry.year) ||
      "Date unavailable"
  };
}

/**
 * Formats one employment relationship entry for the work history timeline.
 * @param {object|null} relationship
 * @returns {{title: string, subtitle: string, description: string}|null}
 */
function formatEmploymentRelationshipEntry(relationship) {
  if (!relationship || typeof relationship !== "object") {
    return null;
  }

  const title = getEmploymentTitle(relationship);
  const organization = getEmploymentOrganizationLabel(relationship);
  const period = formatRelationshipPeriod(relationship);

  if (!title) {
    return null;
  }

  return {
    title,
    subtitle: [organization, period].filter(Boolean).join(" • ") || organization || "History sync pending",
    description:
      normalizeDisplayString(relationship?.metadata?.summary) ||
      normalizeDisplayString(relationship?.metadata?.description) ||
      "Relationship history synced from employment records."
  };
}

/**
 * Formats one relationship period label.
 * @param {object|null} relationship
 * @returns {string|null}
 */
function formatRelationshipPeriod(relationship) {
  const start = formatRelationshipYear(relationship?.periodstart || relationship?.periodStart || relationship?.start);
  const end = formatRelationshipYear(relationship?.periodend || relationship?.periodEnd || relationship?.end);

  if (start && end) {
    return `${start} — ${end}`;
  }

  if (start) {
    return `${start} — Present`;
  }

  return null;
}

/**
 * Formats one relationship date down to a display year.
 * @param {unknown} value
 * @returns {string|null}
 */
function formatRelationshipYear(value) {
  const normalized = normalizeDisplayString(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) {
    return String(date.getUTCFullYear());
  }

  const matchedYear = normalized.match(/\b(19|20)\d{2}\b/);
  return matchedYear ? matchedYear[0] : normalized;
}

/**
 * Returns one normalized work history list with placeholders when unavailable.
 * @param {object|null} record
 * @param {object|null} schema
 * @param {object[]} relationships
 * @param {object[]} workHistory
 * @returns {Array<{title: string, subtitle: string, description: string}>}
 */
function buildWorkHistory(record, schema, relationships, workHistory) {
  const normalizedWorkHistory = Array.isArray(workHistory) ? workHistory : [];
  const relationshipHistoryEntries = normalizedWorkHistory
    .map((entry) => formatWorkHistoryEntry(entry))
    .filter(Boolean);

  if (relationshipHistoryEntries.length) {
    return relationshipHistoryEntries;
  }

  const rawEntries = resolvePreferredValue(record, schema, WORK_HISTORY_FIELD_PATHS);
  const liveEntries = Array.isArray(rawEntries)
    ? rawEntries.map((entry) => formatWorkHistoryEntry(entry)).filter(Boolean)
    : [];

  if (liveEntries.length) {
    return liveEntries;
  }

  const relationshipEntries = getEmploymentRelationships(relationships)
    .map((relationship) => formatEmploymentRelationshipEntry(relationship))
    .filter(Boolean);

  return relationshipEntries.length ? relationshipEntries : PLACEHOLDER_WORK_HISTORY;
}

/**
 * Returns one normalized education list with placeholders when unavailable.
 * @param {object|null} record
 * @param {object|null} schema
 * @returns {Array<{degree: string, institution: string, subtitle: string}>}
 */
function buildEducation(record, schema) {
  const rawEntries = resolvePreferredValue(record, schema, EDUCATION_FIELD_PATHS);
  const liveEntries = Array.isArray(rawEntries)
    ? rawEntries.map((entry) => formatEducationEntry(entry)).filter(Boolean)
    : [];

  return liveEntries.slice(0, 4);
}

/**
 * Returns one work-history row to use for primary tenure calculations.
 * Prefers the current row that matches the header title and organization.
 * @param {{
 *   title: string,
 *   organizationLabel: string
 * }} header
 * @param {object[]} workHistory
 * @param {object[]} relationships
 * @returns {object|null}
 */
function selectPrimaryTenureSource(header, workHistory, relationships) {
  const normalizedWorkHistory = Array.isArray(workHistory) ? workHistory : [];
  const normalizedRelationships = Array.isArray(relationships) ? relationships : [];
  const currentWorkHistory = normalizedWorkHistory.filter((entry) => formatWorkHistoryEntry(entry));
  const title = normalizeDisplayString(header?.title);
  const organizationLabel = normalizeDisplayString(header?.organizationLabel);

  const matchingCurrentWorkHistory = currentWorkHistory.find((entry) => {
    const entryTitle = normalizeDisplayString(entry?.title || entry?.role || entry?.position);
    const entryOrganization = normalizeDisplayString(entry?.organization || entry?.company);
    const isCurrent = entry?.current === true || !normalizeDisplayString(entry?.end);

    return isCurrent && entryTitle === title && entryOrganization === organizationLabel;
  });
  if (matchingCurrentWorkHistory) {
    return matchingCurrentWorkHistory;
  }

  const fallbackCurrentWorkHistory = currentWorkHistory.find(
    (entry) => entry?.current === true || !normalizeDisplayString(entry?.end)
  );
  if (fallbackCurrentWorkHistory) {
    return fallbackCurrentWorkHistory;
  }

  const currentRelationship = getEmploymentRelationships(normalizedRelationships).find((relationship) => {
    const relationshipTitle = getEmploymentTitle(relationship);
    const relationshipOrganization = getEmploymentOrganizationLabel(relationship);

    return (
      isCurrentEmploymentRelationship(relationship) &&
      relationshipTitle === title &&
      relationshipOrganization === organizationLabel
    );
  });
  if (currentRelationship) {
    return currentRelationship;
  }

  return getEmploymentRelationships(normalizedRelationships).find((relationship) =>
    isCurrentEmploymentRelationship(relationship)
  ) || null;
}

/**
 * Returns the whole-year difference between two dates.
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {number}
 */
function getWholeYearDifference(startDate, endDate) {
  let years = endDate.getUTCFullYear() - startDate.getUTCFullYear();
  const monthDelta = endDate.getUTCMonth() - startDate.getUTCMonth();
  const dayDelta = endDate.getUTCDate() - startDate.getUTCDate();

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    years -= 1;
  }

  return years;
}

/**
 * Returns one tenure label derived from explicit metadata or current-role history.
 * @param {object|null} record
 * @param {object|null} schema
 * @param {{
 *   title: string,
 *   organizationLabel: string
 * }} header
 * @param {object[]} workHistory
 * @param {object[]} relationships
 * @returns {string}
 */
function buildTenureLabel(record, schema, header, workHistory, relationships) {
  const explicitTenure = resolvePreferredFieldValue(record, schema, TENURE_FIELD_PATHS);
  if (explicitTenure) {
    return explicitTenure;
  }

  const tenureSource = selectPrimaryTenureSource(header, workHistory, relationships);
  const startValue = normalizeDisplayString(
    tenureSource?.start ||
      tenureSource?.periodstart ||
      tenureSource?.periodStart
  );
  if (!startValue) {
    return "Tenure not available";
  }

  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) {
    return "Tenure not available";
  }

  const wholeYears = getWholeYearDifference(startDate, new Date());
  if (wholeYears <= 0) {
    return "Less than 1 year";
  }

  return `${wholeYears} year${wholeYears === 1 ? "" : "s"}`;
}

/**
 * Returns one expertise tag list with placeholders when unavailable.
 * @param {object|null} record
 * @param {object|null} schema
 * @returns {string[]}
 */
function buildExpertiseTags(record, schema) {
  const tags = normalizeStringArray(resolvePreferredValue(record, schema, SKILLS_FIELD_PATHS));
  return tags.length ? tags.slice(0, 8) : PLACEHOLDER_EXPERTISE_TAGS;
}

/**
 * Computes a placeholder contact-strength score based on available profile signals.
 * This is intentionally conservative until live affinity data is wired in.
 * @param {{
 *   summary: string,
 *   officeLocationLabel: string,
 *   linkedInUrl: string|null,
 *   workEmail: string|null,
 *   personalEmail: string|null,
 *   workPhone: string|null,
 *   mobilePhone: string|null,
 *   expertiseTags: string[]
 * }} options
 * @returns {number}
 */
function computeContactStrengthScore(options) {
  let score = 0;

  if (options.summary && options.summary !== "Profile summary is not available yet.") {
    score += 20;
  }

  if (options.officeLocationLabel && options.officeLocationLabel !== "Office location not available") {
    score += 15;
  }

  if (options.linkedInUrl) {
    score += 15;
  }

  if (options.workEmail) {
    score += 15;
  }

  if (options.personalEmail) {
    score += 5;
  }

  if (options.workPhone) {
    score += 15;
  }

  if (options.mobilePhone) {
    score += 5;
  }

  if (Array.isArray(options.expertiseTags) && options.expertiseTags.length) {
    score += 10;
  }

  return Math.max(0, Math.min(score, 100));
}

/**
 * Returns a contact-strength affinity label.
 * @param {number} score
 * @returns {string}
 */
function getAffinityLabel(score) {
  if (score >= 80) {
    return "High Affinity";
  }

  if (score >= 60) {
    return "Strong Match";
  }

  if (score >= 40) {
    return "Developing";
  }

  return "Emerging";
}

/**
 * Returns the supporting checklist rows for the contact-strength card.
 * @param {{
 *   workEmail: string|null,
 *   workPhone: string|null,
 *   mobilePhone: string|null,
 *   linkedInUrl: string|null
 * }} options
 * @returns {Array<{label: string, isPositive: boolean}>}
 */
function buildStrengthChecks(options) {
  return [
    {
      label: options.workEmail ? "Work email available" : "Work email pending sync",
      isPositive: Boolean(options.workEmail)
    },
    {
      label: options.workPhone || options.mobilePhone ? "Direct phone available" : "Phone pending sync",
      isPositive: Boolean(options.workPhone || options.mobilePhone)
    },
    {
      label: options.linkedInUrl ? "LinkedIn profile linked" : "LinkedIn pending sync",
      isPositive: Boolean(options.linkedInUrl)
    }
  ];
}

/**
 * Returns one supporting insight string for the contact-strength card.
 * @param {string} summary
 * @param {string|null} note
 * @returns {string}
 */
function buildInsight(summary, note) {
  if (note) {
    return note;
  }

  if (summary && summary !== "Profile summary is not available yet.") {
    const firstSentence = summary.split(".")[0];
    return firstSentence ? `"${firstSentence.trim()}."` : summary;
  }

  return "\"Profile enrichment notes will appear here once engagement history is wired in.\"";
}

/**
 * Builds the contact header view model used by the detail shell.
 * @param {{record: object|null, schema: object|null, locations: object[], relationships?: object[], workHistory?: object[]}} options
 * @returns {{
 *   name: string,
 *   initials: string,
 *   avatarUrl: string|null,
 *   title: string,
 *   organizationLabel: string,
 *   subtitle: string,
 *   linkedInUrl: string|null,
 *   workEmail: string|null,
 *   workPhone: string|null,
 *   personalEmail: string|null,
 *   mobilePhone: string|null,
 *   tagLabels: string[]
 * }}
 */
function buildPersonHeaderViewModel(options) {
  const record = options?.record && typeof options.record === "object" ? options.record : null;
  const schema = options?.schema && typeof options.schema === "object" ? options.schema : null;
  const locations = Array.isArray(options?.locations) ? options.locations : [];
  const relationships = Array.isArray(options?.relationships) ? options.relationships : [];
  const name = getPersonName(record);
  const title =
    resolvePreferredFieldValue(record, schema, TITLE_FIELD_PATHS) ||
    getEmploymentTitle(getEmploymentRelationships(relationships)[0] || null) ||
    "Role unavailable";
  const organizationLabel =
    resolvePreferredFieldValue(record, schema, COMPANY_FIELD_PATHS) ||
    getCurrentEmployerLabel(relationships) ||
    getOfficeLocationLabel(locations, relationships);
  const levelLabel = resolvePreferredFieldValue(record, schema, LEVEL_FIELD_PATHS) || "Synced Profile";

  return {
    name,
    initials: buildPersonInitials(name),
    avatarUrl: normalizeUrl(resolvePreferredFieldValue(record, schema, AVATAR_FIELD_PATHS)),
    title,
    organizationLabel,
    subtitle:
      title !== "Role unavailable" && organizationLabel
        ? `${title} @ ${organizationLabel}`
        : title !== "Role unavailable"
          ? title
          : organizationLabel || "Contact profile details pending",
    linkedInUrl: normalizeUrl(resolvePreferredFieldValue(record, schema, LINKEDIN_FIELD_PATHS)),
    workEmail: resolvePreferredFieldValue(record, schema, WORK_EMAIL_FIELD_PATHS),
    workPhone: resolvePreferredPhoneValue(record, schema, WORK_PHONE_FIELD_PATHS),
    personalEmail: resolvePreferredFieldValue(record, schema, PERSONAL_EMAIL_FIELD_PATHS),
    mobilePhone: resolvePreferredPhoneValue(record, schema, MOBILE_PHONE_FIELD_PATHS),
    tagLabels: buildTagLabels(record, schema, levelLabel)
  };
}

/**
 * Builds the overview tab's display data from available contact fields.
 * @param {{record: object|null, schema: object|null, locations: object[], relationships?: object[]}} options
 * @returns {{
 *   officeLocationLabel: string,
 *   homeLocationLabel: string,
 *   title: string,
 *   levelLabel: string,
 *   tenureLabel: string,
 *   compensationLabel: string,
 *   summary: string,
 *   workHistory: Array<{title: string, subtitle: string, description: string}>,
 *   education: Array<{degree: string, institution: string, subtitle: string}>,
 *   expertiseTags: string[],
 *   contactStrengthScore: number,
 *   affinityLabel: string,
 *   strengthChecks: Array<{label: string, isPositive: boolean}>,
 *   insight: string
 * }}
 */
function buildPersonOverviewViewModel(options) {
  const record = options?.record && typeof options.record === "object" ? options.record : null;
  const schema = options?.schema && typeof options.schema === "object" ? options.schema : null;
  const locations = Array.isArray(options?.locations) ? options.locations : [];
  const relationships = Array.isArray(options?.relationships) ? options.relationships : [];
  const workHistory = Array.isArray(options?.workHistory) ? options.workHistory : [];
  const header = buildPersonHeaderViewModel({
    record,
    schema,
    locations,
    relationships
  });
  const summary =
    resolvePreferredFieldValue(record, schema, SUMMARY_FIELD_PATHS) ||
    "Profile summary is not available yet.";
  const expertiseTags = buildExpertiseTags(record, schema);
  const officeLocationLabel = getOfficeLocationLabel(locations, relationships);
  const contactStrengthScore = computeContactStrengthScore({
    summary,
    officeLocationLabel,
    linkedInUrl: header.linkedInUrl,
    workEmail: header.workEmail,
    personalEmail: header.personalEmail,
    workPhone: header.workPhone,
    mobilePhone: header.mobilePhone,
    expertiseTags
  });

  return {
    officeLocationLabel,
    homeLocationLabel: getHomeLocationLabel(locations, record, schema),
    title: header.title,
    levelLabel: resolvePreferredFieldValue(record, schema, LEVEL_FIELD_PATHS) || "Level unavailable",
    tenureLabel: buildTenureLabel(record, schema, header, workHistory, relationships),
    compensationLabel:
      resolvePreferredFieldValue(record, schema, COMPENSATION_FIELD_PATHS) || "Compensation pending",
    summary,
    workHistory: buildWorkHistory(record, schema, relationships, workHistory),
    education: buildEducation(record, schema),
    expertiseTags,
    contactStrengthScore,
    affinityLabel: getAffinityLabel(contactStrengthScore),
    strengthChecks: buildStrengthChecks({
      workEmail: header.workEmail,
      workPhone: header.workPhone,
      mobilePhone: header.mobilePhone,
      linkedInUrl: header.linkedInUrl
    }),
    insight: buildInsight(summary, resolvePreferredFieldValue(record, schema, NOTE_FIELD_PATHS))
  };
}

module.exports = {
  buildPersonHeaderViewModel,
  buildPersonOverviewViewModel
};
