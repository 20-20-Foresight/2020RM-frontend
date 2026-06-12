import {
  ensureDocumentId,
  isPlainObject,
  readTrimmedString
} from "./segmentation-document-shared.mjs";

const TEMPLATE_CROSSWALK_DOCUMENT_TYPE = "segmentation.template-crosswalk";
const COMPILED_CROSSWALK_DOCUMENT_TYPE = "segmentation.compiled-crosswalk";
const AUTHORED_KEY_SUFFIXES = [".authored", "_authored", "-authored"];
const DEFAULT_COMPILED_NAMESPACE = "crm.data";
const DEFAULT_TARGET_SCORE = 3;

function inferCompiledTargetKey(authoredKey) {
  const normalizedKey = readTrimmedString(authoredKey);
  if (!normalizedKey) {
    return "";
  }

  for (const suffix of AUTHORED_KEY_SUFFIXES) {
    if (normalizedKey.endsWith(suffix)) {
      return normalizedKey.slice(0, suffix.length * -1);
    }
  }

  return `${normalizedKey}-compiled`;
}

function looksLikeTemplateCrosswalkDocument(document) {
  const normalizedDocument = isPlainObject(document) ? document : {};

  if (readTrimmedString(normalizedDocument.documentType) === TEMPLATE_CROSSWALK_DOCUMENT_TYPE) {
    return true;
  }

  return (
    isPlainObject(normalizedDocument.compiled) &&
    Array.isArray(normalizedDocument.sets) &&
    Array.isArray(normalizedDocument.keywords) &&
    Array.isArray(normalizedDocument.templates)
  );
}

function looksLikeCompiledCrosswalkDocument(document) {
  const normalizedDocument = isPlainObject(document) ? document : {};

  if (readTrimmedString(normalizedDocument.documentType) === COMPILED_CROSSWALK_DOCUMENT_TYPE) {
    return true;
  }

  return (
    Array.isArray(normalizedDocument.crosswalk) &&
    Boolean(readTrimmedString(normalizedDocument.authoredDocumentId))
  );
}

function readStringList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => readTrimmedString(entry)).filter(Boolean);
  }

  return readTrimmedString(value)
    .split(/[,\n]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function cloneExtraFields(value, excludedKeys) {
  const extraFields = {};
  if (!isPlainObject(value)) {
    return extraFields;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (excludedKeys.includes(key)) {
      continue;
    }
    extraFields[key] = entry;
  }

  return extraFields;
}

function readTargetRows(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values
    .map((entry) => {
      if (typeof entry === "string") {
        const name = readTrimmedString(entry);
        return name ? { name, score: DEFAULT_TARGET_SCORE } : null;
      }

      if (!isPlainObject(entry)) {
        return null;
      }

      const name =
        readTrimmedString(entry.name) ||
        readTrimmedString(entry.label) ||
        readTrimmedString(entry.value);
      if (!name) {
        return null;
      }

      const parsedScore = Number(entry.score);
      return {
        name,
        score: Number.isFinite(parsedScore) && parsedScore > 0 ? parsedScore : DEFAULT_TARGET_SCORE
      };
    })
    .filter(Boolean);
}

function readTargetText(value) {
  return readTargetRows(value)
    .map((entry) => `${entry.name}|${entry.score}`)
    .join("\n");
}

function buildTargetRows(text) {
  const normalizedText = readTrimmedString(text);
  if (!normalizedText) {
    return [];
  }

  return normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, scorePart] = line.split("|");
      const name = readTrimmedString(namePart);
      if (!name) {
        return null;
      }

      const parsedScore = Number(readTrimmedString(scorePart));
      return {
        name,
        score: Number.isFinite(parsedScore) && parsedScore > 0 ? parsedScore : DEFAULT_TARGET_SCORE
      };
    })
    .filter(Boolean);
}

