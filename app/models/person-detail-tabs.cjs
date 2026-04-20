const {
  getPersonDetailTabConfig,
  getPersonDetailTabKeyFromSegment
} = require("./person-detail-config.cjs");

/**
 * Parses one contact detail pathname into person and tab segments.
 * @param {string|null|undefined} pathname
 * @returns {{personUUID: string, tabKey: "overview"|"lists"|"similarContacts"|"notes"}|null}
 */
function parsePersonDetailPath(pathname) {
  if (typeof pathname !== "string") {
    return null;
  }

  const match = pathname.match(/^\/person\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) {
    return null;
  }

  const tabKey = getPersonDetailTabKeyFromSegment(match[2] || null);
  if (!tabKey) {
    return null;
  }

  return {
    personUUID: match[1],
    tabKey
  };
}

/**
 * Returns whether the current navigation stays within one contact detail page.
 * @param {{
 *   currentPathname: string|null|undefined,
 *   navigationPathname?: string|null|undefined
 * }} options
 * @returns {boolean}
 */
function isSamePersonDetailNavigation(options) {
  const current = parsePersonDetailPath(options.currentPathname);
  const pending = parsePersonDetailPath(options.navigationPathname);

  return Boolean(current && pending && current.personUUID === pending.personUUID);
}

/**
 * Computes the active tab and inline loading state for one contact detail page.
 * @param {{
 *   personUUID: string|null|undefined,
 *   currentPathname: string|null|undefined,
 *   navigationState: string,
 *   navigationPathname?: string|null|undefined
 * }} options
 * @returns {{activeTabKey: "overview"|"lists"|"similarContacts"|"notes", isLoading: boolean, label: string|null}}
 */
function getPersonDetailTabUiState(options) {
  const current = parsePersonDetailPath(options.currentPathname);
  const pending = parsePersonDetailPath(options.navigationPathname);
  const normalizedPersonUUID = typeof options.personUUID === "string" ? options.personUUID.trim() : "";
  const relevantPending =
    options.navigationState !== "idle" &&
    Boolean(pending) &&
    pending.personUUID === normalizedPersonUUID;

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
    label: getPersonDetailTabConfig(activeTabKey)?.loadingLabel || "Loading person..."
  };
}

/**
 * Prevents parent contact detail reloads when switching tabs for the same person.
 * @param {{
 *   currentUrl?: URL,
 *   nextUrl?: URL,
 *   formMethod?: string|null|undefined,
 *   defaultShouldRevalidate: boolean
 * }} args
 * @returns {boolean}
 */
function shouldRevalidatePersonDetailRoute(args) {
  const formMethod =
    typeof args.formMethod === "string" && args.formMethod.trim()
      ? args.formMethod.trim().toUpperCase()
      : null;
  if (formMethod && formMethod !== "GET") {
    return args.defaultShouldRevalidate;
  }

  if (
    isSamePersonDetailNavigation({
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
    getPersonDetailTabUiState,
    isSamePersonDetailNavigation,
    parsePersonDetailPath,
    shouldRevalidatePersonDetailRoute
  };
}
