function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMatchText(value) {
  return readString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildAdminDataDetailPath(id) {
  return id ? `/admin/data/${encodeURIComponent(id)}` : "/admin/data/all";
}

function buildAdminDataCategoryPath(slug) {
  return `/admin/data/categories/${encodeURIComponent(slug)}`;
}

function buildAdminDataAllPath(query = "") {
  const trimmedQuery = readString(query);
  return trimmedQuery ? `/admin/data/all?q=${encodeURIComponent(trimmedQuery)}` : "/admin/data/all";
}

const DATA_CATEGORY_CONFIG = [
  {
    slug: "organization-segmentation",
    title: "Organization Segmentation",
    description: "Directives and data for the AI to segment organizations.",
    to: "/admin/data/segmentation",
    kind: "link",
    accent: "red"
  },
  {
    slug: "person-transformations",
    title: "Person Transformations",
    description: "Data for understanding and normalizing people for matching purposes.",
    accent: "blue",
    items: [
      { label: "Name Prefixes" },
      { label: "Name Suffixes" },
      { label: "Nicknames" },
      { label: "Skills" }
    ]
  },
  {
    slug: "places",
    title: "Places",
    description: "Data for identifying and normalizing places throughout the world.",
    accent: "green",
    items: [
      { label: "Location Abbreviations" },
      { label: "LinkedIn Locations" },
      { label: "Common Locations" },
      { label: "Countries" },
      { label: "Markets" },
      { label: "Street Types" }
    ]
  },
  {
    slug: "company-transformations",
    title: "Company Transformations",
    description: "Data for normalizing company data from multiple platforms.",
    accent: "orange",
    items: [
      { label: "Department Shortenings" },
      { label: "Company Abbreviations" }
    ]
  },
  {
    slug: "position-levels",
    title: "Position Levels",
    description:
      'Data for identifying the correct position level and calculating which people should default as "eligible to email".',
    accent: "purple",
    items: [
      { label: "Contact Titles" },
      { label: "Title Misspellings" },
      {
        label: "Title Acronyms",
        aliases: ["Title Acroynms"]
      },
      {
        label: "Executive Level Title Keywords",
        aliases: ["Execuve Level Title Keywords"]
      }
    ]
  },
  {
    slug: "email-scanning",
    title: "Email Scanning",
    description: "Data specifically used to identify aspects of emails coming into the system.",
    accent: "teal",
    items: [
      { label: "Email Domains" },
      { label: "Not Resume File Names" },
      { label: "Reply Phrases" }
    ]
  },
  {
    slug: "internet",
    title: "Internet",
    description: "Data used for identifying internet-based data and normalizing it for systems.",
    accent: "cyan",
    items: [{ label: "TLDs" }, { label: "Email Domains" }]
  },
  {
    slug: "reference-material",
    title: "Reference Material",
    description: "General data lists useful for drop-downs or as reference material.",
    accent: "yellow",
    items: [{ label: "NAICS Codes" }, { label: "SIC Codes" }]
  },
  {
    slug: "view-all",
    title: "View All",
    description: "See the full list of data in the system.",
    to: "/admin/data/all",
    kind: "link",
    accent: "gray"
  }
];

function listAdminDataCategories() {
  return DATA_CATEGORY_CONFIG.map((category) => ({
    ...category,
    itemCount: Array.isArray(category.items) ? category.items.length : null,
    to: category.to || buildAdminDataCategoryPath(category.slug)
  }));
}

function getAdminDataCategoryBySlug(slug) {
  const normalizedSlug = readString(slug).toLowerCase();
  const category = DATA_CATEGORY_CONFIG.find((entry) => readString(entry.slug).toLowerCase() === normalizedSlug);
  if (!category) {
    return null;
  }

  return {
    ...category,
    itemCount: Array.isArray(category.items) ? category.items.length : null,
    to: category.to || buildAdminDataCategoryPath(category.slug)
  };
}

function scoreItemMatch(item, candidateTexts) {
  const itemName = normalizeMatchText(item?.name);
  const itemKey = normalizeMatchText(item?.key);
  const itemId = normalizeMatchText(item?.id);
  const haystacks = [itemName, itemKey, itemId].filter(Boolean);
  let bestScore = -1;

  for (const candidateText of candidateTexts) {
    const normalizedCandidate = normalizeMatchText(candidateText);
    if (!normalizedCandidate) {
      continue;
    }

    if (haystacks.some((haystack) => haystack === normalizedCandidate)) {
      bestScore = Math.max(bestScore, 300 - normalizedCandidate.length);
      continue;
    }

    if (haystacks.some((haystack) => haystack.includes(normalizedCandidate))) {
      bestScore = Math.max(bestScore, 200 - normalizedCandidate.length);
      continue;
    }

    if (haystacks.some((haystack) => normalizedCandidate.includes(haystack))) {
      bestScore = Math.max(bestScore, 100 - normalizedCandidate.length);
    }
  }

  return bestScore;
}

function resolveAdminDataCategoryEntries(category, items = []) {
  const categoryConfig = typeof category === "string" ? getAdminDataCategoryBySlug(category) : category;
  if (!categoryConfig || !Array.isArray(categoryConfig.items)) {
    return [];
  }

  return categoryConfig.items.map((entry) => {
    const searchTerms = [entry.label, ...(Array.isArray(entry.aliases) ? entry.aliases : [])].filter(Boolean);
    const matchedItem = items
      .map((item) => ({
        item,
        score: scoreItemMatch(item, searchTerms)
      }))
      .filter((result) => result.score >= 0)
      .sort((left, right) => right.score - left.score)[0]?.item;

    const searchQuery = readString(entry.searchQuery) || readString(entry.label);
    const resolvedPath = matchedItem?.id ? buildAdminDataDetailPath(matchedItem.id) : buildAdminDataAllPath(searchQuery);

    return {
      slug: normalizeMatchText(entry.label).replace(/\s+/g, "-"),
      label: readString(entry.label),
      description: readString(matchedItem?.description) || readString(entry.description) || "No description available yet.",
      searchQuery,
      matchedItem,
      status: matchedItem?.id ? "available" : "search",
      to: resolvedPath
    };
  });
}

export {
  buildAdminDataAllPath,
  buildAdminDataCategoryPath,
  buildAdminDataDetailPath,
  getAdminDataCategoryBySlug,
  listAdminDataCategories,
  normalizeMatchText,
  resolveAdminDataCategoryEntries
};
