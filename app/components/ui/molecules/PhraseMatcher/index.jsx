import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Code,
  Collapse,
  Flex,
  HStack,
  IconButton,
  Input,
  Select,
  Text,
  Textarea,
  Tooltip,
  VStack,
  Checkbox
} from "@chakra-ui/react";
import { AddIcon, ChevronDownIcon, ChevronUpIcon, DeleteIcon } from "@chakra-ui/icons";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uid = () => Math.random().toString(36).slice(2, 8);

function applyWildcard(s) {
  return (s || "").split("*").map(esc).join("[A-Za-z]*");
}

function expandCaseInsensitive(escaped) {
  let result = "";
  let i = 0;

  while (i < escaped.length) {
    const character = escaped[i];
    if (character === "\\") {
      result += escaped[i] + (escaped[i + 1] || "");
      i += 2;
    } else if (character === "[") {
      const endIndex = escaped.indexOf("]", i);
      if (endIndex === -1) {
        result += escaped.slice(i);
        break;
      }
      result += escaped.slice(i, endIndex + 1);
      i = endIndex + 1;
    } else if (/[a-zA-Z]/.test(character)) {
      result += `[${character.toLowerCase()}${character.toUpperCase()}]`;
      i += 1;
    } else {
      result += character;
      i += 1;
    }
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
    } else {
      current += value[index];
      index += 1;
    }
  }

  if (current) {
    segments.push({ optional: false, value: current });
  }

  return segments;
}

function processValue(value, needsCaseExpansion) {
  const segments = parseUserInput(value || "");
  return segments
    .map(({ optional, value: segmentValue }) => {
      const escaped = applyWildcard(segmentValue);
      const pattern = needsCaseExpansion ? expandCaseInsensitive(escaped) : escaped;
      return optional ? `(?:${pattern})?` : pattern;
    })
    .join("");
}

function makeLiteralToken(value = "") {
  return {
    id: uid(),
    type: "literal",
    value,
    optional: false,
    negated: false,
    caseInsensitive: true
  };
}

function phraseToTokens(phrase) {
  return phrase
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => makeLiteralToken(value));
}

function readTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readMatcherTokens(value) {
  return Array.isArray(value)
    ? value
        .map((token, index) => {
          if (!token || typeof token !== "object") {
            return null;
          }

          const type = readTrimmedString(token.type) || "literal";
          if (!["literal", "alternation", "set"].includes(type)) {
            return null;
          }

          return {
            id: readTrimmedString(token.id) || `p${index}`,
            type,
            value: type === "literal" ? readTrimmedString(token.value) : "",
            options:
              type === "alternation" && Array.isArray(token.options)
                ? token.options.map((entry) => readTrimmedString(entry)).filter(Boolean)
                : [],
            setName: type === "set" ? readTrimmedString(token.setName) : "",
            optional: token.optional === true,
            negated: token.negated === true,
            caseInsensitive: type === "set" ? true : token.caseInsensitive !== false
          };
        })
        .filter(Boolean)
    : [];
}

function buildTokenEntry(token, useGlobalI) {
  const anyBlockPattern = "[^\\s\\/\\-]+";

  if (token.type === "set") {
    const setName = readTrimmedString(token.setName);
    if (!setName) {
      return "";
    }
    const base = `{${setName}}`;
    let pattern = base;

    if (token.negated) {
      pattern = `(?!(?:${base})(?=[\\s\\/\\-]|$))${anyBlockPattern}`;
    }

    return pattern;
  }

  const needsCaseExpansion = !useGlobalI && token.caseInsensitive !== false;
  let base = "";

  if (token.type === "literal") {
    base = processValue(token.value, needsCaseExpansion);
  } else if (token.type === "alternation") {
    const options = (token.options || [])
      .filter(Boolean)
      .map((option) => processValue(option, needsCaseExpansion));
    if (!options.length) {
      base = "";
    } else {
      base = options.length === 1 ? options[0] : `(?:${options.join("|")})`;
    }
  }

  if (!base) {
    return "";
  }

  let pattern = base;
  if (token.negated) {
    pattern = `(?!(?:${base})(?=[\\s\\/\\-]|$))${anyBlockPattern}`;
  }

  return pattern;
}

function expandOptionalTokenSequences(tokens) {
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

    visit(index + 1, [
      ...currentTokens,
      {
        ...sourceToken,
        optional: false
      }
    ]);
  }

  visit(0, []);
  return expanded;
}

