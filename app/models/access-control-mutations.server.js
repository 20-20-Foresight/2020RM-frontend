class AccessControlMutationApiError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "AccessControlMutationApiError";
    this.code = options.code || "access_control_mutation_failed";
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

function readRoleKeys(formData) {
  return formData
    .getAll("roleKeys")
    .map((value) => readTrimmedString(value))
    .filter(Boolean);
}

async function updateAccessControlUser(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to update access control users.");
  }

  const userId = readTrimmedString(options.formData.get("userId"));
  if (!userId) {
    throw new AccessControlMutationApiError("User id is required.", {
      code: "invalid_user_update",
      statusCode: 400
    });
  }

  const payload = {
    status: readTrimmedString(options.formData.get("status")) || "pending_access",
    roleKeys: readRoleKeys(options.formData),
    defaultPersonaKey: readTrimmedString(options.formData.get("defaultPersonaKey")),
    localPersonId: readTrimmedString(options.formData.get("localPersonId")),
    rpcPersonId: readTrimmedString(options.formData.get("rpcPersonId"))
  };

  let response;
  try {
    response = await fetchImpl(new URL(`/api/admin/access/users/${encodeURIComponent(userId)}`, options.request.url), {
      method: "PATCH",
      headers: {
        cookie: options.request.headers.get("cookie") || "",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new AccessControlMutationApiError("Unable to reach the access control service.", {
      code: "access_control_unreachable",
      statusCode: 502,
      cause: error
    });
  }

  const responsePayload = await tryReadJson(response);
  if (!response.ok) {
    const isMissingRoute = response.status === 404;
    throw new AccessControlMutationApiError(
      isMissingRoute
        ? "Access control update route is unavailable on the backend. Restart 2020RM-backend and try again."
        :
      readTrimmedString(responsePayload?.message) ||
        readTrimmedString(responsePayload?.error) ||
        `Access control update failed (HTTP ${response.status}).`,
      {
        code: isMissingRoute
          ? "access_control_route_unavailable"
          : readTrimmedString(responsePayload?.error) || "access_control_mutation_failed",
        statusCode: response.status
      }
    );
  }

  return isPlainObject(responsePayload?.user) ? responsePayload.user : null;
}

async function createAccessControlLocalPerson(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to create local people.");
  }

  const userId = readTrimmedString(options.formData.get("userId"));
  if (!userId) {
    throw new AccessControlMutationApiError("User id is required.", {
      code: "invalid_local_person_create",
      statusCode: 400
    });
  }

  let response;
  try {
    response = await fetchImpl(
      new URL(`/api/admin/access/users/${encodeURIComponent(userId)}/create-local-person`, options.request.url),
      {
        method: "POST",
        headers: {
          cookie: options.request.headers.get("cookie") || ""
        }
      }
    );
  } catch (error) {
    throw new AccessControlMutationApiError("Unable to reach the access control service.", {
      code: "access_control_unreachable",
      statusCode: 502,
      cause: error
    });
  }

  const responsePayload = await tryReadJson(response);
  if (!response.ok) {
    throw new AccessControlMutationApiError(
      readTrimmedString(responsePayload?.message) ||
        readTrimmedString(responsePayload?.error) ||
        `Local person creation failed (HTTP ${response.status}).`,
      {
        code: readTrimmedString(responsePayload?.error) || "access_control_mutation_failed",
        statusCode: response.status
      }
    );
  }

  return {
    user: isPlainObject(responsePayload?.user) ? responsePayload.user : null,
    person: isPlainObject(responsePayload?.person) ? responsePayload.person : null,
    link: isPlainObject(responsePayload?.link) ? responsePayload.link : null
  };
}

async function createAccessControlUser(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to create users.");
  }

  const payload = {
    firstName: readTrimmedString(options.formData.get("firstName")),
    lastName: readTrimmedString(options.formData.get("lastName")),
    email: readTrimmedString(options.formData.get("email"))
  };

  let response;
  try {
    response = await fetchImpl(new URL("/api/admin/access/users", options.request.url), {
      method: "POST",
      headers: {
        cookie: options.request.headers.get("cookie") || "",
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new AccessControlMutationApiError("Unable to reach the access control service.", {
      code: "access_control_unreachable",
      statusCode: 502,
      cause: error
    });
  }

  const responsePayload = await tryReadJson(response);
  if (!response.ok) {
    throw new AccessControlMutationApiError(
      readTrimmedString(responsePayload?.message) ||
        readTrimmedString(responsePayload?.error) ||
        `User creation failed (HTTP ${response.status}).`,
      {
        code: readTrimmedString(responsePayload?.error) || "access_control_mutation_failed",
        statusCode: response.status
      }
    );
  }

  return isPlainObject(responsePayload?.user) ? responsePayload.user : null;
}

async function startGhostSession(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to start ghost sessions.");
  }

  const effectiveUserId = readTrimmedString(options.formData.get("effectiveUserId"));
  if (!effectiveUserId) {
    throw new AccessControlMutationApiError("Effective user id is required.", {
      code: "invalid_ghost_start",
      statusCode: 400
    });
  }

  let response;
  try {
    response = await fetchImpl(new URL("/api/ghost/start", options.request.url), {
      method: "POST",
      headers: {
        cookie: options.request.headers.get("cookie") || "",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        effectiveUserId
      })
    });
  } catch (error) {
    throw new AccessControlMutationApiError("Unable to reach the ghost service.", {
      code: "ghost_unreachable",
      statusCode: 502,
      cause: error
    });
  }

  const responsePayload = await tryReadJson(response);
  if (!response.ok) {
    throw new AccessControlMutationApiError(
      readTrimmedString(responsePayload?.message) ||
        readTrimmedString(responsePayload?.error) ||
        `Ghost start failed (HTTP ${response.status}).`,
      {
        code: readTrimmedString(responsePayload?.error) || "ghost_start_failed",
        statusCode: response.status
      }
    );
  }

  return isPlainObject(responsePayload?.ghost) ? responsePayload.ghost : null;
}

module.exports = {
  AccessControlMutationApiError,
  createAccessControlUser,
  createAccessControlLocalPerson,
  startGhostSession,
  updateAccessControlUser
};
