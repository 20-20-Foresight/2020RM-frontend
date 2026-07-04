"use strict";

const fs = require("fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  AdminDataApiError,
  loadRawAdminDataDocument,
  saveRawAdminDataDocument,
} = require("./admin-data.server");

const SEED_FILE_PATH = path.resolve(
  process.cwd(),
  "app/data/segmentation-v312-documents.json"
);
const DOCUMENT_TYPE = "segmentation-v312-playbook";
const DOCUMENT_EDITOR = {
  shape: "object",
  customDocumentType: "segmentation-v312-playbook",
};
const SYNC_STATUS_PATH = "/api/rest/admin/segmentation-ai-sync";
const DOCUMENT_CONFIG = [
  {
    slug: "sector",
    key: "segmentation.v312.sector",
    title: "Sector",
    summary:
      "Top-level business definitions and decision guidance for deciding the broadest classification.",
  },
  {
    slug: "vertical",
    key: "segmentation.v312.vertical",
    title: "Vertical",
    summary:
      "Primary operating identities inside each sector, with the guidance for deciding which one wins.",
  },
  {
    slug: "keywords",
    key: "segmentation.v312.keywords",
    title: "Keywords",
    summary:
      "Keyword definitions plus the rules for which matched phrases should be retained and shown.",
  },
  {
    slug: "email-industry",
    key: "segmentation.v312.email-industry",
    title: "Email Industry",
    summary:
      "Definitions and translation rules for producing the existing email-industry bucket from richer segmentation context.",
  },
];

