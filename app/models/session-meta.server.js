/**
 * Loads the backend-authored session meta payload through the frontend BFF.
 * @param {{request: Request, fetchImpl?: typeof fetch}} options
 * @returns {Promise<object>}
 */
async function loadSessionMeta(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const apiUrl = new URL("/api/meta", options.request.url);
  const response = await fetchImpl(apiUrl.toString(), {
    headers: {
      cookie: options.request.headers.get("cookie") || ""
    }
  });

  if (response.status === 401) {
    return {
      redirectToSignin: true
    };
  }

  return await response.json();
}

module.exports = {
  loadSessionMeta
};
