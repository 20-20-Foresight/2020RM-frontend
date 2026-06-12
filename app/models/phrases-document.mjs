function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function stringifyPrettyJson(value) {
  if (!isPlainObject(value) || !Object.keys(value).length) {
    return "";
  }

  return JSON.stringify(value, null, 2);
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeKeywordText(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (isPlainObject(entry)) {
          const name = readTrimmedString(entry.name) || readTrimmedString(entry.label) || readTrimmedString(entry.value);
          if (!name) {
            return "";
          }
          const parsedScore = Number(entry.score);
          return Number.isFinite(parsedScore) && parsedScore > 0 ? `${name} (${parsedScore})` : name;
        }

        return readTrimmedString(entry);
      })
      .filter(Boolean)
      .join(", ");
  }

  return readTrimmedString(value);
}

function normalizeSetList(value) {
  const source = Array.isArray(value)
    ? value
    : isPlainObject(value)
      ? Object.keys(value)
      : parseFocuses(value);
  const seen = new Set();
  const normalized = [];

  source
    .map((entry) => readTrimmedString(entry))
    .filter(Boolean)
    .forEach((entry) => {
      const key = entry.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        normalized.push(entry);
      }
    });

  return normalized;
}

function normalizeFocusList(value) {
  const source = Array.isArray(value) ? value : parseFocuses(value);
  const seen = new Set();
  const normalized = [];

  source.forEach((entry) => {
    if (typeof entry === "string") {
      const name = readTrimmedString(entry);
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        normalized.push({ name, score: 3 });
      }
      return;
    }

    if (!isPlainObject(entry)) {
      return;
    }

    const name =
      readTrimmedString(entry.name) ||
      readTrimmedString(entry.label) ||
      readTrimmedString(entry.value);
    if (!name) {
      return;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    const parsedScore = Number(entry.score);
    normalized.push({
      name,
      score: Number.isFinite(parsedScore) && parsedScore > 0 ? parsedScore : 3
    });
  });

  return normalized;
}

function normalizeMatcherTokens(value) {
  return readArray(value)
    .map((token) => {
      if (!isPlainObject(token)) {
        return null;
      }

      const type = readTrimmedString(token.type) || "literal";
      if (!["literal", "alternation", "set"].includes(type)) {
        return null;
      }

      return {
        type,
        value: type === "literal" ? readTrimmedString(token.value) : "",
        options:
          type === "alternation"
            ? readArray(token.options)
                .map((entry) => readTrimmedString(entry))
                .filter(Boolean)
            : [],
        setName: type === "set" ? readTrimmedString(token.setName) : "",
        optional: token.optional === true,
        negated: token.negated === true,
        caseInsensitive: type === "set" ? true : token.caseInsensitive !== false
      };
    })
    .filter(Boolean);
}

function buildPatternTemplateFromMatcher(matcher) {
  const tokens = normalizeMatcherTokens(matcher?.tokens);
  const parts = tokens
    .map((token) => {
      if (token.type === "set") {
        return token.setName ? `{${token.setName}}` : "";
      }
      if (token.type === "alternation") {
        if (!token.options.length) {
          return "";
        }
        return token.options.length === 1
          ? token.options[0]
          : `(?:${token.options.join("|")})`;
      }
      return token.value || "";
    })
    .filter(Boolean);

  let pattern = parts.join("[\\s\\/\\-]+");
  if (matcher?.anchorStart === true) {
    pattern = `^${pattern}`;
  }
  if (matcher?.anchorEnd === true) {
    pattern = `${pattern}$`;
  }
  return pattern;
}

function splitPatternIntoSegments(pattern) {
  const source = String(pattern || "");
  const segments = [];
  let current = "";
  let braceDepth = 0;

  for (const character of source) {
    if (character === "{") {
      braceDepth += 1;
      current += character;
      continue;
    }

    if (character === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      current += character;
      continue;
    }

    if (/\s/.test(character) && braceDepth === 0) {
      const normalizedSegment = readTrimmedString(current);
      if (normalizedSegment) {
        segments.push(normalizedSegment);
      }
      current = "";
      continue;
    }

    current += character;
  }

  const normalizedSegment = readTrimmedString(current);
  if (normalizedSegment) {
    segments.push(normalizedSegment);
  }

  return segments;
}

function buildMatcherFromTemplate(pattern) {
  const normalizedPattern = readTrimmedString(pattern);
  if (!normalizedPattern) {
    return null;
  }

  let source = normalizedPattern;
  let anchorStart = false;
  let anchorEnd = false;

  if (source.startsWith("^")) {
    anchorStart = true;
    source = source.slice(1);
  }
  if (source.endsWith("$")) {
    anchorEnd = true;
    source = source.slice(0, -1);
  }

  const tokens = splitPatternIntoSegments(source)
    .map((segment) => readTrimmedString(segment))
    .filter(Boolean)
    .map((segment) => {
      const setMatch = /^\{([^}]+)\}$/.exec(segment);
      if (setMatch) {
        return {
          type: "set",
          setName: readTrimmedString(setMatch[1]) || "",
          optional: false,
          negated: false
        };
      }

      return {
        type: "literal",
        value: segment,
        optional: false,
        negated: false,
        caseInsensitive: true
      };
    });

  if (!tokens.length) {
    return null;
  }

  return {
    version: 1,
    kind: "phrase-matcher",
    anchorStart,
    anchorEnd,
    tokens
  };
}

