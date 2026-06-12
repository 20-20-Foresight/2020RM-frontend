import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  Tooltip,
  useDisclosure,
  VStack,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { MdDescription } from "react-icons/md";
import { InlineSaveStatus } from "./InlineSaveStatus";
import { useQueuedDocumentSave } from "../hooks/useQueuedDocumentSave";
import { PhraseMatcher, PhraseMatcherPreview } from "./ui/molecules/PhraseMatcher";
import { FilterableDataTable } from "./ui/organisms/FilterableDataTable";

const ANY_BLOCK_PATTERN = "[^\\s\\/\\-]+";
const SEPARATOR_PATTERN = "[\\s\\/\\-]+";

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildClientKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTagList(value) {
  const seen = new Set();
  const normalized = [];

  (Array.isArray(value) ? value : [])
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

function normalizeFocusTargets(value) {
  const seen = new Set();
  const normalized = [];

  (Array.isArray(value) ? value : []).forEach((entry) => {
    if (typeof entry === "string") {
      const name = readTrimmedString(entry);
      const key = name.toLowerCase();
      if (name && !seen.has(key)) {
        seen.add(key);
        normalized.push({ name, score: "3" });
      }
      return;
    }

    if (!entry || typeof entry !== "object") {
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
    const rawScore = entry.score == null ? "" : String(entry.score).trim();
    normalized.push({
      name,
      score: rawScore || "3"
    });
  });

  return normalized;
}

function buildFocusSummary(value) {
  return normalizeFocusTargets(value)
    .map((entry) => {
      const score = readTrimmedString(entry.score);
      return score ? `${entry.name} (${score})` : entry.name;
    })
    .join(", ");
}

function buildEmptyFocusTarget() {
  return {
    name: "",
    score: "3"
  };
}

function parseTagText(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[,\n|]+/g)
        .map((entry) => readTrimmedString(entry))
        .filter(Boolean)
    )
  );
}

function listMatcherSetNames(matcher) {
  if (!matcher || !Array.isArray(matcher.tokens)) {
    return [];
  }

  return Array.from(
    new Set(
      matcher.tokens
        .filter((token) => token?.type === "set")
        .map((token) => readTrimmedString(token.setName))
        .filter(Boolean)
    )
  );
}

function buildMatcherSummary(matcher, fallback = "") {
  if (!matcher || !Array.isArray(matcher.tokens) || !matcher.tokens.length) {
    return readTrimmedString(fallback);
  }

  return matcher.tokens
    .map((token) => {
      if (!token || typeof token !== "object") {
        return "";
      }

      let label = "";
      if (token.type === "set") {
        label = token.setName ? `{${token.setName}}` : "{set}";
      } else if (token.type === "alternation") {
        const options = Array.isArray(token.options)
          ? token.options.map((option) => readTrimmedString(option)).filter(Boolean)
          : [];
        label = options.length ? `[${options.join(" OR ")}]` : "[OR]";
      } else {
        label = readTrimmedString(token.value) || "word";
      }

      if (token.negated) {
        label = `NOT ${label}`;
      }
      if (token.optional) {
        label = `(${label})`;
      }

      return label;
    })
    .filter(Boolean)
    .join(" · ");
}

function readArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyWildcard(value) {
  return String(value || "")
    .split("*")
    .map(escapeRegex)
    .join("[A-Za-z]*");
}

function expandCaseInsensitive(value) {
  let result = "";
  let index = 0;

  while (index < value.length) {
    const character = value[index];
    if (character === "\\") {
      result += value[index] + (value[index + 1] || "");
      index += 2;
      continue;
    }

    if (character === "[") {
      const endIndex = value.indexOf("]", index);
      if (endIndex === -1) {
        result += value.slice(index);
        break;
      }
      result += value.slice(index, endIndex + 1);
      index = endIndex + 1;
      continue;
    }

    if (/[a-zA-Z]/.test(character)) {
      result += `[${character.toLowerCase()}${character.toUpperCase()}]`;
      index += 1;
      continue;
    }

    result += character;
    index += 1;
  }

  return result;
}

function parseUserInput(value) {
  const segments = [];
  let index = 0;
  let current = "";

  while (index < value.length) {
    if (value[index] === "(") {
      if (current) {
        segments.push({ optional: false, value: current });
      }
      current = "";
      index += 1;
      let inner = "";
      while (index < value.length && value[index] !== ")") {
        inner += value[index];
        index += 1;
      }
      if (index < value.length) {
        index += 1;
      }
      segments.push({ optional: true, value: inner });
      continue;
    }

    current += value[index];
    index += 1;
  }

  if (current) {
    segments.push({ optional: false, value: current });
  }

  return segments;
}

function processValue(value, needsCaseExpansion) {
  return parseUserInput(String(value || ""))
    .map(({ optional, value: segmentValue }) => {
      const escaped = applyWildcard(segmentValue);
      const pattern = needsCaseExpansion ? expandCaseInsensitive(escaped) : escaped;
      return optional ? `(?:${pattern})?` : pattern;
    })
    .join("");
}

