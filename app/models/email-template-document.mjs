export const EMAIL_TEMPLATE_NAMESPACE_PREFIX = "crm.email";
export const EMAIL_TEMPLATE_TOOL_PATH = "/tools/email-templates";
export const EMAIL_TEMPLATE_KIND = "template";
export const EMAIL_SNIPPET_KIND = "snippet";
export const EMAIL_SNIPPET_TYPES = ["header", "footer"];

/**
 * Returns whether one value is a plain object.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads a trimmed string.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function readString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

/**
 * Deep-clones one JSON-like value.
 * @template T
 * @param {T} value
 * @returns {T}
 */
function cloneJson(value) {
  if (value == null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

/**
 * Normalizes one key into a slug-like identifier.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeEmailContentKey(value) {
  return readString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds one admin-data record id.
 * @param {unknown} key
 * @returns {string}
 */
export function buildEmailContentRecordId(kind, key) {
  const normalizedKey = normalizeEmailContentKey(key);
  const normalizedKind = kind === EMAIL_SNIPPET_KIND ? EMAIL_SNIPPET_KIND : EMAIL_TEMPLATE_KIND;
  return `${EMAIL_TEMPLATE_NAMESPACE_PREFIX}.${normalizedKind}:${normalizedKey}`;
}

/**
 * Returns one normalized content version payload.
 * @param {unknown} value
 * @param {string} fallbackName
 * @returns {{name: string, subject: string, bodyHtml: string, design: Record<string, unknown>|null, html: string}}
 */
function normalizeVersion(value, fallbackName = "") {
  const version = isPlainObject(value) ? value : {};
  const design = isPlainObject(version.design) ? cloneJson(version.design) : null;

  return {
    name: readString(version.name, fallbackName),
    subject: readString(version.subject),
    bodyHtml: readString(version.bodyHtml),
    design,
    html: readString(version.html)
  };
}

/**
 * Returns one normalized slot object.
 * @param {unknown} value
 * @returns {{snippetKey: string, mode: string}}
 */
function normalizeSlot(value) {
  const slot = isPlainObject(value) ? value : {};
  return {
    snippetKey: readString(slot.snippetKey),
    mode: readString(slot.mode, "selected")
  };
}

/**
 * Creates an empty email template document.
 * @param {{key?: string, name?: string}} [options]
 * @returns {Record<string, unknown>}
 */
export function buildEmptyEmailTemplateDocument(options = {}) {
  const key = readString(options.key);
  const name = readString(options.name, key);

  return {
    kind: EMAIL_TEMPLATE_KIND,
    templateKey: key,
    tokenScope: "help-docs",
    slots: {
      header: {
        snippetKey: "",
        mode: "selected"
      },
      footer: {
        snippetKey: "",
        mode: "selected"
      }
    },
    draft: {
      name,
      subject: "",
      bodyHtml: "",
      design: null,
      html: ""
    },
    active: {
      name: "",
      subject: "",
      bodyHtml: "",
      design: null,
      html: ""
    }
  };
}

/**
 * Creates an empty email snippet document.
 * @param {{key?: string, name?: string, snippetKind?: string}} [options]
 * @returns {Record<string, unknown>}
 */
export function buildEmptyEmailSnippetDocument(options = {}) {
  const key = readString(options.key);
  const name = readString(options.name, key);
  const snippetKind = EMAIL_SNIPPET_TYPES.includes(readString(options.snippetKind))
    ? readString(options.snippetKind)
    : "footer";

  return {
    kind: EMAIL_SNIPPET_KIND,
    scope: "global",
    snippetKey: key,
    snippetKind,
    draft: {
      name,
      subject: "",
      bodyHtml: "",
      design: null,
      html: ""
    },
    active: {
      name: "",
      subject: "",
      bodyHtml: "",
      design: null,
      html: ""
    }
  };
}

/**
 * Returns one normalized email content document.
 * @param {{id?: unknown, key?: unknown, name?: unknown, document?: unknown}} value
 * @returns {{
 *   id: string,
 *   key: string,
 *   name: string,
 *   kind: string,
 *   scope: string,
 *   snippetKind: string,
 *   templateKey: string,
 *   snippetKey: string,
 *   draft: ReturnType<typeof normalizeVersion>,
 *   active: ReturnType<typeof normalizeVersion>,
 *   slots: {header: ReturnType<typeof normalizeSlot>, footer: ReturnType<typeof normalizeSlot>}
 * }}
 */
export function normalizeEmailContentDocument(value = {}) {
  const rawDocument = isPlainObject(value.rawDocument) ? value.rawDocument : null;
  const kindFromValue = readString(value.kind, EMAIL_TEMPLATE_KIND);
  const key = normalizeEmailContentKey(
    value.key ||
      value.id ||
      rawDocument?.templateKey ||
      rawDocument?.snippetKey
  );
  const name = readString(value.name, key || "Untitled");
  const fallbackKind =
    kindFromValue === EMAIL_SNIPPET_KIND ? EMAIL_SNIPPET_KIND : EMAIL_TEMPLATE_KIND;
  const document = isPlainObject(value.document)
    ? value.document
    : rawDocument ||
      (fallbackKind === EMAIL_SNIPPET_KIND
        ? buildEmptyEmailSnippetDocument({
            key,
            name,
            snippetKind: value.snippetKind
          })
        : buildEmptyEmailTemplateDocument({
            key,
            name
          }));
  const kind = readString(document.kind || kindFromValue, EMAIL_TEMPLATE_KIND) === EMAIL_SNIPPET_KIND
    ? EMAIL_SNIPPET_KIND
    : EMAIL_TEMPLATE_KIND;
  const templateKey = kind === EMAIL_TEMPLATE_KIND
    ? normalizeEmailContentKey(document.templateKey || key)
    : "";
  const snippetKey = kind === EMAIL_SNIPPET_KIND
    ? normalizeEmailContentKey(document.snippetKey || key)
    : "";
  const snippetKind = EMAIL_SNIPPET_TYPES.includes(readString(document.snippetKind))
    ? readString(document.snippetKind)
    : "footer";
  const scope = readString(document.scope, "global");
  const normalizedName = kind === EMAIL_SNIPPET_KIND ? snippetKey || name : templateKey || name;

  return {
    id: readString(value.id, buildEmailContentRecordId(kind, key || templateKey || snippetKey)),
    key: key || templateKey || snippetKey,
    name,
    kind,
    scope,
    snippetKind,
    templateKey,
    snippetKey,
    slots: {
      header: normalizeSlot(document.slots?.header),
      footer: normalizeSlot(document.slots?.footer)
    },
    draft: normalizeVersion(document.draft, normalizedName),
    active: normalizeVersion(document.active, normalizedName)
  };
}

/**
 * Promotes one draft payload to active.
 * @param {Record<string, unknown>} document
 * @returns {Record<string, unknown>}
 */
export function publishDraftEmailContentDocument(document) {
  const normalized = normalizeEmailContentDocument({
    document
  });

  return {
    ...(isPlainObject(document) ? cloneJson(document) : {}),
    kind: normalized.kind,
    templateKey: normalized.templateKey,
    snippetKey: normalized.snippetKey,
    snippetKind: normalized.snippetKind,
    scope: normalized.scope,
    slots: cloneJson(normalized.slots),
    draft: cloneJson(normalized.draft),
    active: cloneJson(normalized.draft)
  };
}

/**
 * Returns whether one normalized content record is a snippet.
 * @param {{kind?: unknown}} value
 * @returns {boolean}
 */
export function isEmailSnippetDocument(value) {
  return readString(value?.kind) === EMAIL_SNIPPET_KIND;
}

/**
 * Returns whether one normalized content record is a template.
 * @param {{kind?: unknown}} value
 * @returns {boolean}
 */
export function isEmailTemplateDocument(value) {
  return !isEmailSnippetDocument(value);
}

/**
 * Builds preview html for one template/snippet composition.
 * @param {{
 *   template: ReturnType<typeof normalizeEmailContentDocument>|Record<string, unknown>,
 *   snippetsByKey?: Record<string, ReturnType<typeof normalizeEmailContentDocument>|Record<string, unknown>>,
 *   versionKey?: "draft"|"active"
 * }} options
 * @returns {{subject: string, html: string}}
 */
export function buildEmailTemplatePreview(options) {
  const template = normalizeEmailContentDocument({
    document: options?.template
  });
  const versionKey = options?.versionKey === "active" ? "active" : "draft";
  const templateVersion = readString(template[versionKey]?.bodyHtml || template[versionKey]?.html || template[versionKey]?.subject)
    ? template[versionKey]
    : template.draft;
  const snippetsByKey = isPlainObject(options?.snippetsByKey) ? options.snippetsByKey : {};
  const headerSnippet = normalizeEmailContentDocument({
    document: snippetsByKey[template.slots.header.snippetKey]
  });
  const footerSnippet = normalizeEmailContentDocument({
    document: snippetsByKey[template.slots.footer.snippetKey]
  });
  const resolvedHeaderVersion = readString(
    headerSnippet?.[versionKey]?.html || headerSnippet?.[versionKey]?.bodyHtml
  )
    ? headerSnippet[versionKey]
    : headerSnippet.draft;
  const resolvedFooterVersion = readString(
    footerSnippet?.[versionKey]?.html || footerSnippet?.[versionKey]?.bodyHtml
  )
    ? footerSnippet[versionKey]
    : footerSnippet.draft;
  const headerHtml = readString(resolvedHeaderVersion?.html || resolvedHeaderVersion?.bodyHtml);
  const footerHtml = readString(resolvedFooterVersion?.html || resolvedFooterVersion?.bodyHtml);
  const bodyHtml = readString(templateVersion.bodyHtml || templateVersion.html);
  const html = [headerHtml, bodyHtml, footerHtml].filter(Boolean).join("\n");

  return {
    subject: templateVersion.subject,
    html
  };
}
