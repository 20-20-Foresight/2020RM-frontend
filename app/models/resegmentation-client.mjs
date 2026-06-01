import { readTrimmedString } from "./resegmentation-ui.mjs";

/**
 * Reads one route-action response without hiding HTML/auth/404 failures behind JSON parse errors.
 * @param {Response} response
 * @returns {Promise<object>}
 */
export async function readActionResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return bodyText ? JSON.parse(bodyText) : {};
    } catch (error) {
      throw new Error("The resegmentation action returned invalid JSON.");
    }
  }

  const titleMatch = bodyText.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const message = title || bodyText.trim() || response.statusText || "Unexpected non-JSON response.";
  throw new Error(
    response.redirected || bodyText.includes("<!DOCTYPE")
      ? `${message}. The request returned an HTML page instead of JSON; refresh the page and sign in again if needed.`
      : message
  );
}

/**
 * Calls one same-origin 2020RM-backend proxy endpoint for an interactive tool action.
 * @param {string} intent
 * @param {Record<string, unknown>} fields
 * @returns {Promise<object>}
 */
export async function postResegmentationAction(intent, fields = {}) {
  const uuid = readTrimmedString(fields.uuid);
  let requestPath = "";
  const requestOptions = {
    method: "GET",
    credentials: "same-origin"
  };

  if (intent === "searchOrganizations") {
    const params = new URLSearchParams({
      name: readTrimmedString(fields.query)
    });
    requestPath = `/api/rest/resegmentation/organizations?${params.toString()}`;
  } else if (intent === "loadOrganization") {
    requestPath = `/api/rest/resegmentation/organizations/${encodeURIComponent(uuid)}`;
  } else if (intent === "loadListDetail") {
    requestPath = `/api/rest/resegmentation/lists/${encodeURIComponent(uuid)}`;
  } else if (intent === "segmentOrganization") {
    requestPath = `/api/rest/resegmentation/organizations/${encodeURIComponent(uuid)}/segment`;
    requestOptions.method = "POST";
    requestOptions.headers = {
      "content-type": "application/json"
    };
    requestOptions.body = JSON.stringify({
      strategy: readTrimmedString(fields.strategy) || "legacy",
      dryRun: fields.dryRun !== false,
      saveSalesforce: fields.saveSalesforce === true,
      includeExplanation: fields.includeExplanation !== false
    });
  } else {
    throw new Error("Unknown resegmentation action.");
  }

  const response = await fetch(requestPath, requestOptions);
  const payload = await readActionResponse(response);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Resegmentation request failed.");
  }

  if (intent === "searchOrganizations") {
    return {
      organizations: Array.isArray(payload.organizations) ? payload.organizations : [],
      status: payload.status,
      statusExplained: payload.statusExplained
    };
  }
  if (intent === "loadOrganization") {
    return {
      organization: payload.organization || null,
      status: payload.status,
      statusExplained: payload.statusExplained
    };
  }
  if (intent === "loadListDetail") {
    return {
      listDetail: payload.listDetail || null,
      status: payload.status,
      statusExplained: payload.statusExplained
    };
  }
  if (intent === "segmentOrganization") {
    return {
      resegmentation: payload.resegmentation || null,
      status: payload.status,
      statusExplained: payload.statusExplained
    };
  }

  return payload;
}