function parseFocuses(text) {
  const normalizedText = readTrimmedString(text);
  if (!normalizedText) {
    return [];
  }

  return Array.from(
    new Set(
      normalizedText
        .split(/[,\n|]+/g)
        .map((entry) => readTrimmedString(entry))
        .filter(Boolean)
    )
  );
}

function listRegexTokens(regex) {
  const tokens = [];
  const matcher = /\{([^}]+)\}/g;
  let match = null;

  while ((match = matcher.exec(String(regex || "")))) {
    const tokenName = readTrimmedString(match[1]);
    if (tokenName && !tokens.includes(tokenName)) {
      tokens.push(tokenName);
    }
  }

  return tokens;
}

function parseSetsText(text) {
  const normalizedText = readTrimmedString(text);
  if (!normalizedText) {
    return [];
  }

  if (normalizedText.startsWith("{")) {
    try {
      const parsed = JSON.parse(normalizedText);
      return normalizeSetList(parsed);
    } catch (_error) {
      return parseFocuses(normalizedText);
    }
  }

  return parseFocuses(normalizedText);
}

function readPhraseRows(document) {
  if (Array.isArray(document?.rows)) {
    return document.rows.filter((row) => isPlainObject(row));
  }

  if (Array.isArray(document?.crosswalk)) {
    return document.crosswalk.filter((row) => isPlainObject(row));
  }

  return [];
}

function buildPhrasesViewModel(options = {}) {
  return {
    rows: readPhraseRows(options.document).map((row) => ({
      matcher: isPlainObject(row.matcher)
        ? {
            version: Number.isFinite(row.matcher.version) ? Number(row.matcher.version) : 1,
            kind: readTrimmedString(row.matcher.kind) || "phrase-matcher",
            anchorStart: row.matcher.anchorStart === true,
            anchorEnd: row.matcher.anchorEnd === true,
            tokens: normalizeMatcherTokens(row.matcher.tokens)
          }
        : buildMatcherFromTemplate(row.regex),
      patternTemplate:
        readTrimmedString(row.regex) ||
        readTrimmedString(buildPatternTemplateFromMatcher(row.matcher)) ||
        "",
      regex: readTrimmedString(row.regex),
      sets: normalizeSetList(row.sets),
      setsText: normalizeKeywordText(normalizeSetList(row.sets)),
      focuses: normalizeFocusList(row.focuses || row.keywords),
      focusesText: normalizeKeywordText(row.focuses || row.keywords),
      notes: readTrimmedString(row.notes),
    })),
  };
}

function buildPhrasesDocument(options = {}) {
  const sourceDocument = isPlainObject(options.sourceDocument) ? options.sourceDocument : {};
  const {
    rows: _ignoredRows,
    crosswalk: _ignoredCrosswalk,
    compiled: _ignoredCompiled,
    authoredDocumentId: _ignoredAuthoredDocumentId,
    authoredDocumentName: _ignoredAuthoredDocumentName,
    authoredDocumentVersion: _ignoredAuthoredDocumentVersion,
    ...extraFields
  } = sourceDocument;
  const nextRows = Array.isArray(options.rows) ? options.rows : [];

  return {
    ...extraFields,
    documentType: "segmentation.phrases",
    rows: nextRows
      .map((row, index) => {
        const matcher = isPlainObject(row?.matcher)
          ? {
              version: Number.isFinite(row.matcher.version) ? Number(row.matcher.version) : 1,
              kind: readTrimmedString(row.matcher.kind) || "phrase-matcher",
              anchorStart: row.matcher.anchorStart === true,
              anchorEnd: row.matcher.anchorEnd === true,
              tokens: normalizeMatcherTokens(row.matcher.tokens)
            }
          : null;
        const regex =
          readTrimmedString(row?.patternTemplate) ||
          readTrimmedString(row?.regex) ||
          readTrimmedString(buildPatternTemplateFromMatcher(matcher));
        const setsText = readTrimmedString(row?.setsText);
        const sets = normalizeSetList(row?.sets);
        const focusesText = readTrimmedString(row?.focusesText);
        const focuses = normalizeFocusList(row?.focuses);
        const notes = readTrimmedString(row?.notes);

        if (!regex && !setsText && !sets.length && !focusesText && !focuses.length && !notes) {
          return null;
        }

        if (!regex) {
          throw new Error(`Row ${index + 1} is missing a regex value.`);
        }

        const nextRow = {
          regex,
          sets: sets.length ? sets : parseSetsText(setsText),
          focuses: focuses.length ? focuses : normalizeFocusList(focusesText),
        };

        if (matcher && matcher.tokens.length) {
          nextRow.matcher = matcher;
        }

        if (notes) {
          nextRow.notes = notes;
        }

        return nextRow;
      })
      .filter(Boolean),
  };
}

export {
  buildPhrasesDocument,
  buildPhrasesViewModel,
};
