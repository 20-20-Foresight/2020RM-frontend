const {
  SIF_TAXONOMY_DATA_ID,
  normalizeSifTaxonomyDocument
} = require("./sif-taxonomy");

const SIF_TAXONOMY_CACHE_KEY = "crm.data.taxonomy:sif";

/**
 * Builds one normalized cache record.
 * @param {{id?: string, version?: number|null, document?: unknown}} options
 * @returns {{cacheKey: string, id: string, version: number|null, savedAt: string, document: Record<string, unknown>}}
 */
function buildCachedSifTaxonomyRecord(options = {}) {
  return {
    cacheKey: SIF_TAXONOMY_CACHE_KEY,
    id: typeof options.id === "string" && options.id ? options.id : SIF_TAXONOMY_DATA_ID,
    version: Number.isFinite(options.version) ? Number(options.version) : null,
    savedAt: new Date().toISOString(),
    document: normalizeSifTaxonomyDocument(options.document)
  };
}

/**
 * Opens the SIF taxonomy cache database.
 * @returns {Promise<{get: (key: string) => Promise<unknown>, put: (value: unknown) => Promise<unknown>}>}
 */
async function openIndexedDbBackedStore() {
  const indexedDb = globalThis.indexedDB;
  if (!indexedDb || typeof indexedDb.open !== "function") {
    throw new Error("IndexedDB is not available in this environment.");
  }

  const database = await new Promise((resolve, reject) => {
    const request = indexedDb.open("2020rm-sif-taxonomy", 1);

    request.onerror = () => reject(request.error || new Error("Unable to open the SIF taxonomy cache."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", {
          keyPath: "cacheKey"
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

  return {
    async get(key) {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction("documents", "readonly");
        const store = transaction.objectStore("documents");
        const request = store.get(key);

        request.onerror = () => reject(request.error || new Error("Unable to read from the SIF taxonomy cache."));
        request.onsuccess = () => resolve(request.result || null);
      });
    },
    async put(value) {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction("documents", "readwrite");
        const store = transaction.objectStore("documents");
        const request = store.put(value);

        request.onerror = () => reject(request.error || new Error("Unable to write to the SIF taxonomy cache."));
        request.onsuccess = () => resolve(value);
      });
    }
  };
}

/**
 * Reads the cached SIF taxonomy record from IndexedDB.
 * @param {{openDatabase?: Function}} [options]
 * @returns {Promise<ReturnType<typeof buildCachedSifTaxonomyRecord>|null>}
 */
async function readCachedSifTaxonomy(options = {}) {
  const openDatabase = options.openDatabase || openIndexedDbBackedStore;
  const database = await openDatabase();
  const cached = await database.get(SIF_TAXONOMY_CACHE_KEY);

  if (!cached || typeof cached !== "object") {
    return null;
  }

  return {
    ...cached,
    document: normalizeSifTaxonomyDocument(cached.document)
  };
}

/**
 * Writes one SIF taxonomy record into IndexedDB.
 * @param {{id?: string, version?: number|null, document?: unknown, openDatabase?: Function}} options
 * @returns {Promise<ReturnType<typeof buildCachedSifTaxonomyRecord>>}
 */
async function writeCachedSifTaxonomy(options = {}) {
  const openDatabase = options.openDatabase || openIndexedDbBackedStore;
  const database = await openDatabase();
  const record = buildCachedSifTaxonomyRecord(options);
  await database.put(record);
  return record;
}

/**
 * Fetches the authoritative admin data document and refreshes the cache.
 * @param {{fetchImpl?: typeof fetch, openDatabase?: Function}} [options]
 * @returns {Promise<ReturnType<typeof buildCachedSifTaxonomyRecord>>}
 */
async function syncSifTaxonomyToCache(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to sync the SIF taxonomy cache.");
  }

  const response = await fetchImpl(`/api/rest/admin/data/${encodeURIComponent(SIF_TAXONOMY_DATA_ID)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || "Unable to sync the SIF taxonomy cache.");
  }

  return writeCachedSifTaxonomy({
    id: payload?.data?.id || SIF_TAXONOMY_DATA_ID,
    version: payload?.data?.version ?? null,
    document: payload?.data?.document ?? null,
    openDatabase: options.openDatabase
  });
}

if (typeof module !== "undefined") {
  module.exports = {
    SIF_TAXONOMY_CACHE_KEY,
    buildCachedSifTaxonomyRecord,
    readCachedSifTaxonomy,
    syncSifTaxonomyToCache,
    writeCachedSifTaxonomy
  };
}
