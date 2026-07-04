class ListsApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ListsApiError";
    this.statusCode = Number.isFinite(options.statusCode)
      ? Number(options.statusCode)
      : 500;
  }
}

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function tryReadJson(response) {
  if (typeof response.text === "function") {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (_error) {
      return {
        message: text,
      };
    }
  }

  if (typeof response.json !== "function") {
    return null;
  }

  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

async function requestListsRest(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to load lists data.");
  }

  const response = await fetchImpl(new URL(options.path, options.request.url), {
    headers: {
      cookie: options.request.headers.get("cookie") || "",
    },
  });
  const payload = await tryReadJson(response);

  if (!response.ok) {
    throw new ListsApiError(
      readTrimmedString(payload?.message) || "Lists request failed.",
      {
        statusCode: response.status,
      }
    );
  }

  return {
    status: readTrimmedString(payload?.status) || "completed",
    statusExplained:
      readTrimmedString(payload?.statusExplained) || "Lists request completed successfully.",
    data: typeof options.readData === "function" ? options.readData(payload) : payload,
    meta:
      payload && payload.meta && typeof payload.meta === "object"
        ? payload.meta
        : {},
  };
}

async function loadListsIndex(options) {
  const target = new URL("/api/rest/lists", options.request.url);
  if (readTrimmedString(options.view)) {
    target.searchParams.set("view", readTrimmedString(options.view));
  }

  ["search", "type", "subtype", "status", "subjectType"].forEach((key) => {
    const value = readTrimmedString(options.request.url ? new URL(options.request.url).searchParams.get(key) : "");
    if (value) {
      target.searchParams.set(key, value);
    }
  });

  return await requestListsRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `${target.pathname}${target.search}`,
    readData(payload) {
      return Array.isArray(payload?.lists) ? payload.lists : [];
    },
  });
}

async function loadListDetail(options) {
  return await requestListsRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `/api/rest/lists/${encodeURIComponent(readTrimmedString(options.uuid))}`,
    readData(payload) {
      return payload?.listDetail ?? null;
    },
  });
}

async function saveListDetail(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to save lists data.");
  }

  const response = await fetchImpl(
    new URL(`/api/rest/lists/${encodeURIComponent(readTrimmedString(options.uuid))}`, options.request.url),
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: options.request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        name: readTrimmedString(options.name),
        description: typeof options.description === "string" ? options.description : "",
        listTypeSlug: readTrimmedString(options.listTypeSlug) || undefined,
        listSubTypeSlug: readTrimmedString(options.listSubTypeSlug) || undefined,
        subjectType: readTrimmedString(options.subjectType) || undefined,
        membershipMode: readTrimmedString(options.membershipMode) || undefined,
        status: readTrimmedString(options.status) || undefined,
      }),
    }
  );
  const payload = await tryReadJson(response);

  if (!response.ok) {
    throw new ListsApiError(
      readTrimmedString(payload?.message) || "Unable to save list detail.",
      {
        statusCode: response.status,
      }
    );
  }

  return {
    status: readTrimmedString(payload?.status) || "completed",
    statusExplained:
      readTrimmedString(payload?.statusExplained) || "List saved successfully.",
    data: payload?.list ?? null,
    meta:
      payload && payload.meta && typeof payload.meta === "object"
        ? payload.meta
        : {},
  };
}

async function loadEntityLists(options) {
  const entityType = readTrimmedString(options.entityType) === "person" ? "person" : "organization";
  return await requestListsRest({
    request: options.request,
    fetchImpl: options.fetchImpl,
    path: `/api/rest/${entityType}/${encodeURIComponent(readTrimmedString(options.uuid))}/lists`,
    readData(payload) {
      return Array.isArray(payload?.rows) ? payload.rows : [];
    },
  });
}

module.exports = {
  ListsApiError,
  loadEntityLists,
  loadListDetail,
  loadListsIndex,
  saveListDetail,
};
