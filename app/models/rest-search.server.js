/**
 * Reads and trims the `name` search parameter from a request URL.
 * @param {string} requestUrl
 * @returns {string}
 */
function readNameQuery(requestUrl) {
  const name = new URL(requestUrl).searchParams.get("name");
  return typeof name === "string" ? name.trim() : "";
}

/**
 * Builds the initial empty state for a search page.
 * @param {string} entityLabel
 * @returns {{query: {name: string}, status: string, statusExplained: string, results: object[], meta: {count: number}, schema: object|null, error: string|null}}
 */
function buildIdleState(entityLabel) {
  return {
    query: {
      name: ""
    },
    status: "idle",
    statusExplained: `Enter a name to search ${entityLabel}.`,
    results: [],
    meta: {
      count: 0
    },
    schema: null,
    error: null
  };
}

/**
 * Loads one REST-backed search page through the frontend BFF.
 * @param {{
 *   request: Request,
 *   entityType: "organization" | "person",
 *   fetchImpl?: typeof fetch
 * }} options
 * @returns {Promise<{query: {name: string}, status: string, statusExplained: string, results: object[], meta: {count: number} & object, schema: object|null, error: string|null}>}
 */
async function loadRestSearchPage(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const name = readNameQuery(options.request.url);
  const entityLabel = options.entityType === "person" ? "people" : "organizations";

  if (!name) {
    return buildIdleState(entityLabel);
  }

  const target = new URL(`/api/rest/${options.entityType}`, options.request.url);
  target.searchParams.set("name", name);

  try {
    const response = await fetchImpl(target, {
      headers: {
        cookie: options.request.headers.get("cookie") || ""
      }
    });
    const payload = await response.json();

    if (!response.ok) {
      return {
        query: {
          name
        },
        status: "failed",
        statusExplained: "Search request failed.",
        results: [],
        meta: {
          count: 0
        },
        schema: null,
        error: payload && typeof payload.message === "string" ? payload.message : "Search request failed."
      };
    }

    return {
      query: {
        name
      },
      status: typeof payload.status === "string" ? payload.status : "completed",
      statusExplained:
        typeof payload.statusExplained === "string"
          ? payload.statusExplained
          : "Search completed successfully.",
      results: Array.isArray(payload.results) ? payload.results : [],
      meta:
        payload && payload.meta && typeof payload.meta === "object"
          ? payload.meta
          : {
              count: 0
            },
      schema:
        payload && payload.schema && typeof payload.schema === "object"
          ? payload.schema
          : null,
      error: null
    };
  } catch (error) {
    return {
      query: {
        name
      },
      status: "failed",
      statusExplained: "Search request failed.",
      results: [],
      meta: {
        count: 0
      },
      schema: null,
      error: error instanceof Error ? error.message : "Search request failed."
    };
  }
}

module.exports = {
  loadRestSearchPage
};