function buildPhraseMatcher(matcher) {
  const tokens = readMatcherTokens(matcher?.tokens);
  if (!tokens.length) {
    return {
      matcher: {
        version: 1,
        kind: "phrase-matcher",
        anchorStart: matcher?.anchorStart === true,
        anchorEnd: matcher?.anchorEnd === true,
        tokens: []
      },
      patternTemplate: "",
      regex: null,
      flags: "g",
      hasSetTokens: false
    };
  }

  const allCaseInsensitive = tokens.every(
    (token) => token.type === "set" || token.caseInsensitive !== false
  );
  const flags = allCaseInsensitive ? "gi" : "g";
  const sequencePatterns = expandOptionalTokenSequences(tokens)
    .map((sequence) =>
      sequence
        .map((token) => buildTokenEntry(token, allCaseInsensitive))
        .filter(Boolean)
        .join("[\\s\\/\\-]+")
    )
    .filter(Boolean);
  const hasSetTokens = tokens.some((token) => token.type === "set");
  let patternTemplate = "";

  if (sequencePatterns.length === 1) {
    patternTemplate = sequencePatterns[0];
  } else if (sequencePatterns.length > 1) {
    patternTemplate = `(?:${sequencePatterns.join("|")})`;
  }

  if (matcher?.anchorStart === true) {
    patternTemplate = `^${patternTemplate}`;
  }
  if (matcher?.anchorEnd === true) {
    patternTemplate = `${patternTemplate}$`;
  }

  let regex = null;
  if (!hasSetTokens && patternTemplate) {
    try {
      regex = new RegExp(patternTemplate, flags);
    } catch (_error) {
      regex = null;
    }
  }

  return {
    matcher: {
      version: 1,
      kind: "phrase-matcher",
      anchorStart: matcher?.anchorStart === true,
      anchorEnd: matcher?.anchorEnd === true,
      tokens: tokens.map((token) => {
        if (token.type === "literal") {
          return {
            type: "literal",
            value: token.value || "",
            optional: token.optional === true,
            negated: token.negated === true,
            caseInsensitive: token.caseInsensitive !== false
          };
        }

        if (token.type === "alternation") {
          return {
            type: "alternation",
            options: (token.options || []).filter(Boolean),
            optional: token.optional === true,
            negated: token.negated === true,
            caseInsensitive: token.caseInsensitive !== false
          };
        }

        return {
          type: "set",
          setName: token.setName || "",
          optional: token.optional === true,
          negated: token.negated === true
        };
      })
    },
    patternTemplate,
    regex,
    flags,
    hasSetTokens
  };
}

function splitByMatches(text, regex) {
  if (!regex || !text) {
    return [{ text: text || "", matched: false }];
  }

  const parts = [];
  let lastIndex = 0;
  const matcher = new RegExp(
    regex.source,
    regex.flags.includes("g") ? regex.flags : `${regex.flags}g`
  );
  let match = null;

  while ((match = matcher.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), matched: false });
    }
    parts.push({ text: match[0], matched: true });
    lastIndex = matcher.lastIndex;
    if (match[0].length === 0) {
      matcher.lastIndex += 1;
    }
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), matched: false });
  }

  return parts.length ? parts : [{ text, matched: false }];
}

function AnchorToggle({ symbol, active, label, onClick }) {
  const element = (
    <Box
      as="button"
      onClick={onClick}
      px={2}
      py="4px"
      fontFamily="mono"
      fontSize="sm"
      fontWeight="bold"
      color={active ? "teal.700" : "gray.300"}
      border="1px dashed"
      borderColor={active ? "teal.400" : "gray.200"}
      bg={active ? "teal.50" : "transparent"}
      borderRadius="md"
      cursor="pointer"
      transition="all 0.12s"
      _hover={{ borderColor: "teal.300", color: "teal.500" }}
      lineHeight={1}
      flexShrink={0}
    >
      {symbol}
    </Box>
  );

  return (
    <Tooltip label={label} placement="top" hasArrow openDelay={300}>
      {element}
    </Tooltip>
  );
}