function listPatternSetNames(pattern) {
  const tokens = [];
  const matcher = /\{([^}]+)\}/g;
  let match = null;

  while ((match = matcher.exec(String(pattern || "")))) {
    const tokenName = readTrimmedString(match[1]);
    if (tokenName && !tokens.includes(tokenName)) {
      tokens.push(tokenName);
    }
  }

  return tokens;
}

function readMatcherTokens(value) {
  return readArray(value)
    .map((token) => {
      if (!token || typeof token !== "object") {
        return null;
      }

      const type = readTrimmedString(token.type) || "literal";
      if (!["literal", "alternation", "set"].includes(type)) {
        return null;
      }

      return {
        type,
        value: type === "literal" ? readTrimmedString(token.value) || "" : "",
        options: type === "alternation" ? readArray(token.options).map((entry) => readTrimmedString(entry)).filter(Boolean) : [],
        setName: type === "set" ? readTrimmedString(token.setName) || "" : "",
        optional: token.optional === true,
        negated: token.negated === true,
        caseInsensitive: type === "set" ? true : token.caseInsensitive !== false,
      };
    })
    .filter(Boolean);
}

function buildNegativePattern(basePattern) {
  return `(?!(?:${basePattern})(?=${SEPARATOR_PATTERN}|$))${ANY_BLOCK_PATTERN}`;
}

function buildCompiledTokenPattern(token) {
  if (token.type === "pattern") {
    if (!token.value) {
      return "";
    }
    const pattern = token.negated ? buildNegativePattern(token.value) : token.value;
    return pattern;
  }

  if (token.type === "set") {
    throw new Error("Positive set tokens must be expanded before regex compilation.");
  }

  const needsCaseExpansion = token.caseInsensitive !== false;
  let basePattern = "";

  if (token.type === "alternation") {
    const options = readArray(token.options)
      .filter(Boolean)
      .map((option) => processValue(option, needsCaseExpansion));
    if (!options.length) {
      return "";
    }
    basePattern = options.length === 1 ? options[0] : `(?:${options.join("|")})`;
  } else {
    basePattern = processValue(token.value, needsCaseExpansion);
  }

  if (!basePattern) {
    return "";
  }

  const pattern = token.negated ? buildNegativePattern(basePattern) : basePattern;
  return pattern;
}

function expandMatcherTokens(tokens, sets) {
  const expanded = [];

  function visit(index, currentTokens) {
    if (index >= tokens.length) {
      expanded.push(currentTokens);
      return;
    }

    const sourceToken = tokens[index];
    if (sourceToken.optional === true) {
      visit(index + 1, currentTokens);
    }

    const token = {
      ...sourceToken,
      optional: false,
    };

    if (token.type === "alternation" && token.negated !== true && token.options.length) {
      token.options.forEach((option) => {
        visit(index + 1, [
          ...currentTokens,
          {
            type: "literal",
            value: option,
            optional: false,
            negated: false,
            caseInsensitive: token.caseInsensitive !== false,
          },
        ]);
      });
      return;
    }

    if (token.type === "set") {
      const setEntries = sets[token.setName];
      if (!setEntries?.length) {
        throw new Error(`Phrase references set "${token.setName}" but that set is missing or empty.`);
      }

      if (token.negated === true) {
        visit(index + 1, [
          ...currentTokens,
          {
            type: "alternation",
            options: setEntries.slice(),
            optional: false,
            negated: true,
            caseInsensitive: true,
          },
        ]);
        return;
      }

      setEntries.forEach((option) => {
        visit(index + 1, [
          ...currentTokens,
          {
            type: "pattern",
            value: option,
            optional: false,
            negated: false,
            caseInsensitive: true,
          },
        ]);
      });
      return;
    }

    visit(index + 1, [...currentTokens, token]);
  }

  visit(0, []);
  return expanded;
}

function buildRegexFromMatcher(matcher, sets) {
  const tokens = readMatcherTokens(matcher?.tokens);
  if (!tokens.length) {
    return [];
  }

  return expandMatcherTokens(tokens, sets).map((expandedTokens) => {
    const parts = expandedTokens.map((token) => buildCompiledTokenPattern(token)).filter(Boolean);
    let regex = parts.join(SEPARATOR_PATTERN);
    if (matcher?.anchorStart === true) {
      regex = `^${regex}`;
    }
    if (matcher?.anchorEnd === true) {
      regex = `${regex}$`;
    }
    return regex;
  });
}

function buildLegacyExpandedRegexes(sourceRegex, sets) {
  const tokens = listPatternSetNames(sourceRegex);
  if (!tokens.length) {
    return [sourceRegex];
  }

  const missingToken = tokens.find((token) => !sets[token]?.length);
  if (missingToken) {
    throw new Error(`Phrase references set "${missingToken}" but that set is missing or empty.`);
  }

  const expanded = [];

  function visit(index, currentRegex) {
    if (index >= tokens.length) {
      expanded.push(currentRegex);
      return;
    }

    const token = tokens[index];
    sets[token].forEach((replacement) => {
      visit(index + 1, String(currentRegex).replaceAll(`{${token}}`, replacement));
    });
  }

  visit(0, sourceRegex);
  return expanded;
}

