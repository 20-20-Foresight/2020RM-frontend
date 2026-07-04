function buildFailedLeadDetailState(options) {
  return {
    entityType: "lead",
    uuid: options.uuid,
    status: options.status,
    statusExplained: options.statusExplained,
    record: null,
    leadStages: [],
    meta: {
      count: 0,
    },
    error: options.error,
  };
}

async function loadLeadDetailPage(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const uuid = typeof options.uuid === "string" ? options.uuid.trim() : "";

  if (!uuid) {
    return buildFailedLeadDetailState({
      uuid: "",
      status: "failed",
      statusExplained: "Lead detail request failed.",
      error: 'Route parameter "uuid" is required.',
    });
  }

  const target = new URL(`/api/rest/lead/${encodeURIComponent(uuid)}`, options.request.url);

  try {
    const response = await fetchImpl(target, {
      headers: {
        cookie: options.request.headers.get("cookie") || "",
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      const isNotFound = response.status === 404;
      return buildFailedLeadDetailState({
        uuid,
        status: isNotFound ? "not_found" : "failed",
        statusExplained: isNotFound ? "Requested lead was not found." : "Lead detail request failed.",
        error:
          payload && typeof payload.message === "string"
            ? payload.message
            : isNotFound
              ? "Requested lead was not found."
              : "Lead detail request failed.",
      });
    }

    return {
      entityType: "lead",
      uuid: typeof payload?.uuid === "string" ? payload.uuid : uuid,
      status: typeof payload?.status === "string" ? payload.status : "completed",
      statusExplained:
        typeof payload?.statusExplained === "string"
          ? payload.statusExplained
          : "Lead detail loaded successfully.",
      record: payload && payload.record && typeof payload.record === "object" ? payload.record : null,
      leadStages: Array.isArray(payload?.leadStages) ? payload.leadStages : [],
      meta:
        payload && payload.meta && typeof payload.meta === "object"
          ? payload.meta
          : {
              count: 0,
            },
      error: null,
    };
  } catch (error) {
    return buildFailedLeadDetailState({
      uuid,
      status: "failed",
      statusExplained: "Lead detail request failed.",
      error: error instanceof Error ? error.message : "Lead detail request failed.",
    });
  }
}

module.exports = {
  loadLeadDetailPage,
};
