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

module.exports = {
  buildEntityDetailPath,
  buildEntityListPath
};
