const {
  getOrganizationDetailTabConfig
} = require("./organization-detail-config.cjs");
const {
  getPersonDetailTabConfig
} = require("./person-detail-config.cjs");

/**
 * Returns the collection route for one entity type.
 * @param {"organization"|"person"} entityType
 * @returns {string}
 */
function buildEntityListPath(entityType) {
  return entityType === "person" ? "/people" : "/organizations";
}

/**
 * Returns the detail route for one entity UUID.
 * @param {"organization"|"person"} entityType
 * @param {string|null|undefined} uuid
 * @returns {string|null}
 */
function buildEntityDetailPath(entityType, uuid) {
  if (typeof uuid !== "string" || !uuid.trim()) {
    return null;
  }

  const basePath = entityType === "person" ? "/person" : "/organization";
  return `${basePath}/${encodeURIComponent(uuid.trim())}`;
}

/**
 * Returns one organization detail-tab route for one organization UUID.
 * @param {string|null|undefined} uuid
 * @param {"overview"|"segmentation"|"contacts"|"jobs"|"outreach"|"similarOrganizations"|"locations"|"notes"} tabKey
 * @returns {string|null}
 */
function buildOrganizationDetailTabPath(uuid, tabKey) {
  const detailPath = buildEntityDetailPath("organization", uuid);
  const tabConfig = getOrganizationDetailTabConfig(tabKey);

  if (!detailPath || !tabConfig) {
    return null;
  }

  return tabConfig.segment ? `${detailPath}/${tabConfig.segment}` : detailPath;
}

/**
 * Returns the organization people detail-tab route for one organization UUID.
 * @param {string|null|undefined} uuid
 * @returns {string|null}
 */
function buildOrganizationPeoplePath(uuid) {
  return buildOrganizationDetailTabPath(uuid, "contacts");
}

/**
 * Returns one contact detail-tab route for one person UUID.
 * @param {string|null|undefined} uuid
 * @param {"overview"|"lists"|"similarContacts"|"notes"} tabKey
 * @returns {string|null}
 */
function buildPersonDetailTabPath(uuid, tabKey) {
  const detailPath = buildEntityDetailPath("person", uuid);
  const tabConfig = getPersonDetailTabConfig(tabKey);

  if (!detailPath || !tabConfig) {
    return null;
  }

  return tabConfig.segment ? `${detailPath}/${tabConfig.segment}` : detailPath;
}

module.exports = {
  buildEntityDetailPath,
  buildEntityListPath,
  buildOrganizationDetailTabPath,
  buildOrganizationPeoplePath,
  buildPersonDetailTabPath
};
