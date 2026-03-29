/**
 * Builds one frontend error state for the organization people tab.
 * @param {{
 *   organizationUUID: string,
 *   status: string,
 *   statusExplained: string,
 *   error: string
 * }} options
 * @returns {{organizationUUID: string, entityType: "person", status: string, statusExplained: string, results: object[], meta: {count: number}, schema: object|null, error: string}}
 */
function buildFailedOrganizationPeopleState(options) {
  return {
    organizationUUID: options.organizationUUID,
    entityType: "person",
    status: options.status,
    statusExplained: options.statusExplained,
    results: [],
    meta: {
      count: 0
    },
    schema: null,
    error: options.error
  };
}

/**
 * Loads one organization-related people tab through the frontend BFF.
 * @param {{
 *   request: Request,
 *   organizationUUID: string,
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<{organizationUUID: string, entityType: "person", status: string, statusExplained: string, results: object[], meta: object, schema: object|null, error: string|null}>}
 */
async function loadOrganizationPeoplePage(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const organizationUUID =
    typeof options.organizationUUID === "string" ? options.organizationUUID.trim() : "";

  if (!organizationUUID) {
    return buildFailedOrganizationPeopleState({
      organizationUUID: "",
      status: "failed",
      statusExplained: "Related people request failed.",
      error: 'Route parameter "organizationUUID" is required.'
    });
  }

  const target = new URL(
    `/api/rest/organization/${encodeURIComponent(organizationUUID)}/people`,
    options.request.url
  );

  try {
    const response = await fetchImpl(target, {
      headers: {
        cookie: options.request.headers.get("cookie") || ""
      }
    });
    const payload = await response.json();

    if (!response.ok) {
      return buildFailedOrganizationPeopleState({
        organizationUUID,
        status: "failed",
        statusExplained: "Related people request failed.",
        error:
          payload && typeof payload.message === "string"
            ? payload.message
            : "Related people request failed."
      });
    }

    return {
      organizationUUID:
        typeof payload?.organizationUUID === "string" ? payload.organizationUUID : organizationUUID,
      entityType: "person",
      status: typeof payload?.status === "string" ? payload.status : "completed",
      statusExplained:
        typeof payload?.statusExplained === "string"
          ? payload.statusExplained
          : "Related people loaded successfully.",
      results: Array.isArray(payload?.results) ? payload.results : [],
      meta:
        payload && payload.meta && typeof payload.meta === "object"
          ? payload.meta
          : {
              count: 0
            },
      schema: payload && payload.schema && typeof payload.schema === "object" ? payload.schema : null,
      error: null
    };
  } catch (error) {
    return buildFailedOrganizationPeopleState({
      organizationUUID,
      status: "failed",
      statusExplained: "Related people request failed.",
      error: error instanceof Error ? error.message : "Related people request failed."
    });
  }
}

module.exports = {
  loadOrganizationPeoplePage
};
