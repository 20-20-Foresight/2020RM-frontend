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
  "title"
];

const COMPANY_FIELD_PATHS = [
  "metadata.company",
  "metadata.company_name",
  "metadata.organization",
  "metadata.organization_name",
  "metadata.employer",
  "metadata.employer_name",
  "company"
];

const LEVEL_FIELD_PATHS = [
  "metadata.level",
  "metadata.seniority",
  "metadata.seniority_level"
];

const SUMMARY_FIELD_PATHS = [
  "description",
  "metadata.description",
  "metadata.summary",
  "metadata.about"
];

const LINKEDIN_FIELD_PATHS = [
  "metadata.socials.linkedin",
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
  "email"
];

const PERSONAL_EMAIL_FIELD_PATHS = [
  "metadata.email.personal",
  "metadata.personalemail",
  "metadata.personal_email"
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
  "metadata.mobile.number"
];

const HOME_LOCATION_FIELD_PATHS = [
  "metadata.homeaddress",
  "metadata.home_address",
  "metadata.home.location",
  "metadata.homeLocation"
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
  "metadata.specialties"
];

const WORK_HISTORY_FIELD_PATHS = [
  "metadata.work_history",
  "metadata.workhistory",
  "metadata.experience"
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

const PLACEHOLDER_EDUCATION = [
  {
    degree: "MBA in Strategic Management",
    institution: "Wharton School of Business",
    subtitle: "Graduated 2010"
  },
  {
    degree: "B.S. in Operations Research",
    institution: "Georgia Institute of Technology",
    subtitle: "Graduated 2008"
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
 * Formats one office location label.
 * @param {object|null} location
 * @returns {string}
 */
function formatOfficeLocationLabel(location) {
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

  return city || regionCode || countryCode || "Office location not available";
}

/**
 * Returns the best office location for one person.
 * @param {object[]} locations
 * @returns {string}
 */
function getOfficeLocationLabel(locations) {
  const normalizedLocations = Array.isArray(locations) ? locations : [];
  const hqLocation = normalizedLocations.find((location) => location?.relationship?.metadata?.isHQ);
  return formatOfficeLocationLabel(hqLocation || normalizedLocations[0] || null);
}

/**
 * Converts one raw string array into trimmed display tags.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeDisplayString(entry))
    .filter(Boolean);
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
    [
      normalizeDisplayString(entry.start),
      normalizeDisplayString(entry.end)
    ]
      .filter(Boolean)
      .join(" — ");
  const subtitle = [organization, period].filter(Boolean).join(" • ");
  const description =
    normalizeDisplayString(entry.summary) ||
    normalizeDisplayString(entry.description) ||
    "Professional history details are not connected yet.";

  return {
    title: title || "Role unavailable",
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
 * Returns one normalized work history list with placeholders when unavailable.
 * @param {object|null} record
 * @param {object|null} schema
 * @returns {Array<{title: string, subtitle: string, description: string}>}
 */
function buildWorkHistory(record, schema) {
  const rawEntries = resolvePreferredValue(record, schema, WORK_HISTORY_FIELD_PATHS);
  const liveEntries = Array.isArray(rawEntries)
    ? rawEntries.map((entry) => formatWorkHistoryEntry(entry)).filter(Boolean)
    : [];

  return liveEntries.length ? liveEntries.slice(0, 4) : PLACEHOLDER_WORK_HISTORY;
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

  return liveEntries.length ? liveEntries.slice(0, 4) : PLACEHOLDER_EDUCATION;
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
 * @param {{record: object|null, schema: object|null, locations: object[]}} options
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
  const name = getPersonName(record);
  const title = resolvePreferredFieldValue(record, schema, TITLE_FIELD_PATHS) || "Role unavailable";
  const organizationLabel =
    resolvePreferredFieldValue(record, schema, COMPANY_FIELD_PATHS) || getOfficeLocationLabel(locations);
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
 * @param {{record: object|null, schema: object|null, locations: object[]}} options
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
  const header = buildPersonHeaderViewModel({
    record,
    schema,
    locations
  });
  const summary =
    resolvePreferredFieldValue(record, schema, SUMMARY_FIELD_PATHS) ||
    "Profile summary is not available yet.";
  const expertiseTags = buildExpertiseTags(record, schema);
  const contactStrengthScore = computeContactStrengthScore({
    summary,
    officeLocationLabel: getOfficeLocationLabel(locations),
    linkedInUrl: header.linkedInUrl,
    workEmail: header.workEmail,
    personalEmail: header.personalEmail,
    workPhone: header.workPhone,
    mobilePhone: header.mobilePhone,
    expertiseTags
  });

  return {
    officeLocationLabel: getOfficeLocationLabel(locations),
    homeLocationLabel:
      resolvePreferredFieldValue(record, schema, HOME_LOCATION_FIELD_PATHS) || "Home location not available",
    title: header.title,
    levelLabel: resolvePreferredFieldValue(record, schema, LEVEL_FIELD_PATHS) || "Level unavailable",
    tenureLabel: resolvePreferredFieldValue(record, schema, TENURE_FIELD_PATHS) || "Tenure not available",
    compensationLabel:
      resolvePreferredFieldValue(record, schema, COMPENSATION_FIELD_PATHS) || "Compensation pending",
    summary,
    workHistory: buildWorkHistory(record, schema),
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
