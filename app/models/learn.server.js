const { AdminDataApiError, loadRawAdminDataDocument } = require("./admin-data.server");
const { buildCategoryViewModel } = require("./segmentation-category-document");
const { loadSessionMeta } = require("./session-meta.server");

const LEARN_TOPICS_DOCUMENT_ID = "crm.learn:topics";
const ALLOWED_TOPIC_PERMISSIONS = new Set(["all", "recruiter", "admin"]);

/**
 * Reads one trimmed string.
 * @param {unknown} value
 * @returns {string}
 */
function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes one Learn topic permission.
 * @param {unknown} value
 * @returns {"all"|"recruiter"|"admin"}
 */
function normalizeTopicPermission(value) {
  const normalizedValue = readTrimmedString(value).toLowerCase();
  return ALLOWED_TOPIC_PERMISSIONS.has(normalizedValue) ? normalizedValue : "admin";
}

/**
 * Normalizes one Learn topic definition.
 * @param {unknown} value
 * @returns {{
 *   id: string,
 *   title: string,
 *   summary: string,
 *   slug: string,
 *   categoryDocumentId: string,
 *   category: string,
 *   permission: "all"|"recruiter"|"admin"
 * }|null}
 */
function normalizeLearnTopic(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const id = readTrimmedString(value.id);
  const title = readTrimmedString(value.title);
  const slug = readTrimmedString(value.slug);
  const categoryDocumentId = readTrimmedString(value.categoryDocumentId);
  if (!id || !title || !slug || !categoryDocumentId) {
    return null;
  }

  return {
    id,
    title,
    summary: readTrimmedString(value.summary),
    slug,
    categoryDocumentId,
    category: readTrimmedString(value.category),
    permission: normalizeTopicPermission(value.permission || "all")
  };
}

/**
 * Reads the normalized Learn topics array from one raw document.
 * @param {unknown} document
 * @returns {Array<NonNullable<ReturnType<typeof normalizeLearnTopic>>>}
 */
function readLearnTopics(document) {
  const topics = Array.isArray(document?.topics) ? document.topics : [];
  return topics.map((topic) => normalizeLearnTopic(topic)).filter(Boolean);
}

/**
 * Returns whether one persona set includes the requested keyword.
 * @param {unknown} meta
 * @param {string} keyword
 * @returns {boolean}
 */
function hasPersonaKeyword(meta, keyword) {
  const normalizedKeyword = readTrimmedString(keyword).toLowerCase();
  if (!normalizedKeyword) {
    return false;
  }

  const values = [
    ...(Array.isArray(meta?.personas?.allowed) ? meta.personas.allowed : []),
    meta?.personas?.current,
    meta?.personas?.default
  ]
    .map((value) => readTrimmedString(value).toLowerCase())
    .filter(Boolean);

  return values.some((value) => value === normalizedKeyword || value.includes(normalizedKeyword));
}

/**
 * Returns whether one session meta payload has admin access to Learn topics.
 * @param {unknown} meta
 * @returns {boolean}
 */
function isLearnAdmin(meta) {
  const adminActions = Array.isArray(meta?.permissions?.admin_access?.system)
    ? meta.permissions.admin_access.system
    : [];

  return adminActions.includes("object_editing") || hasPersonaKeyword(meta, "admin");
}

/**
 * Returns whether one topic is visible to the current session.
 * @param {{permission?: string}|null|undefined} topic
 * @param {unknown} meta
 * @returns {boolean}
 */
function userCanViewTopic(topic, meta) {
  const permission = normalizeTopicPermission(topic?.permission || "all");
  if (permission === "all") {
    return true;
  }

  if (permission === "admin") {
    return isLearnAdmin(meta);
  }

  return isLearnAdmin(meta) || hasPersonaKeyword(meta, "recruiter");
}

/**
 * Logs one recoverable Learn topics config issue.
 * @param {{error?: Function}|null|undefined} logger
 * @param {string} message
 * @param {Record<string, unknown>} details
 */