function buildSetRow(value) {
  const normalizedValue = isPlainObject(value) ? value : {};
  return {
    id: ensureDocumentId(normalizedValue.id),
    label:
      readTrimmedString(normalizedValue.label) ||
      readTrimmedString(normalizedValue.name),
    description: readTrimmedString(normalizedValue.description),
    __extraFields: cloneExtraFields(normalizedValue, ["id", "label", "name", "description"])
  };
}

function buildKeywordRow(value) {
  const normalizedValue = isPlainObject(value) ? value : {};
  return {
    id: ensureDocumentId(normalizedValue.id),
    value:
      readTrimmedString(normalizedValue.value) ||
      readTrimmedString(normalizedValue.label) ||
      readTrimmedString(normalizedValue.keyword),
    setsText: readStringList(normalizedValue.sets).join(", "),
    __extraFields: cloneExtraFields(normalizedValue, ["id", "value", "label", "keyword", "sets"])
  };
}

function buildTemplateRow(value) {
  const normalizedValue = isPlainObject(value) ? value : {};
  const outputs = isPlainObject(normalizedValue.outputs) ? normalizedValue.outputs : {};
  return {
    id: ensureDocumentId(normalizedValue.id),
    label:
      readTrimmedString(normalizedValue.label) ||
      readTrimmedString(normalizedValue.name),
    pattern:
      readTrimmedString(normalizedValue.pattern) ||
      readTrimmedString(normalizedValue.template) ||
      readTrimmedString(normalizedValue.regex),
    description: readTrimmedString(normalizedValue.description),
    notes: readTrimmedString(normalizedValue.notes),
    sectorTargetsText: readTargetText(outputs.sector || normalizedValue.sectorTargets || normalizedValue.sector),
    industryTargetsText: readTargetText(outputs.industry || outputs.industries || normalizedValue.industries || normalizedValue.industry),
    focusTargetsText: readTargetText(outputs.focus || outputs.focuses || normalizedValue.focuses || normalizedValue.focus),
    __extraFields: cloneExtraFields(normalizedValue, [
      "id",
      "label",
      "name",
      "pattern",
      "template",
      "regex",
      "description",
      "notes",
      "outputs",
      "sectorTargets",
      "industryTargets",
      "focusTargets",
      "sector",
      "industry",
      "focus",
      "industries",
      "focuses"
    ])
  };
}

function buildTemplateCrosswalkViewModel(options = {}) {
  const document = isPlainObject(options.document) ? options.document : {};
  const compiled = isPlainObject(document.compiled) ? document.compiled : {};

  return {
    compiledTargetNamespace:
      readTrimmedString(compiled.namespace) || readTrimmedString(options.defaultCompiledNamespace) || DEFAULT_COMPILED_NAMESPACE,
    compiledTargetKey:
      readTrimmedString(compiled.key) ||
      inferCompiledTargetKey(options.authoredKey),
    sets: Array.isArray(document.sets) ? document.sets.filter((entry) => isPlainObject(entry)).map((entry) => buildSetRow(entry)) : [],
    keywords: Array.isArray(document.keywords)
      ? document.keywords.filter((entry) => isPlainObject(entry)).map((entry) => buildKeywordRow(entry))
      : [],
    templates: Array.isArray(document.templates)
      ? document.templates.filter((entry) => isPlainObject(entry)).map((entry) => buildTemplateRow(entry))
      : [],
    __extraFields: cloneExtraFields(document, ["documentType", "compiled", "sets", "keywords", "templates"])
  };
}

