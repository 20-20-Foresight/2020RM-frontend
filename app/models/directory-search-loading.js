/**
 * Returns whether the current directory page is actively running a search.
 * @param {{
 *   currentPathname: string,
 *   navigationState: string,
 *   navigationPathname?: string|null,
 *   hasPendingSearchSubmit?: boolean
 * }} options
 * @returns {boolean}
 */
function isDirectorySearchLoading(options) {
  const isSearchRoute = options.currentPathname === "/organizations" || options.currentPathname === "/people";
  if (!isSearchRoute) {
    return false;
  }

  if (options.hasPendingSearchSubmit) {
    return true;
  }

  return (
    options.navigationState !== "idle" &&
    typeof options.navigationPathname === "string" &&
    options.navigationPathname === options.currentPathname
  );
}

/**
 * Returns the loading label for a directory search.
 * @param {"organization"|"person"} entityType
 * @returns {string}
 */
function getDirectorySearchLoadingLabel(entityType) {
  return entityType === "organization" ? "Searching organizations..." : "Searching people...";
}

module.exports = {
  getDirectorySearchLoadingLabel,
  isDirectorySearchLoading
};