function logLearnConfigIssue(logger, message, details) {
  if (logger && typeof logger.error === "function") {
    logger.error(message, details);
  }
}

/**
 * Loads the visible Learn topics for the current session.
 * @param {{
 *   request: Request,
 *   meta?: unknown,
 *   logger?: {error?: Function},
 *   loadSessionMeta?: typeof loadSessionMeta,
 *   loadRawAdminDataDocument?: typeof loadRawAdminDataDocument
 * }} options
 * @returns {Promise<Array<NonNullable<ReturnType<typeof normalizeLearnTopic>>>>}
 */
async function loadLearnTopics(options) {
  const loadSessionMetaImpl = options.loadSessionMeta || loadSessionMeta;
  const loadRawAdminDataDocumentImpl = options.loadRawAdminDataDocument || loadRawAdminDataDocument;
  const meta = options.meta || await loadSessionMetaImpl({ request: options.request });

  try {
    const document = await loadRawAdminDataDocumentImpl({
      request: options.request,
      id: LEARN_TOPICS_DOCUMENT_ID
    });

    return readLearnTopics(document?.document).filter((topic) => userCanViewTopic(topic, meta));
  } catch (error) {
    if (error instanceof AdminDataApiError && error.statusCode === 404) {
      logLearnConfigIssue(options.logger || console, "Learn topics document is not available yet.", {
        documentId: LEARN_TOPICS_DOCUMENT_ID,
        code: error.code,
        statusCode: error.statusCode
      });
      return [];
    }

    throw error;
  }
}

/**
 * Loads one Learn topic detail payload for the requested slug.
 * @param {{
 *   request: Request,
 *   slug: string,
 *   meta?: unknown,
 *   logger?: {error?: Function},
 *   loadSessionMeta?: typeof loadSessionMeta,
 *   loadRawAdminDataDocument?: typeof loadRawAdminDataDocument,
 *   buildCategoryViewModel?: typeof buildCategoryViewModel
 * }} options
 * @returns {Promise<{
 *   topic: NonNullable<ReturnType<typeof normalizeLearnTopic>>,
 *   categories: ReturnType<typeof buildCategoryViewModel>["rows"]
 * }|null>}
 */
async function loadLearnTopicDetail(options) {
  const loadSessionMetaImpl = options.loadSessionMeta || loadSessionMeta;
  const loadRawAdminDataDocumentImpl = options.loadRawAdminDataDocument || loadRawAdminDataDocument;
  const buildCategoryViewModelImpl = options.buildCategoryViewModel || buildCategoryViewModel;
  const meta = options.meta || await loadSessionMetaImpl({ request: options.request });
  const slug = readTrimmedString(options.slug);
  if (!slug) {
    return null;
  }

  const topics = await loadLearnTopics({
    request: options.request,
    meta,
    logger: options.logger,
    loadSessionMeta: loadSessionMetaImpl,
    loadRawAdminDataDocument: loadRawAdminDataDocumentImpl
  });
  const topic = topics.find((entry) => entry.slug === slug);
  if (!topic) {
    return null;
  }

  try {
    const categoryDocument = await loadRawAdminDataDocumentImpl({
      request: options.request,
      id: topic.categoryDocumentId
    });
    const viewModel = buildCategoryViewModelImpl({
      document: categoryDocument?.document
    });

    return {
      topic,
      categories: (Array.isArray(viewModel?.rows) ? viewModel.rows : []).filter(
        (row) => !readTrimmedString(row?.deletedOn)
      )
    };
  } catch (error) {
    if (error instanceof AdminDataApiError && error.statusCode === 404) {
      logLearnConfigIssue(options.logger || console, "Learn topic category document is missing.", {
        topicId: topic.id,
        categoryDocumentId: topic.categoryDocumentId,
        code: error.code,
        statusCode: error.statusCode
      });
      return null;
    }

    throw error;
  }
}

module.exports = {
  LEARN_TOPICS_DOCUMENT_ID,
  loadLearnTopicDetail,
  loadLearnTopics,
  userCanViewTopic
};