function buildTemplateCrosswalkDocument(options = {}) {
  const sourceDocument = isPlainObject(options.sourceDocument) ? options.sourceDocument : {};
  const extraFields = isPlainObject(options.extraFields)
    ? options.extraFields
    : cloneExtraFields(sourceDocument, ["documentType", "compiled", "sets", "keywords", "templates"]);
  const compiledSource = isPlainObject(sourceDocument.compiled) ? sourceDocument.compiled : {};

  const sets = Array.isArray(options.sets)
    ? options.sets
        .filter((row) => isPlainObject(row))
        .map((row) => {
          const label = readTrimmedString(row.label);
          if (!label) {
            return null;
          }
          return {
            ...(isPlainObject(row.__extraFields) ? row.__extraFields : {}),
            id: ensureDocumentId(row.id),
            label,
            ...(readTrimmedString(row.description) ? { description: readTrimmedString(row.description) } : {})
          };
        })
        .filter(Boolean)
    : [];

  const keywords = Array.isArray(options.keywords)
    ? options.keywords
        .filter((row) => isPlainObject(row))
        .map((row) => {
          const value = readTrimmedString(row.value);
          if (!value) {
            return null;
          }
          const setIds = readStringList(row.setsText);
          return {
            ...(isPlainObject(row.__extraFields) ? row.__extraFields : {}),
            id: ensureDocumentId(row.id),
            value,
            sets: setIds
          };
        })
        .filter(Boolean)
    : [];

  const templates = Array.isArray(options.templates)
    ? options.templates
        .filter((row) => isPlainObject(row))
        .map((row) => {
          const pattern = readTrimmedString(row.pattern);
          if (!pattern) {
            return null;
          }

          const nextTemplate = {
            ...(isPlainObject(row.__extraFields) ? row.__extraFields : {}),
            id: ensureDocumentId(row.id),
            pattern,
            outputs: {}
          };

          const label = readTrimmedString(row.label);
          const description = readTrimmedString(row.description);
          const notes = readTrimmedString(row.notes);
          const sectorTargets = buildTargetRows(row.sectorTargetsText);
          const industryTargets = buildTargetRows(row.industryTargetsText);
          const focusTargets = buildTargetRows(row.focusTargetsText);

          if (label) {
            nextTemplate.label = label;
          }
          if (description) {
            nextTemplate.description = description;
          }
          if (notes) {
            nextTemplate.notes = notes;
          }
          if (sectorTargets.length) {
            nextTemplate.outputs.sector = sectorTargets;
          }
          if (industryTargets.length) {
            nextTemplate.outputs.industry = industryTargets;
          }
          if (focusTargets.length) {
            nextTemplate.outputs.focus = focusTargets;
          }

          if (!Object.keys(nextTemplate.outputs).length) {
            delete nextTemplate.outputs;
          }

          return nextTemplate;
        })
        .filter(Boolean)
    : [];

  const compiledNamespace =
    readTrimmedString(options.compiledTargetNamespace) ||
    readTrimmedString(compiledSource.namespace) ||
    DEFAULT_COMPILED_NAMESPACE;
  const compiledKey =
    readTrimmedString(options.compiledTargetKey) ||
    readTrimmedString(compiledSource.key) ||
    inferCompiledTargetKey(options.authoredKey);

  const nextDocument = {
    ...extraFields,
    documentType: TEMPLATE_CROSSWALK_DOCUMENT_TYPE,
    sets,
    keywords,
    templates
  };

  nextDocument.compiled = {
    ...(isPlainObject(compiledSource) ? compiledSource : {}),
    namespace: compiledNamespace
  };

  if (compiledKey) {
    nextDocument.compiled.key = compiledKey;
  }

  return nextDocument;
}

function readCompiledPreviewRows(document) {
  if (Array.isArray(document?.crosswalk)) {
    return document.crosswalk.filter((entry) => isPlainObject(entry));
  }
  if (Array.isArray(document?.rows)) {
    return document.rows.filter((entry) => isPlainObject(entry));
  }
  if (Array.isArray(document)) {
    return document.filter((entry) => isPlainObject(entry));
  }
  return [];
}

export {
  COMPILED_CROSSWALK_DOCUMENT_TYPE,
  TEMPLATE_CROSSWALK_DOCUMENT_TYPE,
  buildTemplateCrosswalkDocument,
  buildTemplateCrosswalkViewModel,
  inferCompiledTargetKey,
  looksLikeCompiledCrosswalkDocument,
  looksLikeTemplateCrosswalkDocument,
  readCompiledPreviewRows
};