function rowHasSetReferences(row, sourceRegex, matcher) {
  if (matcher && readMatcherTokens(matcher?.tokens).some((token) => token.type === "set")) {
    return true;
  }

  return listPatternSetNames(sourceRegex).length > 0;
}

function buildGlobalSetCatalog(rows) {
  const catalog = new Map();

  rows.forEach((row) => {
    const matcher = row?.matcher && typeof row.matcher === "object" ? row.matcher : null;
    const sourceRegex = readTrimmedString(row?.patternTemplate) || readTrimmedString(row?.regex);
    const memberships = normalizeTagList(row?.sets);

    if (!sourceRegex || !memberships.length || rowHasSetReferences(row, sourceRegex, matcher)) {
      return;
    }

    const compiledRegexes = matcher
      ? buildRegexFromMatcher(matcher, {})
      : buildLegacyExpandedRegexes(sourceRegex, {});

    memberships.forEach((setName) => {
      const key = setName.toLowerCase();
      const current = catalog.get(key) || {
        name: setName,
        values: [],
      };

      compiledRegexes.forEach((regex) => {
        const normalizedRegex = readTrimmedString(regex);
        if (normalizedRegex && !current.values.includes(normalizedRegex)) {
          current.values.push(normalizedRegex);
        }
      });

      catalog.set(key, current);
    });
  });

  return Object.fromEntries(Array.from(catalog.values()).map((entry) => [entry.name, entry.values]));
}

function mergeHighlightRanges(ranges) {
  const normalizedRanges = (Array.isArray(ranges) ? ranges : [])
    .filter((range) => Array.isArray(range) && range.length === 2 && range[1] > range[0])
    .sort((left, right) => left[0] - right[0]);

  if (!normalizedRanges.length) {
    return [];
  }

  const merged = [normalizedRanges[0].slice()];
  for (let index = 1; index < normalizedRanges.length; index += 1) {
    const [start, end] = normalizedRanges[index];
    const current = merged[merged.length - 1];
    if (start <= current[1]) {
      current[1] = Math.max(current[1], end);
      continue;
    }
    merged.push([start, end]);
  }

  return merged;
}

function buildHighlightedParagraphParts(text, ranges) {
  const sourceText = typeof text === "string" ? text : "";
  const normalizedRanges = mergeHighlightRanges(ranges);
  if (!normalizedRanges.length) {
    return [{ text: sourceText, isMatch: false }];
  }

  const parts = [];
  let cursor = 0;

  normalizedRanges.forEach(([start, end]) => {
    if (start > cursor) {
      parts.push({
        text: sourceText.slice(cursor, start),
        isMatch: false,
      });
    }

    parts.push({
      text: sourceText.slice(start, end),
      isMatch: true,
    });
    cursor = end;
  });

  if (cursor < sourceText.length) {
    parts.push({
      text: sourceText.slice(cursor),
      isMatch: false,
    });
  }

  return parts;
}

function runPhraseParagraphTest(rows, paragraph) {
  const sourceParagraph = typeof paragraph === "string" ? paragraph : "";
  if (!readTrimmedString(sourceParagraph)) {
    return {
      isActive: false,
      matchedRowKeys: [],
      highlightRanges: [],
      totalMatches: 0,
    };
  }

  const globalSets = buildGlobalSetCatalog(rows);
  const matchedRowKeys = new Set();
  const highlightRanges = [];
  let totalMatches = 0;

  rows.forEach((row) => {
    const matcher = row?.matcher && typeof row.matcher === "object" ? row.matcher : null;
    const sourceRegex = readTrimmedString(row?.patternTemplate) || readTrimmedString(row?.regex);
    if (!sourceRegex) {
      return;
    }

    let compiledRegexes = [];
    try {
      compiledRegexes = matcher
        ? buildRegexFromMatcher(matcher, globalSets)
        : buildLegacyExpandedRegexes(sourceRegex, globalSets);
    } catch (_error) {
      compiledRegexes = [];
    }

    compiledRegexes.forEach((compiledRegex) => {
      try {
        const expression = new RegExp(`\\b(${compiledRegex})\\b`, "ig");
        let match = null;

        while ((match = expression.exec(sourceParagraph))) {
          if (!match[1]) {
            if (expression.lastIndex === match.index) {
              expression.lastIndex += 1;
            }
            continue;
          }

          matchedRowKeys.add(row.__clientKey);
          highlightRanges.push([match.index, match.index + match[1].length]);
          totalMatches += 1;

          if (expression.lastIndex === match.index) {
            expression.lastIndex += 1;
          }
        }
      } catch (_error) {
        // Ignore one malformed compiled regex in the test view and keep going.
      }
    });
  });

  return {
    isActive: true,
    matchedRowKeys: Array.from(matchedRowKeys),
    highlightRanges: mergeHighlightRanges(highlightRanges),
    totalMatches,
  };
}

function buildEmptyRow() {
  return {
    matcher: null,
    patternTemplate: "",
    sets: [],
    setsText: "",
    focuses: [],
    notes: "",
    __clientKey: buildClientKey("phrase")
  };
}

function cloneRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => ({
        matcher: row?.matcher && typeof row.matcher === "object" ? row.matcher : null,
        patternTemplate:
          typeof row?.patternTemplate === "string"
            ? row.patternTemplate
            : readTrimmedString(row?.regex),
        sets: normalizeTagList(
          Array.isArray(row?.sets)
            ? row.sets
            : parseTagText(row?.setsText)
        ),
        setsText: typeof row?.setsText === "string" ? row.setsText : "",
        focuses: normalizeFocusTargets(row?.focuses),
        notes: typeof row?.notes === "string" ? row.notes : "",
        __clientKey: buildClientKey("phrase")
      }))
    : [];
}

function stripTransientRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const nextRow = { ...row };
    delete nextRow.__clientKey;
    return nextRow;
  });
}

const TagAutocompleteInput = forwardRef(function TagAutocompleteInput({
  value = [],
  options = [],
  placeholder = "",
  emptyText = "",
  colorScheme = "blue",
  onChange
}, ref) {
  const [inputValue, setInputValue] = useState("");
  const listId = useMemo(() => buildClientKey("tag-options"), []);
  const normalizedOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (Array.isArray(options) ? options : [])
            .map((option) => readTrimmedString(option))
            .filter(Boolean)
        )
      ),
    [options]
  );

  function commit(rawValue) {
    const nextValues = normalizeTagList([
      ...(Array.isArray(value) ? value : []),
      ...parseTagText(rawValue)
    ]);

    if (nextValues.length !== (Array.isArray(value) ? value.length : 0)) {
      onChange?.(nextValues);
    }

    setInputValue("");
  }

  function removeEntry(entryValue) {
    onChange?.((Array.isArray(value) ? value : []).filter((entry) => entry !== entryValue));
  }

  useImperativeHandle(
    ref,
    () => ({
      commitPendingValue() {
        const normalized = readTrimmedString(inputValue);
        if (!normalized) {
          return normalizeTagList(value);
        }

        const nextValues = normalizeTagList([
          ...(Array.isArray(value) ? value : []),
          ...parseTagText(normalized)
        ]);
        onChange?.(nextValues);
        setInputValue("");
        return nextValues;
      }
    }),
    [inputValue, onChange, value]
  );

  return (
    <VStack align="stretch" spacing={3}>
      <Input
        value={inputValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (/[,\n|]/.test(nextValue)) {
            commit(nextValue);
            return;
          }

          setInputValue(nextValue);

          const normalized = readTrimmedString(nextValue);
          if (
            normalized &&
            normalizedOptions.some((option) => option.toLowerCase() === normalized.toLowerCase())
          ) {
            commit(normalized);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
            const normalized = readTrimmedString(inputValue);
            if (normalized) {
              event.preventDefault();
              commit(normalized);
            }
          }
        }}
        onBlur={() => {
          const normalized = readTrimmedString(inputValue);
          if (normalized) {
            commit(normalized);
          }
        }}
        list={listId}
        placeholder={placeholder}
        bg="white"
      />
      <datalist id={listId}>
        {normalizedOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <Wrap spacing={2}>
        {(Array.isArray(value) ? value : []).map((entry) => (
          <WrapItem key={entry}>
            <Tag size="md" borderRadius="full" colorScheme={colorScheme}>
              <TagLabel>{entry}</TagLabel>
              <TagCloseButton onClick={() => removeEntry(entry)} />
            </Tag>
          </WrapItem>
        ))}
        {!(Array.isArray(value) ? value : []).length && emptyText ? (
          <Text color="gray.500" fontSize="sm">
            {emptyText}
          </Text>
        ) : null}
      </Wrap>
    </VStack>
  );
});