function TokenPill({ token, isSelected, onClick }) {
  const isAlternation = token.type === "alternation";
  const isSet = token.type === "set";
  const options = isAlternation ? (token.options || []).filter(Boolean) : [];
  const hasAlternationOptions = options.length > 0;
  const isCaseSensitive = !isSet && token.caseInsensitive === false;
  const isNegated = token.negated === true;

  let bg = "white";
  let borderColor = "gray.300";
  let color = "gray.700";
  let dividerColor = "gray.200";

  if (isNegated) {
    bg = "red.50";
    borderColor = "red.300";
    color = "red.700";
    dividerColor = "red.200";
  } else if (isSelected) {
    bg = "purple.50";
    borderColor = "purple.400";
    color = "purple.700";
    dividerColor = "purple.200";
  } else if (isSet) {
    bg = "orange.50";
    borderColor = "orange.300";
    color = "orange.700";
    dividerColor = "orange.200";
  } else if (isAlternation) {
    bg = "blue.50";
    borderColor = "blue.300";
    color = "blue.700";
    dividerColor = "blue.200";
  }

  return (
    <Box position="relative" display="inline-flex" alignItems="flex-start">
      <Box
        as="button"
        onClick={onClick}
        px={3}
        py={isAlternation ? 1 : "5px"}
        borderRadius={isAlternation ? "lg" : "full"}
        border="2px solid"
        borderColor={borderColor}
        bg={bg}
        color={color}
        cursor="pointer"
        transition="all 0.12s"
        _hover={{ borderColor: "purple.300", shadow: "sm" }}
        fontFamily="mono"
        fontSize="sm"
        textAlign="left"
        boxShadow="sm"
        minW={isAlternation ? "150px" : "60px"}
        maxW={isAlternation ? "260px" : "220px"}
        minH={isAlternation ? "72px" : "auto"}
        title={
          isSet
            ? `{${token.setName || ""}}`
            : isAlternation
              ? options.join(" / ")
              : token.value
        }
      >
        {isSet ? (
          <Box overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {token.setName ? `{${token.setName}}` : <Box as="span" opacity={0.4}>set</Box>}
          </Box>
        ) : isAlternation ? (
          hasAlternationOptions ? (
            options.map((option, index) => (
              <React.Fragment key={index}>
                {index > 0 ? <Box h="1px" bg={dividerColor} mx={-3} my={1} /> : null}
                <Text fontSize="xs" fontFamily="mono" lineHeight="short">
                  {option}
                </Text>
              </React.Fragment>
            ))
          ) : (
            <Flex minH="56px" align="center" justify="center">
              <Text fontSize="xs" fontFamily="mono" color="gray.400">
                add options
              </Text>
            </Flex>
          )
        ) : (
          <Box overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {token.value || <Box as="span" opacity={0.4}>empty</Box>}
          </Box>
        )}
      </Box>

      {isCaseSensitive ? (
        <Badge
          position="absolute"
          top="-9px"
          left="50%"
          transform="translateX(-50%)"
          colorScheme="orange"
          fontSize="9px"
          px={1}
          borderRadius="full"
          pointerEvents="none"
          lineHeight="14px"
          whiteSpace="nowrap"
        >
          Aa
        </Badge>
      ) : null}

      {(isNegated || isAlternation || isSet) ? (
        <HStack
          position="absolute"
          top="-9px"
          left="2px"
          spacing={1}
          align="center"
          pointerEvents="none"
        >
          {isNegated ? (
            <Badge
              colorScheme="red"
              fontSize="9px"
              px={1}
              borderRadius="full"
              lineHeight="14px"
            >
              NOT
            </Badge>
          ) : null}

          {isAlternation ? (
            <Badge
              colorScheme="blue"
              fontSize="9px"
              px={1}
              borderRadius="full"
              lineHeight="14px"
            >
              OR
            </Badge>
          ) : null}

          {isSet ? (
            <Badge
              colorScheme="orange"
              fontSize="9px"
              px={1}
              borderRadius="full"
              lineHeight="14px"
            >
              SET
            </Badge>
          ) : null}
        </HStack>
      ) : null}

      {token.optional ? (
        <Badge
          position="absolute"
          top="-9px"
          right="2px"
          colorScheme="green"
          fontSize="9px"
          px={1}
          borderRadius="full"
          pointerEvents="none"
          lineHeight="14px"
        >
          ?
        </Badge>
      ) : null}
    </Box>
  );
}

