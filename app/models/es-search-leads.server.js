function readBooleanQuery(url, key, fallback = false) {
  const rawValue = new URL(url).searchParams.get(key);
  if (typeof rawValue !== "string") {
    return fallback;
  }
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function readStageQuery(url) {
  return new URL(url).searchParams
    .getAll("stage")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function buildFailedLeadsState(options) {
  return {
    leadType: "ES Job Search",
    status: options.status,
    statusExplained: options.statusExplained,
    leads: [],
    leadStages: [],
    filters: {
      myLeads: options.myLeads,
      stages: options.stages,
    },
    meta: {
      count: 0,
    },
    error: options.error,
  };
}

function getDefaultLeadStages(leadType) {
  if (leadType !== "ES Job Search") {
    return [];
  }

  return [
    {
      name: "Analysis",
      description: "Initial search analysis and qualification.",
    },
    {
      name: "Proposal",
      description: "Active proposal and scope definition.",
    },
    {
      name: "Negotiation",
      description: "Commercial terms are being negotiated.",
    },
    {
      name: "Closed Won",
      description: "Search won and moving forward.",
    },
    {
      name: "Closed Lost",
      description: "Search did not move forward.",
    },
  ];
}

async function loadEsSearchLeadsPage(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const myLeads = readBooleanQuery(options.request.url, "myLeads", true);
  const stages = readStageQuery(options.request.url);
  const target = new URL("/api/rest/leads", options.request.url);
  target.searchParams.set("leadType", "ES Job Search");
  target.searchParams.set("myLeads", myLeads ? "true" : "false");
  stages.forEach((stage) => target.searchParams.append("stage", stage));

  try {
    const response = await fetchImpl(target, {
      headers: {
        cookie: options.request.headers.get("cookie") || "",
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      return buildFailedLeadsState({
        myLeads,
        stages,
        status: "failed",
        statusExplained: "Lead list request failed.",
        error:
          payload && typeof payload.message === "string"
            ? payload.message
            : "Lead list request failed.",
      });
    }

    const leadType = typeof payload?.leadType === "string" ? payload.leadType : "ES Job Search";

    return {
      leadType,
      status: typeof payload?.status === "string" ? payload.status : "completed",
      statusExplained:
        typeof payload?.statusExplained === "string"
          ? payload.statusExplained
          : "Leads loaded successfully.",
      leads: Array.isArray(payload?.leads) ? payload.leads : [],
      leadStages:
        Array.isArray(payload?.leadStages) && payload.leadStages.length
          ? payload.leadStages
          : getDefaultLeadStages(leadType),
      filters: {
        myLeads,
        stages,
      },
      meta:
        payload && payload.meta && typeof payload.meta === "object"
          ? payload.meta
          : {
              count: 0,
            },
      error: null,
    };
  } catch (error) {
    return buildFailedLeadsState({
      myLeads,
      stages,
      status: "failed",
      statusExplained: "Lead list request failed.",
      error: error instanceof Error ? error.message : "Lead list request failed.",
    });
  }
}

module.exports = {
  loadEsSearchLeadsPage,
};
