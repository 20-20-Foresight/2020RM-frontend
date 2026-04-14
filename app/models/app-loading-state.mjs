import { isSameOrganizationDetailNavigation } from "./organization-detail-tabs.mjs";

/**
 * Returns whether one pathname belongs to the admin data area.
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export function isAdminDataPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/admin/data");
}

/**
 * Returns whether one pathname belongs to the segmentation area.
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export function isSegmentationPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/admin/segmentation");
}

/**
 * Returns whether one pathname is an entity search list route.
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export function isEntitySearchPath(pathname) {
  return pathname === "/organizations" || pathname === "/people";
}

/**
 * Returns the entity type for one singular detail route pathname.
 * @param {string|null|undefined} pathname
 * @returns {"organization"|"person"|null}
 */
export function getEntityDetailTypeFromPath(pathname) {
  if (typeof pathname !== "string") {
    return null;
  }

  if (/^\/organization\/[^/]+/.test(pathname)) {
    return "organization";
  }

  if (/^\/person\/[^/]+/.test(pathname)) {
    return "person";
  }

  return null;
}

/**
 * Returns whether one fetcher is an inline background save for the current route.
 * @param {{state?: string, formMethod?: string, formAction?: string|null}} fetcher
 * @param {string} currentPathname
 * @returns {boolean}
 */
function isInlineCurrentRouteSaveFetcher(fetcher, currentPathname) {
  const formMethod = typeof fetcher?.formMethod === "string" ? fetcher.formMethod.toLowerCase() : "";
  const formAction = typeof fetcher?.formAction === "string" ? fetcher.formAction : "";
  const formActionPathname = formAction ? new URL(formAction, "http://localhost").pathname : "";

  if (fetcher?.state === "idle" || formMethod !== "post") {
    return false;
  }

  if (formActionPathname !== currentPathname) {
    return false;
  }

  return isAdminDataPath(currentPathname) || isSegmentationPath(currentPathname);
}

/**
 * Returns the best loading label for the current navigation state.
 * @param {{
 *   currentPathname: string,
 *   navigationState: string,
 *   navigationPathname?: string|null,
 *   fetchers?: Array<{state?: string, formMethod?: string, formAction?: string|null}>,
 *   fetcherStates?: string[]
 * }} options
 * @returns {{isLoading: boolean, isSubmitting: boolean, label: string|null}}
 */
export function getAppLoadingOverlayState(options) {
  const rawFetchers = Array.isArray(options.fetchers)
    ? options.fetchers
    : Array.isArray(options.fetcherStates)
      ? options.fetcherStates.map((state) => ({ state }))
      : [];
  const fetchers = rawFetchers.filter((fetcher) => !isInlineCurrentRouteSaveFetcher(fetcher, options.currentPathname));
  const fetcherStates = fetchers.map((fetcher) => fetcher.state);
  const hasActiveFetchers = fetcherStates.some((state) => state !== "idle");
  const isLoading = options.navigationState !== "idle" || hasActiveFetchers;

  if (!isLoading) {
    return {
      isLoading: false,
      isSubmitting: false,
      label: null
    };
  }

  const isSubmitting =
    options.navigationState === "submitting" || fetcherStates.some((state) => state === "submitting");
  const pendingPathname =
    typeof options.navigationPathname === "string" && options.navigationPathname
      ? options.navigationPathname
      : options.currentPathname;

  if (isEntitySearchPath(pendingPathname) && pendingPathname === options.currentPathname) {
    return {
      isLoading: false,
      isSubmitting: false,
      label: null
    };
  }

  if (isSubmitting && isAdminDataPath(pendingPathname)) {
    return {
      isLoading: true,
      isSubmitting: true,
      label: "Saving changes..."
    };
  }

  if (isSubmitting && isSegmentationPath(pendingPathname)) {
    return {
      isLoading: true,
      isSubmitting: true,
      label: "Saving changes..."
    };
  }

  if (
    isSameOrganizationDetailNavigation({
      currentPathname: options.currentPathname,
      navigationPathname: pendingPathname
    })
  ) {
    return {
      isLoading: false,
      isSubmitting: false,
      label: null
    };
  }

  const detailEntityType = getEntityDetailTypeFromPath(pendingPathname);
  if (detailEntityType === "organization") {
    return {
      isLoading: true,
      isSubmitting,
      label: "Loading organization..."
    };
  }

  if (detailEntityType === "person") {
    return {
      isLoading: true,
      isSubmitting,
      label: "Loading person..."
    };
  }

  if (isAdminDataPath(pendingPathname)) {
    return {
      isLoading: true,
      isSubmitting,
      label: "Loading data..."
    };
  }

  if (isSegmentationPath(pendingPathname)) {
    return {
      isLoading: true,
      isSubmitting,
      label: "Loading segmentation..."
    };
  }

  return {
    isLoading: true,
    isSubmitting,
    label: "Loading..."
  };
}
