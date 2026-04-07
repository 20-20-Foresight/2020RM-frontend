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
 * Loads the admin access-control page data.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{roles: object[], users: object[], error: string|null}>}
 */
async function loadAccessControlPage(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const headers = {
    cookie: options.request.headers.get("cookie") || ""
  };

  const [rolesResponse, usersResponse] = await Promise.all([
    fetchImpl(new URL("/api/admin/access/roles", options.request.url).toString(), { headers }),
    fetchImpl(new URL("/api/admin/access/users", options.request.url).toString(), { headers })
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

module.exports = {
  loadAccessControlPage
};