function TokenEditor({ token, onUpdate, onDelete, onClose, setOptions = [] }) {
  const [tokenType, setTokenType] = useState(token.type || "literal");
  const [text, setText] = useState(
    token.type === "alternation" ? (token.options || []).join("\n") : (token.value || "")
  );
  const normalizedSetOptions = Array.isArray(setOptions)
    ? setOptions.map((option) => readTrimmedString(option)).filter(Boolean)
    : [];
  const [setName, setSetName] = useState(
    token.setName || normalizedSetOptions[0] || ""
  );
  const [optional, setOptional] = useState(token.optional || false);
  const [negated, setNegated] = useState(token.negated || false);
  const [caseInsensitive, setCaseInsensitive] = useState(token.caseInsensitive !== false);
  const textareaRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (tokenType === "set" && inputRef.current) {
      inputRef.current.focus();
      return;
    }

    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [tokenType]);

  const lines = text.split("\n");
  const validLines = lines.filter((line) => line.trim());
  const isMulti = validLines.length > 1;

  function save() {
      const base = {
        ...token,
        type: tokenType,
        optional,
        negated,
        caseInsensitive: tokenType === "set" ? true : caseInsensitive
      };

    if (tokenType === "set") {
      const normalizedSetName = readTrimmedString(setName);
      if (!normalizedSetName) {
        onDelete();
        return;
      }

      onUpdate({
        ...base,
        setName: normalizedSetName,
        value: undefined,
        options: undefined
      });
      return;
    }

    const rawLines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!rawLines.length) {
      onDelete();
      return;
    }

    if (tokenType === "alternation" || rawLines.length > 1) {
      onUpdate({
        ...base,
        type: "alternation",
        options: rawLines,
        value: undefined,
        setName: undefined
      });
      return;
    }

    onUpdate({
      ...base,
      type: "literal",
      value: rawLines[0],
      options: undefined,
      setName: undefined
    });
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (tokenType !== "set" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      save();
    }
  }

  return (
    <Box
      bg="gray.50"
      border="1px solid"
      borderColor={tokenType === "set" ? "orange.200" : isMulti ? "blue.200" : "gray.200"}
      borderRadius="lg"
      p={3}
      mt={3}
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            Block Type
          </Text>
          <Select
            size="xs"
            maxW="180px"
            value={tokenType}
            onChange={(event) => setTokenType(event.target.value)}
            bg="white"
          >
            <option value="literal">One Word</option>
            <option value="alternation">OR Block</option>
            <option value="set">Set Reference</option>
          </Select>
        </HStack>

        {tokenType === "set" ? (
          <VStack align="stretch" spacing={3}>
            <Text fontSize="xs" color="gray.500">
              Store this block as a set token. The regex template will emit <code>{"{set_name}"}</code>.
            </Text>
            <Select
              ref={inputRef}
              value={setName}
              onChange={(event) => setSetName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  onClose();
                }
              }}
              fontFamily="mono"
              fontSize="sm"
              bg="white"
            >
              <option value="">Select one set</option>
              {normalizedSetOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </VStack>
        ) : (
          <VStack align="stretch" spacing={3}>
            <Text fontSize="xs" color="gray.500">
              {tokenType === "alternation"
                ? "One option per line. Enter saves. Shift+Enter adds another option."
                : isMulti
                  ? `${validLines.length} options · Enter saves`
                  : "Use * as wildcard and (parens) for optional fragments."}
            </Text>
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              fontFamily="mono"
              fontSize="sm"
              rows={Math.min(Math.max(lines.length, 1), 8)}
              resize="none"
              placeholder={
                tokenType === "alternation"
                  ? "retail\noffice\nindustrial"
                  : "management"
              }
              bg="white"
              borderColor={tokenType === "alternation" || isMulti ? "blue.300" : "gray.200"}
              _focus={{
                borderColor: tokenType === "alternation" || isMulti ? "blue.400" : "purple.400",
                boxShadow: "none"
              }}
            />
            {validLines.length > 1 ? (
              <HStack flexWrap="wrap" spacing={1}>
                {validLines.map((option, index) => (
                  <Badge key={index} colorScheme="blue" fontFamily="mono" fontSize="xs">
                    {option}
                  </Badge>
                ))}
              </HStack>
            ) : null}
          </VStack>
        )}

        <HStack justify="space-between" align="center">
          <HStack spacing={4}>
            <Checkbox
              isChecked={optional}
              onChange={(event) => setOptional(event.target.checked)}
              size="sm"
              colorScheme="green"
            >
              <Text fontSize="xs">Optional</Text>
            </Checkbox>
            <Checkbox
              isChecked={negated}
              onChange={(event) => setNegated(event.target.checked)}
              size="sm"
              colorScheme="red"
            >
              <Text fontSize="xs">Not</Text>
            </Checkbox>
          </HStack>

          {tokenType !== "set" ? (
            <HStack justify="space-between" align="center">
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                Case
              </Text>
              <ButtonGroup size="xs" isAttached>
                <Button
                  variant={!caseInsensitive ? "solid" : "outline"}
                  colorScheme={!caseInsensitive ? "orange" : "gray"}
                  onClick={() => setCaseInsensitive(false)}
                >
                  Aa Sensitive
                </Button>
                <Button
                  variant={caseInsensitive ? "solid" : "outline"}
                  colorScheme={caseInsensitive ? "purple" : "gray"}
                  onClick={() => setCaseInsensitive(true)}
                >
                  aa Insensitive
                </Button>
              </ButtonGroup>
            </HStack>
          ) : <Box />}
        </HStack>

        <HStack justify="space-between">
          <IconButton
            icon={<DeleteIcon />}
            size="xs"
            colorScheme="red"
            variant="ghost"
            onClick={onDelete}
            aria-label="Delete"
          />
          <Button size="xs" colorScheme="purple" onClick={save}>
            Save
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

