const ORGANIZATION_DETAIL_TABS = [
  {
    key: "overview",
    label: "Overview",
    segment: null,
    loadingLabel: "Loading overview..."
  },
  {
    key: "segmentation",
    label: "Segmentation",
    segment: "segmentation",
    loadingLabel: "Loading segmentation..."
  },
  {
    key: "contacts",
    label: "Contacts",
    segment: "people",
    loadingLabel: "Loading contacts..."
  },
  {
    key: "jobs",
    label: "Jobs",
    segment: "jobs",
    loadingLabel: "Loading jobs..."
  },
  {
    key: "outreach",
    label: "Outreach",
    segment: "outreach",
    loadingLabel: "Loading outreach..."
  },
  {
    key: "similarOrganizations",
    label: "Similar Organizations",
    segment: "similar-organizations",
    loadingLabel: "Loading similar organizations..."
  },
  {
    key: "locations",
    label: "Locations",
    segment: "locations",
    loadingLabel: "Loading locations..."
  },
  {
    key: "notes",
    label: "Notes",
    segment: "notes",
    loadingLabel: "Loading notes..."
  }
];

/**
 * Returns the tab config for one organization detail tab key.
 * @param {string|null|undefined} tabKey
 * @returns {{key: string, label: string, segment: string|null, loadingLabel: string}|null}
 */
function getOrganizationDetailTabConfig(tabKey) {
  if (typeof tabKey !== "string" || !tabKey.trim()) {
    return null;
  }

  return ORGANIZATION_DETAIL_TABS.find((tab) => tab.key === tabKey.trim()) || null;
}

/**
 * Resolves one organization detail tab key from a URL segment.
 * @param {string|null|undefined} segment
 * @returns {string|null}
 */
function getOrganizationDetailTabKeyFromSegment(segment) {
  if (segment == null || segment === "") {
    return "overview";
  }

  const normalizedSegment = typeof segment === "string" ? segment.trim() : "";
  if (!normalizedSegment) {
    return "overview";
  }

  const matchedTab = ORGANIZATION_DETAIL_TABS.find((tab) => tab.segment === normalizedSegment);
  return matchedTab ? matchedTab.key : null;
}

module.exports = {
  ORGANIZATION_DETAIL_TABS,
  getOrganizationDetailTabConfig,
  getOrganizationDetailTabKeyFromSegment
};