function buildSegmentationDocumentPath(slug) {
  return `/admin/data/segmentation/${encodeURIComponent(slug)}`;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function slugifyText(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTextList(value) {
  return String(value || "")
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readConfigBySlug(slug) {
  const normalizedSlug = normalizeText(slug).toLowerCase();
  return DOCUMENT_CONFIG.find(
    (document) => normalizeText(document.slug).toLowerCase() === normalizedSlug
  ) || null;
}

async function readSeedDocuments() {
  const raw = await fs.readFile(SEED_FILE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function readSeedDocument(slug) {
  const normalizedSlug = normalizeText(slug).toLowerCase();
  const documents = await readSeedDocuments();
  return (
    documents.find(
      (document) => normalizeText(document.slug).toLowerCase() === normalizedSlug
    ) || null
  );
}

function buildDocumentId(config) {
  return config ? `crm.data:${config.key}` : "";
}

function buildDocumentMetadata(config, document) {
  return {
    type: DOCUMENT_TYPE,
    name: config?.title || document?.title || "Untitled segmentation playbook",
  };
}

function normalizeKeywordVisibility(definition = {}, fallback = true) {
  if (typeof definition?.visible === "boolean") {
    return definition.visible;
  }

  return fallback;
}

function normalizeDefinition(config, definition = {}) {
  if (!isPlainObject(definition)) {
    return definition;
  }

  if (config?.slug !== "keywords") {
    return definition;
  }

  return {
    ...definition,
    visible: normalizeKeywordVisibility(definition, true),
  };
}

function normalizeSyncStatus(value) {
  const documentVersions = isPlainObject(value?.documentVersions)
    ? Object.fromEntries(
        Object.entries(value.documentVersions)
          .map(([key, entry]) => [normalizeText(key), normalizeText(entry)])
          .filter(([key, entry]) => key && entry)
      )
    : {};
  const currentDocumentVersions = isPlainObject(value?.currentDocumentVersions)
    ? Object.fromEntries(
        Object.entries(value.currentDocumentVersions)
          .map(([key, entry]) => [normalizeText(key), normalizeText(entry)])
          .filter(([key, entry]) => key && entry)
      )
    : {};

  return {
    status: normalizeText(value?.status) || "idle",
    dirty: value?.dirty === true,
    nextScheduledAt: normalizeText(value?.nextScheduledAt) || null,
    lastRequestedAt: normalizeText(value?.lastRequestedAt) || null,
    lastRequestedBy: normalizeText(value?.lastRequestedBy) || null,
    lastStartedAt: normalizeText(value?.lastStartedAt) || null,
    lastSyncedAt: normalizeText(value?.lastSyncedAt) || null,
    lastFailedAt: normalizeText(value?.lastFailedAt) || null,
    lastErrorMessage: normalizeText(value?.lastErrorMessage) || null,
    lastSource: normalizeText(value?.lastSource) || null,
    lastChangedDocumentSlug: normalizeText(value?.lastChangedDocumentSlug) || null,
    vectorStoreId: normalizeText(value?.vectorStoreId) || null,
    documentVersions,
    currentDocumentVersions,
  };
}

async function requestSegmentationSyncApi(options) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is required to manage segmentation AI sync.");
  }

  const target = new URL(SYNC_STATUS_PATH, options.request.url);
  let response;

  try {
    const headers = {
      cookie: options.request.headers.get("cookie") || "",
    };
    const requestInit = {
      method: options.method || "GET",
      headers,
    };

    if (options.body && isPlainObject(options.body)) {
      headers["content-type"] = "application/json";
      requestInit.body = JSON.stringify(options.body);
    }

    response = await fetchImpl(target, requestInit);
  } catch (error) {
    throw new Error("Unable to reach the segmentation AI sync service.", {
      cause: error,
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      normalizeText(payload?.message) ||
        `Segmentation AI sync request failed (HTTP ${response.status}).`
    );
  }

  return payload;
}

async function loadSegmentationPlaybookSyncStatus({ request, fetchImpl }) {
  const payload = await requestSegmentationSyncApi({
    request,
    fetchImpl,
  });
  return normalizeSyncStatus(payload?.data || {});
}

async function scheduleSegmentationPlaybookSync({
  request,
  changedDocumentSlug,
  source = "segmentation_playbook_save",
  fetchImpl,
}) {
  const payload = await requestSegmentationSyncApi({
    request,
    method: "POST",
    body: {
      mode: "schedule",
      source,
      changedDocumentSlug: normalizeText(changedDocumentSlug) || null,
    },
    fetchImpl,
  });
  return normalizeSyncStatus(payload?.data || {});
}

function normalizeLoadedDocument(config, rawDocument) {
  const document = rawDocument?.document || {};
  return {
    id: rawDocument?.id || buildDocumentId(config),
    slug: config.slug,
    key: config.key,
    title: normalizeText(document?.title) || config.title,
    summary: normalizeText(document?.summary) || config.summary,
    definitions: Array.isArray(document?.definitions)
      ? document.definitions.map((definition) => normalizeDefinition(config, definition))
      : [],
    rules: Array.isArray(document?.rules) ? document.rules : [],
    description:
      typeof rawDocument?.description === "string"
        ? rawDocument.description
        : normalizeText(document?.summary) || config.summary,
    version: Number.isFinite(Number(rawDocument?.version))
      ? Number(rawDocument.version)
      : null,
    path: buildSegmentationDocumentPath(config.slug),
    metadata:
      rawDocument?.metadata && typeof rawDocument.metadata === "object"
        ? rawDocument.metadata
        : buildDocumentMetadata(config, document),
    editor:
      rawDocument?.editor && typeof rawDocument.editor === "object"
        ? rawDocument.editor
        : DOCUMENT_EDITOR,
  };
}

function isDocumentEffectivelyEmpty(document) {
  if (!document || typeof document !== "object") {
    return true;
  }

  const definitions = Array.isArray(document.definitions) ? document.definitions : [];
  const rules = Array.isArray(document.rules) ? document.rules : [];

  return definitions.length === 0 && rules.length === 0;
}

function buildDefinitionIdentity(definition) {
  const key = normalizeText(definition?.key).toLowerCase();
  if (key) {
    return `key:${key}`;
  }

  const id = normalizeText(definition?.id).toLowerCase();
  return id ? `id:${id}` : "";
}

function buildRuleIdentity(rule) {
  const id = normalizeText(rule?.id).toLowerCase();
  if (id) {
    return `id:${id}`;
  }

  const name = normalizeText(rule?.name).toLowerCase();
  return name ? `name:${name}` : "";
}

function mergeMissingSeedEntries(currentDocument, seedDocument) {
  const currentDefinitions = Array.isArray(currentDocument?.definitions)
    ? currentDocument.definitions
    : [];
  const currentRules = Array.isArray(currentDocument?.rules)
    ? currentDocument.rules
    : [];
  const seedDefinitions = Array.isArray(seedDocument?.definitions)
    ? seedDocument.definitions
    : [];
  const seedRules = Array.isArray(seedDocument?.rules) ? seedDocument.rules : [];

  const definitionIdentities = new Set(
    currentDefinitions.map((definition) => buildDefinitionIdentity(definition)).filter(Boolean)
  );
  const ruleIdentities = new Set(
    currentRules.map((rule) => buildRuleIdentity(rule)).filter(Boolean)
  );

  let changed = false;
  const seedDefinitionByIdentity = new Map(
    seedDefinitions
      .map((definition) => [buildDefinitionIdentity(definition), definition])
      .filter(([identity]) => Boolean(identity))
  );
  const mergedDefinitions = currentDefinitions.map((definition) => {
    const identity = buildDefinitionIdentity(definition);
    const seedDefinition = identity ? seedDefinitionByIdentity.get(identity) : null;
    if (
      seedDefinition &&
      typeof seedDefinition.visible === "boolean" &&
      typeof definition?.visible !== "boolean"
    ) {
      changed = true;
      return {
        ...definition,
        visible: seedDefinition.visible,
      };
    }
    return definition;
  });

  const appendedDefinitions = seedDefinitions.filter((definition) => {
    const identity = buildDefinitionIdentity(definition);
    return identity && !definitionIdentities.has(identity);
  });
  const appendedRules = seedRules.filter((rule) => {
    const identity = buildRuleIdentity(rule);
    return identity && !ruleIdentities.has(identity);
  });

  return {
    changed: changed || appendedDefinitions.length > 0 || appendedRules.length > 0,
    document: {
      ...currentDocument,
      definitions: mergedDefinitions.concat(appendedDefinitions),
      rules: currentRules.concat(appendedRules),
    },
  };
}

async function loadOrBootstrapDocument({ request, slug }) {
  const config = readConfigBySlug(slug);
  if (!config) {
    return null;
  }

  try {
    const loaded = await loadRawAdminDataDocument({
      request,
      id: buildDocumentId(config),
    });
    const seedDocument = await readSeedDocument(config.slug);

    if (!isDocumentEffectivelyEmpty(loaded?.document)) {
      if (!seedDocument) {
        return normalizeLoadedDocument(config, loaded);
      }

      const merged = mergeMissingSeedEntries(loaded.document, seedDocument);
      if (!merged.changed) {
        return normalizeLoadedDocument(config, loaded);
      }

      await saveRawAdminDataDocument({
        request,
        id: loaded?.id || buildDocumentId(config),
        metadata:
          loaded?.metadata && typeof loaded.metadata === "object"
            ? loaded.metadata
            : buildDocumentMetadata(config, merged.document),
        description:
          typeof loaded?.description === "string" && loaded.description.trim()
            ? loaded.description
            : normalizeText(seedDocument.summary) || config.summary,
        expectedVersion: loaded?.version,
        editor:
          loaded?.editor && typeof loaded.editor === "object"
            ? loaded.editor
            : DOCUMENT_EDITOR,
        document: merged.document,
      });

      const refreshed = await loadRawAdminDataDocument({
        request,
        id: loaded?.id || buildDocumentId(config),
      });
      return normalizeLoadedDocument(config, refreshed);
    }

    if (!seedDocument) {
      return normalizeLoadedDocument(config, loaded);
    }

    await saveRawAdminDataDocument({
      request,
      id: loaded?.id || buildDocumentId(config),
      metadata:
        loaded?.metadata && typeof loaded.metadata === "object"
          ? loaded.metadata
          : buildDocumentMetadata(config, seedDocument),
      description: normalizeText(seedDocument.summary) || config.summary,
      expectedVersion: loaded?.version,
      editor:
        loaded?.editor && typeof loaded.editor === "object"
          ? loaded.editor
          : DOCUMENT_EDITOR,
      document: {
        slug: config.slug,
        title: config.title,
        summary: normalizeText(seedDocument.summary) || config.summary,
        definitions: Array.isArray(seedDocument.definitions)
          ? seedDocument.definitions
          : [],
        rules: Array.isArray(seedDocument.rules) ? seedDocument.rules : [],
      },
    });

    const restored = await loadRawAdminDataDocument({
      request,
      id: loaded?.id || buildDocumentId(config),
    });
    return normalizeLoadedDocument(config, restored);
  } catch (error) {
    if (!(error instanceof AdminDataApiError) || error.statusCode !== 404) {
      throw error;
    }
  }

  const seedDocument = await readSeedDocument(config.slug);
  if (!seedDocument) {
    throw new Error(`Missing segmentation seed document for ${config.slug}.`);
  }

  const saved = await saveRawAdminDataDocument({
    request,
    id: buildDocumentId(config),
    metadata: buildDocumentMetadata(config, seedDocument),
    description: normalizeText(seedDocument.summary) || config.summary,
    editor: DOCUMENT_EDITOR,
    document: {
      slug: config.slug,
      title: config.title,
      summary: normalizeText(seedDocument.summary) || config.summary,
      definitions: Array.isArray(seedDocument.definitions)
        ? seedDocument.definitions
        : [],
      rules: Array.isArray(seedDocument.rules) ? seedDocument.rules : [],
    },
  });

  const loaded = await loadRawAdminDataDocument({
    request,
    id: saved?.id || buildDocumentId(config),
  });
  return normalizeLoadedDocument(config, loaded);
}

async function saveDocument({ request, slug, mutate }) {
  const currentDocument = await loadOrBootstrapDocument({
    request,
    slug,
  });
  if (!currentDocument) {
    throw new Error(`Unknown segmentation document: ${slug}`);
  }

  const nextDocument = JSON.parse(
    JSON.stringify({
      slug: currentDocument.slug,
      title: currentDocument.title,
      summary: currentDocument.summary,
      definitions: currentDocument.definitions,
      rules: currentDocument.rules,
    })
  );

  mutate(nextDocument);

  await saveRawAdminDataDocument({
    request,
    id: currentDocument.id,
    metadata: currentDocument.metadata,
    description: currentDocument.summary,
    expectedVersion: currentDocument.version,
    editor: currentDocument.editor,
    document: nextDocument,
  });

  let syncStatus = null;
  try {
    syncStatus = await scheduleSegmentationPlaybookSync({
      request,
      changedDocumentSlug: slug,
    });
  } catch (_error) {
    syncStatus = null;
  }

  const document = await loadOrBootstrapDocument({
    request,
    slug,
  });
  return {
    document,
    syncStatus,
  };
}

async function loadSegmentationDocuments({ request }) {
  const documents = await Promise.all(
    DOCUMENT_CONFIG.map((config) =>
      loadOrBootstrapDocument({
        request,
        slug: config.slug,
      })
    )
  );
  let syncStatus = null;
  try {
    syncStatus = await loadSegmentationPlaybookSyncStatus({ request });
  } catch (_error) {
    syncStatus = null;
  }

  return {
    documents: documents.map((document) => ({
      id: document.id,
      slug: document.slug,
      title: document.title,
      summary: document.summary,
      path: document.path,
    })),
    syncStatus,
  };
}

async function loadSegmentationDocument({ request, slug }) {
  const document = await loadOrBootstrapDocument({ request, slug });
  let syncStatus = null;
  try {
    syncStatus = await loadSegmentationPlaybookSyncStatus({ request });
  } catch (_error) {
    syncStatus = null;
  }

  return {
    document,
    syncStatus,
  };
}

async function updateDefinition({
  request,
  slug,
  definitionId,
  label,
  description,
  examplesText,
  notesText,
  visible,
}) {
  return await saveDocument({
    request,
    slug,
    mutate(document) {
      const definitionIndex = (document.definitions || []).findIndex(
        (definition) => definition.id === definitionId
      );
      if (definitionIndex < 0) {
        throw new Error(`Unknown definition: ${definitionId}`);
      }

      const existing = document.definitions[definitionIndex];
      document.definitions[definitionIndex] = {
        ...existing,
        label: normalizeText(label) || existing.label,
        description: normalizeText(description),
        examples: normalizeTextList(examplesText),
        notes: normalizeTextList(notesText),
        ...(slug === "keywords" ? { visible: visible !== false } : {}),
      };
    },
  });
}

async function addDefinition({
  request,
  slug,
  label,
  description,
  examplesText,
  notesText,
  visible,
}) {
  const normalizedLabel = normalizeText(label) || "New Definition";
  let addedDefinitionId = "";
  const result = await saveDocument({
    request,
    slug,
    mutate(document) {
      const definitions = Array.isArray(document.definitions) ? document.definitions : [];
      const keyBase = slugifyText(normalizedLabel) || randomUUID();
      const slugPrefix = normalizeText(slug) || "definition";
      const usedIds = new Set(definitions.map((definition) => normalizeText(definition?.id)).filter(Boolean));
      const usedKeys = new Set(definitions.map((definition) => normalizeText(definition?.key)).filter(Boolean));
      let suffix = 0;
      let nextKey = keyBase;
      let nextId = `${slugPrefix}-${nextKey}`;
      while (usedIds.has(nextId) || usedKeys.has(nextKey)) {
        suffix += 1;
        nextKey = `${keyBase}-${suffix}`;
        nextId = `${slugPrefix}-${nextKey}`;
      }
      addedDefinitionId = nextId;
      definitions.push({
        id: addedDefinitionId,
        key: nextKey,
        label: normalizedLabel,
        description: normalizeText(description),
        examples: normalizeTextList(examplesText),
        notes: normalizeTextList(notesText),
        ...(slug === "keywords" ? { visible: visible !== false } : {}),
      });
      document.definitions = definitions;
    },
  });
  return {
    ...result,
    addedDefinitionId,
  };
}

async function updateRule({
  request,
  slug,
  ruleId,
  name,
  directive,
  why,
  signalsText,
  examplesText,
  stopCondition,
}) {
  return await saveDocument({
    request,
    slug,
    mutate(document) {
      const ruleIndex = (document.rules || []).findIndex(
        (rule) => rule.id === ruleId
      );
      if (ruleIndex < 0) {
        throw new Error(`Unknown rule: ${ruleId}`);
      }

      const existing = document.rules[ruleIndex];
      document.rules[ruleIndex] = {
        ...existing,
        name: normalizeText(name) || existing.name,
        directive: normalizeText(directive),
        why: normalizeText(why),
        signals: normalizeTextList(signalsText),
        examples: normalizeTextList(examplesText),
        stopCondition: normalizeText(stopCondition),
      };
    },
  });
}

async function addRule({
  request,
  slug,
  ruleId,
  name,
  directive,
  why,
  signalsText,
  examplesText,
  stopCondition,
}) {
  const addedRuleId = normalizeText(ruleId) || randomUUID();
  const result = await saveDocument({
    request,
    slug,
    mutate(document) {
      const rules = Array.isArray(document.rules) ? document.rules : [];
      rules.push({
        id: addedRuleId,
        name: normalizeText(name) || "New Rule",
        directive: normalizeText(directive),
        why: normalizeText(why),
        signals: normalizeTextList(signalsText),
        examples: normalizeTextList(examplesText),
        stopCondition: normalizeText(stopCondition),
      });
      document.rules = rules;
    },
  });
  return {
    ...result,
    addedRuleId,
  };
}

module.exports = {
  addDefinition,
  addRule,
  buildSegmentationDocumentPath,
  loadSegmentationDocument,
  loadSegmentationDocuments,
  loadSegmentationPlaybookSyncStatus,
  scheduleSegmentationPlaybookSync,
  updateDefinition,
  updateRule,
};
