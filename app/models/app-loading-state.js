/**
 * Returns whether one pathname belongs to the admin data area.
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
function isAdminDataPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/admin/data");
}

/**
 * Returns whether one pathname is an entity search list route.
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
function isEntitySearchPath(pathname) {
  return pathname === "/organizations" || pathname === "/people";
}

/**
 * Returns the entity type for one singular detail route pathname.
 * @param {string|null|undefined} pathname
 * @returns {"organization"|"person"|null}
 */
function getEntityDetailTypeFromPath(pathname) {
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
 * Returns the best loading label for the current navigation state.
 * @param {{
 *   currentPathname: string,
 *   navigationState: string,
 *   navigationPathname?: string|null,
 *   fetcherStates?: string[]
 * }} options
 * @returns {{isLoading: boolean, isSubmitting: boolean, label: string|null}}
 */
function getAppLoadingOverlayState(options) {
  const fetcherStates = Array.isArray(options.fetcherStates) ? options.fetcherStates : [];
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

  if (isSubmitting && isAdminDataPath(pendingPathname)) {
    return {
      isLoading: true,
      isSubmitting: true,
      label: "Saving changes..."
    };
  }

  if (pendingPathname === "/organizations") {
    return {
      isLoading: true,
      isSubmitting,
      label: "Searching organizations..."
    };
  }

  if (pendingPathname === "/people") {
    return {
      isLoading: true,
      isSubmitting,
      label: "Searching people..."
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

  return {
    isLoading: true,
    isSubmitting,
    label: "Loading..."
  };
}

module.exports = {
  getAppLoadingOverlayState,
  getEntityDetailTypeFromPath,
  isAdminDataPath,
  isEntitySearchPath
};
