/**
 * Reads one JSON response body safely.
 * @param {Response} response
 * @returns {Promise<object>}
 */
async function readJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

/**
 * Reads one same-origin access-control payload.
 * @param {{request: Request, pathname: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<Response>}
 */
async function fetchAccessControl(options) {
  const fetchImpl = options.fetchImpl || fetch;
  return await fetchImpl(new URL(options.pathname, options.request.url).toString(), {
    headers: {
      cookie: options.request.headers.get("cookie") || ""
    }
  });
}

/**
 * Loads the admin access-control page data.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{roles: object[], users: object[], error: string|null}>}
 */
async function loadAccessControlPage(options) {
  const [rolesResponse, usersResponse] = await Promise.all([
    fetchAccessControl({ ...options, pathname: "/api/admin/access/roles" }),
    fetchAccessControl({ ...options, pathname: "/api/admin/access/users" })
  ]);

  if (!rolesResponse.ok || !usersResponse.ok) {
    const errorPayload = !rolesResponse.ok
      ? await readJson(rolesResponse)
      : await readJson(usersResponse);

    return {
      roles: [],
      users: [],
      error: typeof errorPayload.error === "string"
        ? errorPayload.error
        : "Unable to load access control data."
    };
  }

  const rolesPayload = await readJson(rolesResponse);
  const usersPayload = await readJson(usersResponse);

  return {
    roles: Array.isArray(rolesPayload.roles) ? rolesPayload.roles : [],
    users: Array.isArray(usersPayload.users) ? usersPayload.users : [],
    error: null
  };
}

/**
 * Loads the admin role-management page data.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {{roles: object[], sections: object[], error: string|null}}
 */
async function loadRoleManagementPage(options) {
  const [rolesResponse, sectionsResponse] = await Promise.all([
    fetchAccessControl({ ...options, pathname: "/api/admin/access/roles" }),
    fetchAccessControl({ ...options, pathname: "/api/admin/access/permissions" })
  ]);

  if (!rolesResponse.ok || !sectionsResponse.ok) {
    const errorPayload = !rolesResponse.ok
      ? await readJson(rolesResponse)
      : await readJson(sectionsResponse);

    return {
      roles: [],
      sections: [],
      error: typeof errorPayload.error === "string"
        ? errorPayload.error
        : "Unable to load roles."
    };
  }

  const rolesPayload = await readJson(rolesResponse);
  const sectionsPayload = await readJson(sectionsResponse);

  return {
    roles: Array.isArray(rolesPayload.roles) ? rolesPayload.roles : [],
    sections: Array.isArray(sectionsPayload.sections) ? sectionsPayload.sections : [],
    error: null
  };
}

module.exports = {
  loadAccessControlPage,
  loadRoleManagementPage
};
