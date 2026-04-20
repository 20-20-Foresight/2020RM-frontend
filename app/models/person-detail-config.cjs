const PERSON_DETAIL_TABS = [
  {
    key: "overview",
    label: "Overview",
    segment: null,
    loadingLabel: "Loading overview..."
  },
  {
    key: "lists",
    label: "Lists",
    segment: "lists",
    loadingLabel: "Loading lists..."
  },
  {
    key: "similarContacts",
    label: "Similar Contacts",
    segment: "similar-contacts",
    loadingLabel: "Loading similar contacts..."
  },
  {
    key: "notes",
    label: "Notes",
    segment: "notes",
    loadingLabel: "Loading notes..."
  }
];

/**
 * Returns the tab config for one contact detail tab key.
 * @param {string|null|undefined} tabKey
 * @returns {{key: string, label: string, segment: string|null, loadingLabel: string}|null}
 */
function getPersonDetailTabConfig(tabKey) {
  if (typeof tabKey !== "string" || !tabKey.trim()) {
    return null;
  }

  return PERSON_DETAIL_TABS.find((tab) => tab.key === tabKey.trim()) || null;
}

/**
 * Resolves one contact detail tab key from a URL segment.
 * @param {string|null|undefined} segment
 * @returns {string|null}
 */
function getPersonDetailTabKeyFromSegment(segment) {
  if (segment == null || segment === "") {
    return "overview";
  }

  const normalizedSegment = typeof segment === "string" ? segment.trim() : "";
  if (!normalizedSegment) {
    return "overview";
  }

  const matchedTab = PERSON_DETAIL_TABS.find((tab) => tab.segment === normalizedSegment);
  return matchedTab ? matchedTab.key : null;
}

module.exports = {
  PERSON_DETAIL_TABS,
  getPersonDetailTabConfig,
  getPersonDetailTabKeyFromSegment
};
