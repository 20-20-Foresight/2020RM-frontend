const SIF_TAXONOMY_DATA_ID = "crm.data.taxonomy:sif";
const SIF_TAXONOMY_DESCRIPTION = "Authoritative Sector / Industry / Focus taxonomy and UI descriptions.";

/**
 * Returns whether a value is a plain object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads a trimmed string or null.
 * @param {unknown} value
 * @returns {string|null}
 */
function readTrimmedString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Reads a stable string array.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => readTrimmedString(entry)).filter(Boolean);
}

/**
 * Normalizes one boolean field.
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Normalizes one sort order value.
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function normalizeSortOrder(value, fallback) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

/**
 * Builds a stable slug from one label.
 * @param {string} label
 * @returns {string}
 */
function slugifyLabel(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Ensures a slug is unique within one sibling list.
 * @param {{slug?: string|null}[]} nodes
 * @param {string} slug
 * @returns {string}
 */
function ensureUniqueSlug(nodes, slug) {
  const baseSlug = readTrimmedString(slug) || "item";
  const existing = new Set(
    Array.isArray(nodes)
      ? nodes.map((node) => readTrimmedString(node?.slug)).filter(Boolean)
      : []
  );

  if (!existing.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (existing.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

/**
 * Builds one route path inside the admin segmentation area.
 * @param {"index"|"sectors"|"industries"|"focuses"} view
 * @param {{sectorSlug?: string|null, industrySlug?: string|null}} [options]
 * @returns {string}
 */
function buildSegmentationPath(view, options = {}) {
  if (view === "index") {
    return "/admin/segmentation";
  }

  if (view === "sectors") {
    return "/admin/segmentation/sectors";
  }

  if (view === "industries") {
    return `/admin/segmentation/${encodeURIComponent(options.sectorSlug || "")}/industries`;
  }

  return `/admin/segmentation/${encodeURIComponent(options.sectorSlug || "")}/${encodeURIComponent(options.industrySlug || "")}/focuses`;
}

/**
 * Rebuilds one focus node using the canonical SIF fields.
 * @param {unknown} focus
 * @param {{sectorLabel: string, industryLabel: string}} context
 * @param {number} index
 * @returns {Record<string, unknown>}
 */
function normalizeFocus(focus, context, index) {
  const label = readTrimmedString(focus?.label) || `Untitled Focus ${index + 1}`;

  return {
    id: readTrimmedString(focus?.id) || `focus:${slugifyLabel(context.sectorLabel)}:${slugifyLabel(context.industryLabel)}:${slugifyLabel(label)}`,
    kind: "focus",
    sectorId: readTrimmedString(focus?.sectorId) || null,
    industryId: readTrimmedString(focus?.industryId) || null,
    label,
    slug: readTrimmedString(focus?.slug) || slugifyLabel(label),
    pathLabels: [context.sectorLabel, context.industryLabel, label],
    description: readTrimmedString(focus?.description) || "",
    examples: normalizeStringArray(focus?.examples),
    whyHere: readTrimmedString(focus?.whyHere),
    aliases: normalizeStringArray(focus?.aliases),
    active: normalizeBoolean(focus?.active, true),
    crosswalkOnly: normalizeBoolean(focus?.crosswalkOnly, false),
    seenInCrosswalks: normalizeStringArray(focus?.seenInCrosswalks),
    sortOrder: normalizeSortOrder(focus?.sortOrder, index + 1)
  };
}

/**
 * Rebuilds one industry node using the canonical SIF fields.
 * @param {unknown} industry
 * @param {{sectorLabel: string}} context
 * @param {number} index
 * @returns {Record<string, unknown>}
 */
function normalizeIndustry(industry, context, index) {
  const label = readTrimmedString(industry?.label) || `Untitled Industry ${index + 1}`;
  const normalizedIndustry = {
    id: readTrimmedString(industry?.id) || `industry:${slugifyLabel(context.sectorLabel)}:${slugifyLabel(label)}`,
    kind: "industry",
    sectorId: readTrimmedString(industry?.sectorId) || null,
    label,
    slug: readTrimmedString(industry?.slug) || slugifyLabel(label),
    pathLabels: [context.sectorLabel, label],
    description: readTrimmedString(industry?.description) || "",
    examples: normalizeStringArray(industry?.examples),
    whyHere: readTrimmedString(industry?.whyHere),
    aliases: normalizeStringArray(industry?.aliases),
    active: normalizeBoolean(industry?.active, true),
    crosswalkOnly: normalizeBoolean(industry?.crosswalkOnly, false),
    seenInCrosswalks: normalizeStringArray(industry?.seenInCrosswalks),
    sortOrder: normalizeSortOrder(industry?.sortOrder, index + 1),
    focuses: []
  };

  normalizedIndustry.focuses = Array.isArray(industry?.focuses)
    ? industry.focuses.map((focus, focusIndex) =>
        normalizeFocus(focus, {
          sectorLabel: context.sectorLabel,
          industryLabel: normalizedIndustry.label
        }, focusIndex)
      )
    : [];

  return normalizedIndustry;
}

/**
 * Rebuilds one sector node using the canonical SIF fields.
 * @param {unknown} sector
 * @param {number} index
 * @returns {Record<string, unknown>}
 */
function normalizeSector(sector, index) {
  const label = readTrimmedString(sector?.label) || `Untitled Sector ${index + 1}`;
  const normalizedSector = {
    id: readTrimmedString(sector?.id) || `sector:${slugifyLabel(label)}`,
    kind: "sector",
    label,
    slug: readTrimmedString(sector?.slug) || slugifyLabel(label),
    pathLabels: [label],
    description: readTrimmedString(sector?.description) || "",
    examples: normalizeStringArray(sector?.examples),
    whyHere: readTrimmedString(sector?.whyHere),
    aliases: normalizeStringArray(sector?.aliases),
    active: normalizeBoolean(sector?.active, true),
    crosswalkOnly: normalizeBoolean(sector?.crosswalkOnly, false),
    seenInCrosswalks: normalizeStringArray(sector?.seenInCrosswalks),
    sortOrder: normalizeSortOrder(sector?.sortOrder, index + 1),
    industries: []
  };

  normalizedSector.industries = Array.isArray(sector?.industries)
    ? sector.industries.map((industry, industryIndex) =>
        normalizeIndustry(industry, {
          sectorLabel: normalizedSector.label
        }, industryIndex)
      )
    : [];

  return normalizedSector;
}

/**
 * Recalculates the SIF document stats from the live hierarchy.
 * @param {{sectors: Record<string, unknown>[]}} document
 * @returns {{sectors: number, industries: number, focuses: number}}
 */
function calculateSifStats(document) {
  const sectors = Array.isArray(document?.sectors) ? document.sectors : [];
  const industries = sectors.reduce(
    (total, sector) => total + (Array.isArray(sector.industries) ? sector.industries.length : 0),
    0
  );
  const focuses = sectors.reduce(
    (total, sector) =>
      total +
      (Array.isArray(sector.industries)
        ? sector.industries.reduce(
            (industryTotal, industry) =>
              industryTotal + (Array.isArray(industry.focuses) ? industry.focuses.length : 0),
            0
          )
        : 0),
    0
  );

  return {
    sectors: sectors.length,
    industries,
    focuses
  };
}

/**
 * Normalizes the backend-authored SIF taxonomy document.
 * @param {unknown} document
 * @returns {Record<string, unknown>}
 */
function normalizeSifTaxonomyDocument(document) {
  const sectors = Array.isArray(document?.sectors)
    ? document.sectors.map((sector, index) => normalizeSector(sector, index))
    : [];
  const normalizedDocument = {
    schemaVersion: Number.isFinite(document?.schemaVersion) ? Number(document.schemaVersion) : 1,
    documentType: readTrimmedString(document?.documentType) || "taxonomy",
    taxonomy: readTrimmedString(document?.taxonomy) || "sif",
    description: readTrimmedString(document?.description) || SIF_TAXONOMY_DESCRIPTION,
    generatedAt: readTrimmedString(document?.generatedAt),
    source: isPlainObject(document?.source)
      ? {
          format: readTrimmedString(document.source.format),
          path: readTrimmedString(document.source.path)
        }
      : {
          format: null,
          path: null
        },
    intro: isPlainObject(document?.intro)
      ? {
          title: readTrimmedString(document.intro.title) || "",
          paragraphs: normalizeStringArray(document.intro.paragraphs),
          sourceBasis: readTrimmedString(document.intro.sourceBasis) || ""
        }
      : {
          title: "",
          paragraphs: [],
          sourceBasis: ""
        },
    stats: {
      sectors: 0,
      industries: 0,
      focuses: 0
    },
    sectors
  };

  normalizedDocument.stats = calculateSifStats(normalizedDocument);
  return normalizedDocument;
}

/**
 * Locates one sector by slug.
 * @param {{sectors?: unknown[]}} document
 * @param {string|null|undefined} sectorSlug
 * @returns {Record<string, unknown>|null}
 */
function findSectorBySlug(document, sectorSlug) {
  const normalizedSectorSlug = readTrimmedString(sectorSlug);
  if (!normalizedSectorSlug) {
    return null;
  }

  return (
    (Array.isArray(document?.sectors) ? document.sectors : []).find((sector) => sector.slug === normalizedSectorSlug) ||
    null
  );
}

/**
 * Locates one industry by sector + industry slug.
 * @param {{sectors?: unknown[]}} document
 * @param {string|null|undefined} sectorSlug
 * @param {string|null|undefined} industrySlug
 * @returns {Record<string, unknown>|null}
 */
function findIndustryBySlug(document, sectorSlug, industrySlug) {
  const sector = findSectorBySlug(document, sectorSlug);
  const normalizedIndustrySlug = readTrimmedString(industrySlug);
  if (!sector || !normalizedIndustrySlug) {
    return null;
  }

  return (
    (Array.isArray(sector.industries) ? sector.industries : []).find((industry) => industry.slug === normalizedIndustrySlug) ||
    null
  );
}

/**
 * Normalizes node form-like fields into the canonical SIF edit shape.
 * @param {Record<string, unknown>} currentNode
 * @param {Record<string, unknown>} updates
 * @returns {Record<string, unknown>}
 */
function applyNodeUpdates(currentNode, updates) {
  return {
    ...currentNode,
    label: readTrimmedString(updates.label) || currentNode.label,
    description: readTrimmedString(updates.description) || "",
    examples: normalizeStringArray(updates.examples),
    whyHere: readTrimmedString(updates.whyHere),
    aliases: normalizeStringArray(updates.aliases),
    active: normalizeBoolean(updates.active, currentNode.active !== false),
    crosswalkOnly: normalizeBoolean(updates.crosswalkOnly, currentNode.crosswalkOnly === true),
    seenInCrosswalks: normalizeStringArray(updates.seenInCrosswalks)
  };
}

/**
 * Applies one immutable-id SIF node update and refreshes path labels.
 * @param {unknown} document
 * @param {{
 *   kind: "sector"|"industry"|"focus",
 *   nodeId: string,
 *   label?: string,
 *   description?: string,
 *   examples?: string[],
 *   whyHere?: string|null,
 *   aliases?: string[],
 *   active?: boolean,
 *   crosswalkOnly?: boolean,
 *   seenInCrosswalks?: string[]
 * }} options
 * @returns {Record<string, unknown>}
 */
function updateSifTaxonomyNode(document, options) {
  const normalizedDocument = normalizeSifTaxonomyDocument(document);

  const nextSectors = normalizedDocument.sectors.map((sector) => {
    if (options.kind === "sector" && sector.id === options.nodeId) {
      return applyNodeUpdates(sector, options);
    }

    return {
      ...sector,
      industries: sector.industries.map((industry) => {
        if (options.kind === "industry" && industry.id === options.nodeId) {
          return applyNodeUpdates(industry, options);
        }

        return {
          ...industry,
          focuses: industry.focuses.map((focus) => {
            if (options.kind === "focus" && focus.id === options.nodeId) {
              return applyNodeUpdates(focus, options);
            }

            return focus;
          })
        };
      })
    };
  });

  return normalizeSifTaxonomyDocument({
    ...normalizedDocument,
    sectors: nextSectors
  });
}

/**
 * Adds one new SIF taxonomy node while preserving the backend hierarchy.
 * @param {unknown} document
 * @param {{
 *   kind: "sector"|"industry"|"focus",
 *   sectorSlug?: string|null,
 *   industrySlug?: string|null,
 *   label: string,
 *   description?: string
 * }} options
 * @returns {Record<string, unknown>}
 */
function addSifTaxonomyNode(document, options) {
  const normalizedDocument = normalizeSifTaxonomyDocument(document);
  const label = readTrimmedString(options.label);
  if (!label) {
    throw new Error("Label is required when adding a SIF node.");
  }

  if (options.kind === "sector") {
    const slug = ensureUniqueSlug(normalizedDocument.sectors, slugifyLabel(label));
    const nextSector = {
      id: `sector:${slug}`,
      kind: "sector",
      label,
      slug,
      pathLabels: [label],
      description: readTrimmedString(options.description) || "",
      examples: [],
      whyHere: null,
      aliases: [],
      active: true,
      crosswalkOnly: false,
      seenInCrosswalks: [],
      sortOrder: normalizedDocument.sectors.length + 1,
      industries: []
    };

    return normalizeSifTaxonomyDocument({
      ...normalizedDocument,
      sectors: [...normalizedDocument.sectors, nextSector]
    });
  }

  if (options.kind === "industry") {
    const sector = findSectorBySlug(normalizedDocument, options.sectorSlug);
    if (!sector) {
      throw new Error("Unable to add an industry without a matching sector.");
    }

    const slug = ensureUniqueSlug(sector.industries, slugifyLabel(label));
    const nextIndustry = {
      id: `industry:${sector.slug}:${slug}`,
      kind: "industry",
      sectorId: sector.id,
      label,
      slug,
      pathLabels: [sector.label, label],
      description: readTrimmedString(options.description) || "",
      examples: [],
      whyHere: null,
      aliases: [],
      active: true,
      crosswalkOnly: false,
      seenInCrosswalks: [],
      sortOrder: sector.industries.length + 1,
      focuses: []
    };

    return normalizeSifTaxonomyDocument({
      ...normalizedDocument,
      sectors: normalizedDocument.sectors.map((currentSector) =>
        currentSector.id === sector.id
          ? {
              ...currentSector,
              industries: [...currentSector.industries, nextIndustry]
            }
          : currentSector
      )
    });
  }

  const sector = findSectorBySlug(normalizedDocument, options.sectorSlug);
  const industry = findIndustryBySlug(normalizedDocument, options.sectorSlug, options.industrySlug);
  if (!sector || !industry) {
    throw new Error("Unable to add a focus without a matching sector and industry.");
  }

  const slug = ensureUniqueSlug(industry.focuses, slugifyLabel(label));
  const nextFocus = {
    id: `focus:${sector.slug}:${industry.slug}:${slug}`,
    kind: "focus",
    sectorId: sector.id,
    industryId: industry.id,
    label,
    slug,
    pathLabels: [sector.label, industry.label, label],
    description: readTrimmedString(options.description) || "",
    examples: [],
    whyHere: null,
    aliases: [],
    active: true,
    crosswalkOnly: false,
    seenInCrosswalks: [],
    sortOrder: industry.focuses.length + 1
  };

  return normalizeSifTaxonomyDocument({
    ...normalizedDocument,
    sectors: normalizedDocument.sectors.map((currentSector) =>
      currentSector.id === sector.id
        ? {
            ...currentSector,
            industries: currentSector.industries.map((currentIndustry) =>
              currentIndustry.id === industry.id
                ? {
                    ...currentIndustry,
                    focuses: [...currentIndustry.focuses, nextFocus]
                  }
                : currentIndustry
            )
          }
        : currentSector
    )
  });
}

if (typeof module !== "undefined") {
  module.exports = {
    SIF_TAXONOMY_DATA_ID,
    SIF_TAXONOMY_DESCRIPTION,
    addSifTaxonomyNode,
    buildSegmentationPath,
    findIndustryBySlug,
    findSectorBySlug,
    normalizeSifTaxonomyDocument,
    updateSifTaxonomyNode
  };
}
