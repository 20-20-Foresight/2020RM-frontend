const {
  getOrganizationDetailTabConfig,
  getOrganizationDetailTabKeyFromSegment
} = require("./organization-detail-config.cjs");

/**
 * Parses one organization detail pathname into organization and tab segments.
 * @param {string|null|undefined} pathname
 * @returns {{organizationUUID: string, tabKey: "overview"|"segmentation"|"contacts"|"jobs"|"outreach"|"similarOrganizations"|"locations"|"notes"}|null}
 */
function parseOrganizationDetailPath(pathname) {
  if (typeof pathname !== "string") {
    return null;
  }

  const match = pathname.match(/^\/organization\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) {
    return null;
  }

  const tabKey = getOrganizationDetailTabKeyFromSegment(match[2] || null);
  if (!tabKey) {
    return null;
  }

  return {
    organizationUUID: match[1],
    tabKey
  };
}

/**
 * Returns whether the current navigation stays within one organization detail page.
 * @param {{
 *   currentPathname: string|null|undefined,
 *   navigationPathname?: string|null|undefined
 * }} options
 * @returns {boolean}
 */
function isSameOrganizationDetailNavigation(options) {
  const current = parseOrganizationDetailPath(options.currentPathname);
  const pending = parseOrganizationDetailPath(options.navigationPathname);

  return Boolean(current && pending && current.organizationUUID === pending.organizationUUID);
}

/**
 * Computes the active tab and inline loading state for one organization detail page.
 * @param {{
 *   organizationUUID: string|null|undefined,
 *   currentPathname: string|null|undefined,
 *   navigationState: string,
 *   navigationPathname?: string|null|undefined
 * }} options
 * @returns {{activeTabKey: "overview"|"segmentation"|"contacts"|"jobs"|"outreach"|"similarOrganizations"|"locations"|"notes", isLoading: boolean, label: string|null}}
 */
function getOrganizationDetailTabUiState(options) {
  const current = parseOrganizationDetailPath(options.currentPathname);
  const pending = parseOrganizationDetailPath(options.navigationPathname);
  const normalizedOrganizationUUID =
    typeof options.organizationUUID === "string" ? options.organizationUUID.trim() : "";
  const relevantPending =
    options.navigationState !== "idle" &&
    Boolean(pending) &&
    pending.organizationUUID === normalizedOrganizationUUID;

  const activeTabKey = relevantPending ? pending.tabKey : current?.tabKey || "overview";
  const isLoading = relevantPending && pending.tabKey !== current?.tabKey;

  if (!isLoading) {
    return {
      activeTabKey,
      isLoading: false,
      label: null
    };
  }

  return {
    activeTabKey,
    isLoading: true,
    label: getOrganizationDetailTabConfig(activeTabKey)?.loadingLabel || "Loading organization..."
  };
}

/**
 * Prevents parent organization detail reloads when switching tabs for the same organization.
 * @param {{
 *   currentUrl?: URL,
 *   nextUrl?: URL,
 *   formMethod?: string|null|undefined,
 *   defaultShouldRevalidate: boolean
 * }} args
 * @returns {boolean}
 */
function shouldRevalidateOrganizationDetailRoute(args) {
  const formMethod =
    typeof args.formMethod === "string" && args.formMethod.trim()
      ? args.formMethod.trim().toUpperCase()
      : null;
  if (formMethod && formMethod !== "GET") {
    return args.defaultShouldRevalidate;
  }

  if (
    isSameOrganizationDetailNavigation({
      currentPathname: args.currentUrl?.pathname || null,
      navigationPathname: args.nextUrl?.pathname || null
    })
  ) {
    return false;
  }

  return args.defaultShouldRevalidate;
}

if (typeof module !== "undefined") {
  module.exports = {
    getOrganizationDetailTabUiState,
    isSameOrganizationDetailNavigation,
    parseOrganizationDetailPath,
    shouldRevalidateOrganizationDetailRoute
  };
}