export function PhrasesEditorPage({ data, actionData, isSaving = false }) {
  const [metadata, setMetadata] = useState(() => ({
    ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
    type: "segmentation"
  }));
  const [description, setDescription] = useState(data.description || "");
  const [rows, setRows] = useState(() => cloneRows(data.phrases?.rows));
  const [draftRow, setDraftRow] = useState(buildEmptyRow());
  const [editingRowKey, setEditingRowKey] = useState("");
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);
  const [testParagraph, setTestParagraph] = useState("");
  const [selectedTestPhrase, setSelectedTestPhrase] = useState("");
  const [activeTestResult, setActiveTestResult] = useState(() => ({
    isActive: false,
    matchedRowKeys: [],
    highlightRanges: [],
    totalMatches: 0,
  }));
  const setsInputRef = useRef(null);
  const phraseMatcherRef = useRef(null);
  const testParagraphRef = useRef(null);
  const testPreviewRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isMetadataDrawerOpen,
    onOpen: openMetadataDrawerState,
    onClose: closeMetadataDrawerState
  } = useDisclosure();
  const [draftMetadata, setDraftMetadata] = useState(() => ({
    ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
    type: "segmentation"
  }));
  const [draftDescription, setDraftDescription] = useState(data.description || "");
  const focusOptions = Array.isArray(data.categoryCatalog?.focusOptions)
    ? data.categoryCatalog.focusOptions
    : [];
  const {
    saveSummary,
    isSaving: isQueuedSaving,
    savedVisible,
    saveError,
    requestSave
  } = useQueuedDocumentSave({
    pathname: data?.id ? `/admin/data/${encodeURIComponent(data.id)}` : "",
    initialSummary: {
      version: data?.version ?? null,
      lastmodifieddate: data?.lastmodifieddate ?? null,
      lastmodifiedby: data?.lastmodifiedby ?? null
    },
    buildFormData(summary) {
      return buildSaveFormData({
        summary
      });
    }
  });

  useEffect(() => {
    setMetadata({
      ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
      type: "segmentation"
    });
    setDescription(data.description || "");
    setDraftMetadata({
      ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
      type: "segmentation"
    });
    setDraftDescription(data.description || "");
    setRows(cloneRows(data.phrases?.rows));
  }, [data.description, data.metadata, data.phrases?.rows]);

  useEffect(() => {
    if (!isTestPanelOpen || !activeTestResult?.isActive) {
      return;
    }

    setActiveTestResult(runPhraseParagraphTest(rows, testParagraph));
  }, [activeTestResult?.isActive, isTestPanelOpen, rows]);

  const knownSetOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    rows.forEach((row) => {
      normalizeTagList(row.sets).forEach((setName) => {
        const key = setName.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          options.push(setName);
        }
      });
    });

    normalizeTagList(draftRow.sets).forEach((setName) => {
      const key = setName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        options.push(setName);
      }
    });

    listMatcherSetNames(draftRow.matcher).forEach((setName) => {
      const key = setName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        options.push(setName);
      }
    });

    return options.sort((left, right) => left.localeCompare(right));
  }, [draftRow.matcher, draftRow.sets, rows]);

  const tableRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        phraseSummary: buildMatcherSummary(row.matcher, row.patternTemplate),
        setsSummary: normalizeTagList(row.sets).join(", "),
        focusSummary: buildFocusSummary(row.focuses),
      })),
    [rows]
  );

  const testedRowKeySet = useMemo(
    () => new Set(Array.isArray(activeTestResult?.matchedRowKeys) ? activeTestResult.matchedRowKeys : []),
    [activeTestResult?.matchedRowKeys]
  );

  const visibleTableRows = useMemo(
    () =>
      activeTestResult?.isActive
        ? tableRows.filter((row) => testedRowKeySet.has(row.__clientKey))
        : tableRows,
    [activeTestResult?.isActive, tableRows, testedRowKeySet]
  );

  const highlightedParagraphParts = useMemo(
    () => buildHighlightedParagraphParts(testParagraph, activeTestResult?.highlightRanges),
    [activeTestResult?.highlightRanges, testParagraph]
  );

  const tableColumns = useMemo(
    () => [
      {
        key: "phrase",
        label: "Phrase",
        width: "42%",
        filter: {
          type: "none",
        },
        dividerAfter: "double",
        renderCell: (row) =>
          row.matcher ? (
            <PhraseMatcherPreview
              matcher={row.matcher}
              fallbackPhrase={row.patternTemplate}
            />
          ) : (
            <Text
              whiteSpace="pre-wrap"
              fontSize="sm"
              color={row.phraseSummary ? "gray.800" : "gray.400"}
            >
              {row.phraseSummary || "—"}
            </Text>
          ),
      },
      {
        key: "sets",
        label: "Sets",
        width: "20%",
        filter: {
          type: "text",
          getValue: (row) => row.setsSummary,
        },
        renderCell: (row) => (
          <Text
            whiteSpace="pre-wrap"
            fontSize="sm"
            color={row.sets.length ? "gray.800" : "gray.400"}
          >
            {row.setsSummary || "—"}
          </Text>
        ),
      },
      {
        key: "focus",
        label: "Focus",
        width: "20%",
        filter: {
          type: "text",
          getValue: (row) => row.focusSummary,
        },
        renderCell: (row) => (
          <Text
            whiteSpace="pre-wrap"
            fontSize="sm"
            color={row.focuses.length ? "gray.800" : "gray.400"}
          >
            {row.focusSummary || "—"}
          </Text>
        ),
      },
      {
        key: "notes",
        label: "Notes",
        width: "8%",
        filter: {
          type: "none",
        },
        renderCell: (row) => (
          <Tooltip label={row.notes || "No notes"} hasArrow openDelay={200}>
            <IconButton
              aria-label="View notes"
              icon={<MdDescription />}
              size="sm"
              type="button"
              variant="ghost"
              colorScheme={row.notes ? "blue" : "gray"}
            />
          </Tooltip>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        width: "10%",
        align: "right",
        filter: {
          type: "none",
        },
        renderCell: (row) => (
          <HStack justify="flex-end" spacing={1}>
            <IconButton
              aria-label="Edit row"
              icon={<EditIcon />}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              onClick={() => openEditor(row.__clientKey)}
            />
            <IconButton
              aria-label="Delete row"
              icon={<DeleteIcon />}
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={() => removeRow(row.__clientKey)}
            />
          </HStack>
        ),
      },
    ],
    [openEditor, removeRow]
  );

  function buildSaveFormData({
    summary,
    nextRows = rows,
    nextMetadata = metadata,
    nextDescription = description
  }) {
    const formData = new FormData();
    formData.set("customDocumentType", "phrases");
    formData.set(
      "metadata",
      JSON.stringify({
        ...(nextMetadata && typeof nextMetadata === "object" ? nextMetadata : {}),
        type: "segmentation"
      })
    );
    formData.set("expectedVersion", summary.version == null ? "" : String(summary.version));
    formData.set("document", JSON.stringify(data.document ?? null));
    formData.set("editor", JSON.stringify(data.editor ?? null));
    formData.set("phrasesRows", JSON.stringify(stripTransientRows(nextRows)));
    formData.set("description", nextDescription || "");
    return formData;
  }

  function removeRow(rowKey) {
    const nextRows = rows.filter((row) => row.__clientKey !== rowKey);
    setRows(nextRows);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
  }

  function openEditor(rowKey = "") {
    const currentRow = rows.find((row) => row.__clientKey === rowKey);
    setEditingRowKey(rowKey);
    setDraftRow(currentRow ? { ...currentRow } : buildEmptyRow());
    onOpen();
  }

  function openEditorWithPhrase(phrase) {
    const normalizedPhrase = readTrimmedString(phrase);
    if (!normalizedPhrase) {
      return;
    }

    setEditingRowKey("");
    setDraftRow({
      ...buildEmptyRow(),
      patternTemplate: normalizedPhrase,
      matcher: null,
    });
    onOpen();
  }

  function closeEditor() {
    setEditingRowKey("");
    setDraftRow(buildEmptyRow());
    onClose();
  }

  function openMetadataDrawer() {
    setDraftMetadata({
      ...(metadata && typeof metadata === "object" ? metadata : {}),
      type: "segmentation"
    });
    setDraftDescription(description);
    openMetadataDrawerState();
  }

  function closeMetadataDrawer() {
    setDraftMetadata({
      ...(metadata && typeof metadata === "object" ? metadata : {}),
      type: "segmentation"
    });
    setDraftDescription(description);
    closeMetadataDrawerState();
  }

  function updateMetadata(key, value) {
    setDraftMetadata((current) => ({
      ...(current && typeof current === "object" ? current : {}),
      [key]: value
    }));
  }

  function saveMetadataChanges() {
    const nextMetadata = {
      ...(draftMetadata && typeof draftMetadata === "object" ? draftMetadata : {}),
      type: "segmentation"
    };
    const nextDescription = draftDescription;

    setMetadata(nextMetadata);
    setDescription(nextDescription);
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextMetadata,
        nextDescription
      })
    );
    closeMetadataDrawerState();
  }

  function updateDraftFocusTarget(index, key, value) {
    setDraftRow((current) => {
      const nextTargets = Array.isArray(current.focuses) ? current.focuses.slice() : [];
      const currentTarget = nextTargets[index] && typeof nextTargets[index] === "object"
        ? nextTargets[index]
        : buildEmptyFocusTarget();
      nextTargets[index] = {
        ...currentTarget,
        [key]: value
      };
      return {
        ...current,
        focuses: nextTargets
      };
    });
  }

  function addDraftFocusTarget() {
    setDraftRow((current) => ({
      ...current,
      focuses: [...(Array.isArray(current.focuses) ? current.focuses : []), buildEmptyFocusTarget()]
    }));
  }

  function removeDraftFocusTarget(index) {
    setDraftRow((current) => ({
      ...current,
      focuses: (Array.isArray(current.focuses) ? current.focuses : []).filter((_, entryIndex) => entryIndex !== index)
    }));
  }

  function toggleTestPanel() {
    setIsTestPanelOpen((current) => {
      const nextValue = !current;
      if (!nextValue) {
        setActiveTestResult({
          isActive: false,
          matchedRowKeys: [],
          highlightRanges: [],
          totalMatches: 0,
        });
      }
      return nextValue;
    });
  }

  function handleRunParagraphTest() {
    setActiveTestResult(runPhraseParagraphTest(rows, testParagraph));
  }

  function clearParagraphTest() {
    setActiveTestResult({
      isActive: false,
      matchedRowKeys: [],
      highlightRanges: [],
      totalMatches: 0,
    });
  }

  function syncSelectedTestPhrase() {
    const previewElement = testPreviewRef.current;
    if (!previewElement || typeof window === "undefined" || typeof window.getSelection !== "function") {
      setSelectedTestPhrase("");
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount < 1 || selection.isCollapsed) {
      setSelectedTestPhrase("");
      return;
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (
      (anchorNode && !previewElement.contains(anchorNode)) ||
      (focusNode && !previewElement.contains(focusNode))
    ) {
      setSelectedTestPhrase("");
      return;
    }

    setSelectedTestPhrase(readTrimmedString(selection.toString()));
  }

  function handleAddSelectedPhrase() {
    if (!selectedTestPhrase) {
      return;
    }

    openEditorWithPhrase(selectedTestPhrase);
  }

  function saveDraftRow() {
    const committedSets = setsInputRef.current?.commitPendingValue();
    const currentMatcherValue = phraseMatcherRef.current?.getCurrentValue?.() || null;
    const normalizedDraftRow = {
      ...draftRow,
      matcher: currentMatcherValue?.matcher || draftRow.matcher,
      patternTemplate: currentMatcherValue?.patternTemplate || draftRow.patternTemplate,
      sets: normalizeTagList(committedSets ?? draftRow.sets),
      focuses: normalizeFocusTargets(draftRow.focuses)
    };

    const nextRows = editingRowKey
      ? rows.map((row) => (row.__clientKey === editingRowKey ? normalizedDraftRow : row))
      : [...rows, normalizedDraftRow];

    setRows(nextRows);
    closeEditor();
    requestSave((summary) =>
      buildSaveFormData({
        summary,
        nextRows
      })
    );
  }

  return (
    <Box bg="white" h="100%" minH="0" display="flex" flexDirection="column">
      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} borderBottomWidth="1px" bg="white" position="sticky" top={0} zIndex={3}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={4} wrap="wrap">
          <Box>
            <Heading size="md">{readTrimmedString(metadata?.name) || data?.name || "Phrases"}</Heading>
            <InlineSaveStatus
              isSaving={isSaving || isQueuedSaving}
              savedVisible={savedVisible || Boolean(actionData?.ok)}
              lastmodifieddate={saveSummary?.lastmodifieddate ?? data?.lastmodifieddate}
              lastmodifiedby={saveSummary?.lastmodifiedby ?? data?.lastmodifiedby}
            />
          </Box>
          <HStack spacing={3} align="center" flexWrap="wrap">
            <Button type="button" variant="link" size="sm" colorScheme="blue" onClick={openMetadataDrawer}>
              edit metadata
            </Button>
            <Button type="button" variant="outline" onClick={toggleTestPanel}>
              Test Paragraph
            </Button>
            <Button type="button" variant="outline" onClick={() => openEditor()}>
              Add Row
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }} flex="1" minH="0" display="flex" flexDirection="column">
        {saveError?.message || actionData?.error?.message ? (
          <Alert status="error" borderRadius="md" mb={4}>
            <AlertIcon />
            <AlertDescription>{saveError?.message || actionData.error.message}</AlertDescription>
          </Alert>
        ) : null}

        {readTrimmedString(description) ? (
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={4} py={3} mb={4}>
            <Text color="gray.700" whiteSpace="pre-wrap">
              {description}
            </Text>
          </Box>
        ) : null}

        {isTestPanelOpen ? (
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="xl" bg="gray.50" px={4} py={4} mb={4}>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Flex justify="space-between" align="center" gap={3} mb={2}>
                  <Text fontSize="sm" fontWeight="semibold" textTransform="lowercase" color="gray.900">
                    test paragraph
                  </Text>
                  <Button type="button" colorScheme="blue" onClick={handleRunParagraphTest}>
                    Test
                  </Button>
                </Flex>
                <Textarea
                  ref={testParagraphRef}
                  value={testParagraph}
                  onChange={(event) => setTestParagraph(event.target.value)}
                  minH="120px"
                  bg="white"
                  placeholder="Paste a paragraph to test phrase matches."
                />
              </Box>

              {selectedTestPhrase ? (
                <Text fontSize="sm" color="gray.600">
                  Selected phrase: <Box as="span" fontFamily="mono" color="gray.800">{selectedTestPhrase}</Box>
                </Text>
              ) : activeTestResult?.isActive ? (
                <Text fontSize="sm" color="gray.500">
                  Highlight text in the preview to add it as a new phrase.
                </Text>
              ) : null}

              {readTrimmedString(testParagraph) ? (
                <Box
                  ref={testPreviewRef}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="white"
                  px={4}
                  py={3}
                  onMouseUp={syncSelectedTestPhrase}
                  onKeyUp={syncSelectedTestPhrase}
                >
                  <HStack spacing={2} mb={2} align="baseline">
                    <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
                      Highlighted Preview
                    </Text>
                    {activeTestResult?.isActive ? (
                      <Text fontSize="xs" color="gray.500">
                        ({activeTestResult.matchedRowKeys.length} matched phrase{activeTestResult.matchedRowKeys.length === 1 ? "" : "s"})
                      </Text>
                    ) : null}
                  </HStack>
                  <Text color="gray.800" whiteSpace="pre-wrap" lineHeight="tall">
                    {highlightedParagraphParts.map((part, index) =>
                      part.isMatch ? (
                        <Box
                          as="mark"
                          key={`highlight-${index}`}
                          bg="yellow.200"
                          color="gray.900"
                          px={1}
                          borderRadius="sm"
                        >
                          {part.text}
                        </Box>
                      ) : (
                        <Box as="span" key={`plain-${index}`}>
                          {part.text}
                        </Box>
                      )
                    )}
                  </Text>
                </Box>
              ) : null}

              <Flex justify="space-between" align={{ base: "stretch", sm: "center" }} gap={3} direction={{ base: "column", sm: "row" }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearParagraphTest}
                  isDisabled={!activeTestResult?.isActive}
                >
                  Clear Test
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSelectedPhrase}
                  isDisabled={!selectedTestPhrase}
                >
                  Add As New Phrase
                </Button>
              </Flex>
            </VStack>
          </Box>
        ) : null}

        <Box flex="1" minH="0" overflow="auto">
          <FilterableDataTable
            columns={tableColumns}
            sections={[
              {
                key: "phrases",
                title: "Phrases",
                rows: visibleTableRows,
                emptyText: activeTestResult?.isActive
                  ? "No phrase rows matched the test paragraph."
                  : "No rows match the current filters."
              }
            ]}
            showSectionHeaders={false}
            getRowKey={(row) => row.__clientKey}
          />
        </Box>
      </Box>

      <Drawer isOpen={isOpen} onClose={closeEditor} placement="right" size="xl">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{editingRowKey ? "Edit Row" : "Add Row"}</DrawerHeader>
          <DrawerBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="semibold" mb={2}>phrase matcher</Text>
                <PhraseMatcher
                  ref={phraseMatcherRef}
                  key={draftRow.__clientKey || editingRowKey || "new-phrase"}
                  initialPhrase={draftRow.patternTemplate || ""}
                  initialMatcher={draftRow.matcher}
                  setOptions={knownSetOptions}
                  onMatcherChange={(matcher) =>
                    setDraftRow((current) => ({
                      ...current,
                      matcher
                    }))
                  }
                  onPatternTemplateChange={(patternTemplate) =>
                    setDraftRow((current) => ({
                      ...current,
                      patternTemplate
                    }))
                  }
                />
              </Box>

              <Box>
                <Text fontWeight="semibold" mb={2}>sets</Text>
                <TagAutocompleteInput
                  ref={setsInputRef}
                  value={draftRow.sets}
                  options={knownSetOptions}
                  placeholder="Add set"
                  emptyText="No sets assigned."
                  colorScheme="orange"
                  onChange={(values) =>
                    setDraftRow((current) => ({
                      ...current,
                      sets: values
                    }))
                  }
                />
              </Box>

              <Box>
                <Text fontWeight="semibold" mb={2}>focus</Text>
                <VStack align="stretch" spacing={3}>
                  {(Array.isArray(draftRow.focuses) ? draftRow.focuses : []).map((target, index) => (
                    <HStack key={`phrase-focus-${index}`} align="start">
                      <Input
                        value={target.name || ""}
                        onChange={(event) => updateDraftFocusTarget(index, "name", event.target.value)}
                        list="phrases-focus-options"
                        placeholder={focusOptions.length ? "Select or type Focus" : "Type Focus"}
                        bg="white"
                      />
                      <Input
                        value={target.score || ""}
                        onChange={(event) => updateDraftFocusTarget(index, "score", event.target.value)}
                        bg="white"
                        maxW="100px"
                        placeholder="Score"
                      />
                      <Button type="button" variant="ghost" colorScheme="red" onClick={() => removeDraftFocusTarget(index)}>
                        Remove
                      </Button>
                    </HStack>
                  ))}
                  <datalist id="phrases-focus-options">
                    {focusOptions.map((option) => (
                      <option key={`phrases-focus-option-${option}`} value={option} />
                    ))}
                  </datalist>
                  {!(Array.isArray(draftRow.focuses) ? draftRow.focuses : []).length ? (
                    <Text color="gray.500" fontSize="sm">No Focus values selected.</Text>
                  ) : null}
                  <Button type="button" variant="outline" alignSelf="flex-start" onClick={addDraftFocusTarget}>
                    Add Focus
                  </Button>
                </VStack>
              </Box>

              <Box>
                <Text fontWeight="semibold" mb={2}>notes</Text>
                <Textarea
                  value={draftRow.notes}
                  onChange={(event) => setDraftRow((current) => ({ ...current, notes: event.target.value }))}
                  bg="white"
                  minH="120px"
                />
              </Box>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={closeEditor}>Cancel</Button>
              <Button colorScheme="blue" onClick={saveDraftRow}>Done</Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={isMetadataDrawerOpen} onClose={closeMetadataDrawer} placement="right" size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Metadata</DrawerHeader>
          <DrawerBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={typeof draftMetadata?.name === "string" ? draftMetadata.name : ""}
                  onChange={(event) => updateMetadata("name", event.target.value)}
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Namespace</FormLabel>
                <Input value={data.namespace || ""} isReadOnly bg="gray.50" />
              </FormControl>

              <FormControl>
                <FormLabel>Type</FormLabel>
                <Input value="segmentation" isReadOnly bg="gray.50" />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={draftDescription}
                  onChange={(event) => setDraftDescription(event.target.value)}
                  minH="120px"
                  bg="white"
                />
              </FormControl>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <HStack spacing={3}>
              <Button type="button" variant="ghost" onClick={closeMetadataDrawer}>
                Cancel
              </Button>
              <Button type="button" colorScheme="blue" onClick={saveMetadataChanges} isLoading={isSaving} loadingText="Saving">
                Save
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
