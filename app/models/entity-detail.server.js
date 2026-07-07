/**
 * Builds one frontend detail error state.
 * @param {{
 *   entityType: "organization"|"person",
 *   uuid: string,
 *   status: string,
 *   statusExplained: string,
 *   error: string
 * }} options
 * @returns {{entityType: "organization"|"person", uuid: string, status: string, statusExplained: string, record: object|null, locations: object[], relationships: object[], workHistory: object[], meta: {count: number}, schema: object|null, salesforceEntity: object|null, error: string}}
 */
function buildFailedEntityDetailState(options) {
  return {
    entityType: options.entityType,
    uuid: options.uuid,
    status: options.status,
    statusExplained: options.statusExplained,
    record: null,
    locations: [],
    relationships: [],
    workHistory: [],
    meta: {
      count: 0
    },
    schema: null,
    salesforceEntity: null,
    error: options.error
  };
}

/**
 * Loads one REST-backed entity detail page through the frontend BFF.
 * @param {{
 *   request: Request,
 *   entityType: "organization"|"person",
 *   uuid: string,
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<{entityType: "organization"|"person", uuid: string, status: string, statusExplained: string, record: object|null, locations: object[], relationships: object[], workHistory: object[], meta: object, schema: object|null, salesforceEntity: object|null, error: string|null}>}
 */
async function loadEntityDetailPage(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const uuid = typeof options.uuid === "string" ? options.uuid.trim() : "";

  if (!uuid) {
    return buildFailedEntityDetailState({
      entityType: options.entityType,
      uuid: "",
      status: "failed",
      statusExplained: "Detail request failed.",
      error: 'Route parameter "uuid" is required.'
    });
  }

  const target = new URL(
    `/api/rest/${options.entityType}/${encodeURIComponent(uuid)}`,
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
      const isNotFound = response.status === 404;
      return buildFailedEntityDetailState({
        entityType: options.entityType,
        uuid,
        status: isNotFound ? "not_found" : "failed",
        statusExplained: isNotFound ? "Requested record was not found." : "Detail request failed.",
        error:
          payload && typeof payload.message === "string"
            ? payload.message
            : isNotFound
              ? "Requested record was not found."
              : "Detail request failed."
      });
    }

    return {
      entityType: payload?.entityType === "person" ? "person" : options.entityType,
      uuid: typeof payload?.uuid === "string" ? payload.uuid : uuid,
      status: typeof payload?.status === "string" ? payload.status : "completed",
      statusExplained:
        typeof payload?.statusExplained === "string"
          ? payload.statusExplained
          : "Detail loaded successfully.",
      record: payload && payload.record && typeof payload.record === "object" ? payload.record : null,
      locations: Array.isArray(payload?.locations) ? payload.locations : [],
      relationships: Array.isArray(payload?.relationships) ? payload.relationships : [],
      workHistory: Array.isArray(payload?.workHistory) ? payload.workHistory : [],
      meta:
        payload && payload.meta && typeof payload.meta === "object"
          ? payload.meta
          : {
              count: 0
            },
      schema: payload && payload.schema && typeof payload.schema === "object" ? payload.schema : null,
      salesforceEntity:
        payload && payload.salesforceEntity && typeof payload.salesforceEntity === "object"
          ? payload.salesforceEntity
          : null,
      error: null
    };
  } catch (error) {
    return buildFailedEntityDetailState({
      entityType: options.entityType,
      uuid,
      status: "failed",
      statusExplained: "Detail request failed.",
      error: error instanceof Error ? error.message : "Detail request failed."
    });
  }
}

module.exports = {
  loadEntityDetailPage
};
