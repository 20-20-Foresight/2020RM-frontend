class AccessRoleMutationApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "AccessRoleMutationApiError";
    this.code = options.code || "access_role_mutation_failed";
    this.statusCode = options.statusCode || 500;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

async function tryReadJson(response) {
  if (!response || typeof response.json !== "function") {
    return null;
  }

  try {
    const payload = await response.json();
    return isPlainObject(payload) ? payload : null;
  } catch (_error) {
    return null;
  }
}

function readPermissions(formData) {
  return formData
    .getAll("permissionKeys")
    .map((value) => readTrimmedString(value))
    .filter(Boolean)
    .map((value) => value.split(":"))
    .filter((parts) => parts.length === 3)
    .map(([category, target, action]) => ({
      category,
      target,
      action
    }));
}

async function createAccessRole(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to create access roles.");
  }

  const payload = {
    key: readTrimmedString(options.formData.get("key")),
    label: readTrimmedString(options.formData.get("label")),
    description: readTrimmedString(options.formData.get("description")),
    permissions: readPermissions(options.formData)
  };

  let response;
  try {
    response = await fetchImpl(new URL("/api/admin/access/roles", options.request.url), {
      method: "POST",
      headers: {
        cookie: options.request.headers.get("cookie") || "",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new AccessRoleMutationApiError("Unable to reach the access role service.", {
      code: "access_role_unreachable",
      statusCode: 502,
      cause: error
    });
  }

  const responsePayload = await tryReadJson(response);
  if (!response.ok) {
    throw new AccessRoleMutationApiError(
      readTrimmedString(responsePayload?.message) ||
        readTrimmedString(responsePayload?.error) ||
        `Access role request failed (HTTP ${response.status}).`,
      {
        code: readTrimmedString(responsePayload?.error) || "access_role_mutation_failed",
        statusCode: response.status
      }
    );
  }

  return isPlainObject(responsePayload?.role) ? responsePayload.role : null;
}

module.exports = {
  AccessRoleMutationApiError,
  createAccessRole
};