function PhraseMatcherTester({ regex, isDisabled = false }) {
  const [testText, setTestText] = useState("");
  const parts = useMemo(() => splitByMatches(testText, regex), [testText, regex]);
  const matchCount = useMemo(
    () => parts.filter((part) => part.matched).length,
    [parts]
  );

  return (
    <VStack align="stretch" spacing={2}>
      <HStack>
        <Input
          value={testText}
          onChange={(event) => setTestText(event.target.value)}
          placeholder={
            isDisabled
              ? "Testing is disabled while set tokens are present"
              : "Type a test sentence..."
          }
          fontFamily="mono"
          fontSize="sm"
          size="sm"
          isDisabled={isDisabled}
        />
        {testText && !isDisabled ? (
          <Badge
            flexShrink={0}
            colorScheme={matchCount > 0 ? "green" : "red"}
            fontSize="xs"
          >
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </Badge>
        ) : null}
      </HStack>
      {testText && !isDisabled ? (
        <Box
          bg="gray.50"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          px={3}
          py={2}
          fontFamily="mono"
          fontSize="sm"
          lineHeight="tall"
          whiteSpace="pre-wrap"
          wordBreak="break-word"
          minH="36px"
        >
          {parts.map((part, index) =>
            part.matched ? (
              <Box
                key={index}
                as="mark"
                bg="yellow.200"
                borderRadius="sm"
                px="1px"
              >
                {part.text}
              </Box>
            ) : (
              <span key={index}>{part.text}</span>
            )
          )}
        </Box>
      ) : null}
    </VStack>
  );
}

function SectionLabel({ children }) {
  return (
    <Text
      fontSize="10px"
      fontWeight="semibold"
      color="gray.400"
      textTransform="uppercase"
      letterSpacing="widest"
      mb={3}
    >
      {children}
    </Text>
  );
}

export function PhraseMatcherPreview({ matcher = null, fallbackPhrase = "" }) {
  const tokens = useMemo(() => readMatcherTokens(matcher?.tokens), [matcher]);
  const anchorStart = matcher?.anchorStart === true;
  const anchorEnd = matcher?.anchorEnd === true;

  if (!tokens.length) {
    return (
      <Text
        whiteSpace="pre-wrap"
        fontSize="sm"
        color={readTrimmedString(fallbackPhrase) ? "gray.800" : "gray.400"}
      >
        {readTrimmedString(fallbackPhrase) || "—"}
      </Text>
    );
  }

  return (
    <Flex align="center" flexWrap="wrap" gap={1} rowGap={5}>
      <AnchorToggle
        symbol="^"
        active={anchorStart}
        label={anchorStart ? "Anchored start" : "Not anchored"}
        onClick={() => {}}
      />
      {tokens.map((token, index) => (
        <React.Fragment key={token.id || `${token.type}-${index}`}>
          {index > 0 ? (
            <Text
              fontSize="xs"
              color="gray.300"
              fontFamily="mono"
              userSelect="none"
            >
              ·
            </Text>
          ) : null}
          <TokenPill token={token} isSelected={false} onClick={() => {}} />
        </React.Fragment>
      ))}
      <AnchorToggle
        symbol="$"
        active={anchorEnd}
        label={anchorEnd ? "Anchored end" : "Not anchored"}
        onClick={() => {}}
      />
    </Flex>
  );
}

export const PhraseMatcher = forwardRef(function PhraseMatcher({
  initialPhrase = "",
  initialMatcher = null,
  onMatcherChange,
  onPatternTemplateChange,
  compact = false,
  setOptions = []
}, ref) {
  const [phraseInput, setPhraseInput] = useState(initialPhrase);
  const [tokens, setTokens] = useState(() =>
    initialMatcher?.tokens
      ? readMatcherTokens(initialMatcher.tokens)
      : initialPhrase
        ? phraseToTokens(initialPhrase)
        : []
  );
  const [selectedId, setSelectedId] = useState(null);
  const [anchorStart, setAnchorStart] = useState(initialMatcher?.anchorStart === true);
  const [anchorEnd, setAnchorEnd] = useState(initialMatcher?.anchorEnd === true);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showMatcherJson, setShowMatcherJson] = useState(false);

  const builtMatcher = useMemo(
    () =>
      buildPhraseMatcher({
        anchorStart,
        anchorEnd,
        tokens
      }),
    [anchorEnd, anchorStart, tokens]
  );

  const selectedToken = useMemo(
    () => tokens.find((token) => token.id === selectedId) || null,
    [selectedId, tokens]
  );

  const matcherChangeRef = useRef(onMatcherChange);
  const patternTemplateChangeRef = useRef(onPatternTemplateChange);

  useEffect(() => {
    matcherChangeRef.current = onMatcherChange;
  });

  useEffect(() => {
    patternTemplateChangeRef.current = onPatternTemplateChange;
  });

  useImperativeHandle(
    ref,
    () => ({
      getCurrentValue() {
        return {
          matcher: builtMatcher.matcher,
          patternTemplate: builtMatcher.patternTemplate
        };
      }
    }),
    [builtMatcher]
  );

  useLayoutEffect(() => {
    matcherChangeRef.current?.(builtMatcher.matcher);
    patternTemplateChangeRef.current?.(builtMatcher.patternTemplate);
  }, [builtMatcher]);

  function handleParse() {
    if (!phraseInput.trim()) {
      return;
    }

    setTokens(phraseToTokens(phraseInput));
    setSelectedId(null);
  }

  function handleAddToken(afterIndex) {
    const token = makeLiteralToken("");
    setTokens((current) => {
      const next = [...current];
      next.splice(afterIndex + 1, 0, token);
      return next;
    });
    setSelectedId(token.id);
  }

  function handleUpdateToken(updatedToken) {
    setTokens((current) =>
      current.map((token) => (token.id === updatedToken.id ? updatedToken : token))
    );
    setSelectedId(null);
  }

  function handleDeleteToken(tokenId) {
    setTokens((current) => current.filter((token) => token.id !== tokenId));
    setSelectedId(null);
  }

  const card = compact
    ? {
        borderBottom: "1px solid",
        borderColor: "gray.100",
        pb: 3,
        mb: 2
      }
    : {
        bg: "white",
        border: "1px solid",
        borderColor: "gray.200",
        borderRadius: "xl",
        p: 4,
        boxShadow: "sm"
      };
  const maxWidth = compact ? "100%" : "760px";

  return (
    <VStack align="stretch" spacing={compact ? 2 : 3} maxW={maxWidth}>
      {!compact ? (
        <Box {...card}>
          <SectionLabel>Phrase</SectionLabel>
          <HStack>
            <Input
              value={phraseInput}
              onChange={(event) => setPhraseInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleParse();
                }
              }}
              placeholder="Type a phrase, then press Enter or Build…"
              fontFamily="mono"
              fontSize="sm"
            />
            <Button colorScheme="purple" onClick={handleParse} flexShrink={0}>
              Build
            </Button>
          </HStack>
        </Box>
      ) : null}

      {(tokens.length > 0 || compact) ? (
        <Box {...card}>
          {!compact ? <SectionLabel>Phrase Blocks</SectionLabel> : null}
          <Flex align="center" flexWrap="wrap" gap={1} rowGap={5}>
            <AnchorToggle
              symbol="^"
              active={anchorStart}
              label={anchorStart ? "Must start with" : "Click to anchor start"}
              onClick={() => setAnchorStart((current) => !current)}
            />
            <IconButton
              icon={<AddIcon boxSize={2} />}
              size="xs"
              variant="ghost"
              colorScheme="purple"
              borderRadius="full"
              aria-label="Prepend block"
              onClick={() => handleAddToken(-1)}
              opacity={0.4}
              _hover={{ opacity: 1 }}
            />
            {tokens.map((token, index) => (
              <React.Fragment key={token.id}>
                {index > 0 ? (
                  <Text
                    fontSize="xs"
                    color="gray.300"
                    fontFamily="mono"
                    userSelect="none"
                    title="[\s\/\-]+ (space, slash, or hyphen)"
                  >
                    ·
                  </Text>
                ) : null}
                <TokenPill
                  token={token}
                  isSelected={token.id === selectedId}
                  onClick={() =>
                    setSelectedId((current) => (current === token.id ? null : token.id))
                  }
                />
                <IconButton
                  icon={<AddIcon boxSize={2} />}
                  size="xs"
                  variant="ghost"
                  colorScheme="purple"
                  borderRadius="full"
                  aria-label="Add block after"
                  onClick={() => handleAddToken(index)}
                  opacity={0.4}
                  _hover={{ opacity: 1 }}
                />
              </React.Fragment>
            ))}
            <AnchorToggle
              symbol="$"
              active={anchorEnd}
              label={anchorEnd ? "Must end with" : "Click to anchor end"}
              onClick={() => setAnchorEnd((current) => !current)}
            />
          </Flex>
          {selectedToken ? (
            <TokenEditor
              key={selectedToken.id}
              token={selectedToken}
              onUpdate={handleUpdateToken}
              onDelete={() => handleDeleteToken(selectedToken.id)}
              onClose={() => setSelectedId(null)}
              setOptions={setOptions}
            />
          ) : null}
        </Box>
      ) : null}

      {!compact && tokens.length > 0 ? (
        <Box {...card}>
          <SectionLabel>Test</SectionLabel>
          <PhraseMatcherTester
            regex={builtMatcher.regex}
            isDisabled={builtMatcher.hasSetTokens}
          />
        </Box>
      ) : null}

      {tokens.length > 0 ? (
        <Box>
          <HStack spacing={2} align="center" mb={showTemplate || showMatcherJson ? 2 : 0}>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="gray"
              rightIcon={showTemplate ? <ChevronUpIcon /> : <ChevronDownIcon />}
              onClick={() => setShowTemplate((current) => !current)}
              color="gray.400"
              _hover={{ color: "gray.600" }}
            >
              {showTemplate ? "Hide template" : "View regex template"}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="gray"
              rightIcon={showMatcherJson ? <ChevronUpIcon /> : <ChevronDownIcon />}
              onClick={() => setShowMatcherJson((current) => !current)}
              color="gray.400"
              _hover={{ color: "gray.600" }}
            >
              {showMatcherJson ? "Hide matcher" : "View matcher JSON"}
            </Button>
          </HStack>

          <Collapse in={showTemplate} animateOpacity>
            <Box
              mt={2}
              p={3}
              bg="gray.50"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="lg"
            >
              {builtMatcher.patternTemplate ? (
                <Code
                  fontSize="xs"
                  bg="transparent"
                  color={builtMatcher.hasSetTokens ? "orange.700" : "purple.700"}
                  wordBreak="break-all"
                  whiteSpace="pre-wrap"
                >
                  /{builtMatcher.patternTemplate}/{builtMatcher.flags}
                </Code>
              ) : (
                <Text fontSize="xs" color="gray.400">
                  No pattern yet
                </Text>
              )}
              {builtMatcher.hasSetTokens ? (
                <Text fontSize="xs" color="orange.600" mt={1}>
                  Template includes set placeholders. Runtime expansion happens after authoring.
                </Text>
              ) : null}
            </Box>
          </Collapse>

          <Collapse in={showMatcherJson} animateOpacity>
            <Box
              mt={2}
              p={3}
              bg="gray.50"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="lg"
            >
              <Code
                display="block"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
                bg="transparent"
                color="gray.700"
                fontSize="xs"
              >
                {JSON.stringify(builtMatcher.matcher, null, 2)}
              </Code>
            </Box>
          </Collapse>
        </Box>
      ) : null}
    </VStack>
  );
});
