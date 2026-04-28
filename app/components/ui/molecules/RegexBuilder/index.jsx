import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  Textarea,
  IconButton,
  Button,
  Flex,
  Code,
  Badge,
  Checkbox,
  ButtonGroup,
  Collapse,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";

// ─── Utilities ────────────────────────────────────────────────────────────────

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uid = () => Math.random().toString(36).slice(2, 8);

// Replace unescaped * (user wildcard) with [A-Za-z]+.
// Split on *, escape each literal segment, rejoin with the character class.
function applyWildcard(s) {
  return (s || "").split("*").map(esc).join("[A-Za-z]+");
}

// Expand alpha chars in an already-escaped string to [aA] form so individual
// tokens can be case-insensitive without applying the global /i flag.
function expandCaseInsensitive(escaped) {
  let result = "";
  let i = 0;
  while (i < escaped.length) {
    const c = escaped[i];
    if (c === "\\") {
      // Escaped sequence — pass both chars through unchanged
      result += escaped[i] + (escaped[i + 1] || "");
      i += 2;
    } else if (c === "[") {
      // Character class — pass through to its closing ]
      const end = escaped.indexOf("]", i);
      if (end === -1) { result += escaped.slice(i); break; }
      result += escaped.slice(i, end + 1);
      i = end + 1;
    } else if (/[a-zA-Z]/.test(c)) {
      result += `[${c.toLowerCase()}${c.toUpperCase()}]`;
      i++;
    } else {
      result += c;
      i++;
    }
  }
  return result;
}

// Process a single string value: handle wildcard, then optionally expand case.
function processValue(v, needsCaseExpansion) {
  const escaped = applyWildcard(v);
  return needsCaseExpansion ? expandCaseInsensitive(escaped) : escaped;
}

// Build the regex fragment for one token, including optional wrapping and
// per-token word boundaries.
function buildTokenEntry(token, useGlobalI) {
  // A token needs per-char case expansion when it wants case-insensitive
  // matching but the global /i flag is not being used (i.e. another token
  // in the pattern is case-sensitive).
  const needsCaseExpansion = !useGlobalI && token.caseInsensitive !== false;

  let base;
  if (token.type === "literal") {
    base = processValue(token.value, needsCaseExpansion);
  } else if (token.type === "alternation") {
    const opts = (token.options || []).filter(Boolean).map((o) =>
      processValue(o, needsCaseExpansion)
    );
    if (!opts.length) base = "";
    else base = opts.length === 1 ? opts[0] : `(?:${opts.join("|")})`;
  } else {
    base = "";
  }

  if (!base) return "";
  if (token.optional) base = `(?:${base})?`;
  if (token.boundaryBefore) base = `\\b${base}`;
  if (token.boundaryAfter) base = `${base}\\b`;
  return base;
}

function buildRegex(tokens) {
  if (!tokens.length) return { pattern: "", regex: null, flags: "g" };

  // Use global /i only when every token is case-insensitive — otherwise each
  // case-insensitive token gets expanded inline to [aA] form.
  const allCaseInsensitive = tokens.every((t) => t.caseInsensitive !== false);
  const flags = allCaseInsensitive ? "gi" : "g";

  const parts = tokens
    .map((t) => buildTokenEntry(t, allCaseInsensitive))
    .filter(Boolean);

  if (!parts.length) return { pattern: "", regex: null, flags };

  const pattern = parts.join("[\\s\\/\\-]+");

  try {
    return { pattern, regex: new RegExp(pattern, flags), flags };
  } catch {
    return { pattern, regex: null, flags };
  }
}

function makeToken(value = "") {
  return {
    id: uid(),
    type: "literal",
    value,
    optional: false,
    caseInsensitive: true,
    boundaryBefore: false,
    boundaryAfter: false,
  };
}

function phraseToTokens(phrase) {
  return phrase.trim().split(/\s+/).filter(Boolean).map(makeToken);
}

function splitByMatches(text, regex) {
  if (!regex || !text) return [{ text: text || "", matched: false }];
  const parts = [];
  let last = 0;
  const re = new RegExp(
    regex.source,
    regex.flags.includes("g") ? regex.flags : regex.flags + "g"
  );
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), matched: false });
    parts.push({ text: m[0], matched: true });
    last = re.lastIndex;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) parts.push({ text: text.slice(last), matched: false });
  return parts.length ? parts : [{ text, matched: false }];
}

// ─── BoundaryStop ─────────────────────────────────────────────────────────────

function BoundaryStop() {
  return (
    <Box
      w="14px"
      h="14px"
      borderRadius="full"
      bg="red.500"
      flexShrink={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      title="Word boundary (hard stop)"
    >
      <Text as="span" fontSize="8px" color="white" fontWeight="black" lineHeight={1}>
        ✕
      </Text>
    </Box>
  );
}

// ─── TokenPill ────────────────────────────────────────────────────────────────

function TokenPill({ token, isSelected, onClick }) {
  const isAlt = token.type === "alternation";
  const options = isAlt ? (token.options || []).filter(Boolean) : [];
  const isCaseSensitive = token.caseInsensitive === false;

  let bg, borderColor, color, dividerColor;
  if (isSelected) {
    bg = "purple.50"; borderColor = "purple.400"; color = "purple.700"; dividerColor = "purple.200";
  } else if (isAlt) {
    bg = "blue.50"; borderColor = "blue.300"; color = "blue.700"; dividerColor = "blue.200";
  } else {
    bg = "white"; borderColor = "gray.300"; color = "gray.700"; dividerColor = "gray.200";
  }

  return (
    <Box position="relative" display="inline-flex" alignItems="flex-start">
      <Box
        as="button"
        onClick={onClick}
        px={3}
        py={isAlt ? 1 : "5px"}
        borderRadius={isAlt ? "lg" : "full"}
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
        minW="60px"
        maxW="200px"
        title={isAlt ? options.join(" / ") : token.value}
      >
        {isAlt ? (
          options.map((opt, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Box h="1px" bg={dividerColor} mx={-3} my={1} />}
              <Text fontSize="xs" fontFamily="mono" lineHeight="short">{opt}</Text>
            </React.Fragment>
          ))
        ) : (
          <Box overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {token.value || <Box as="span" opacity={0.4}>empty</Box>}
          </Box>
        )}
      </Box>

      {/* Case-sensitive badge — only shown when deviating from the default */}
      {isCaseSensitive && (
        <Badge
          position="absolute" top="-9px" left="50%" transform="translateX(-50%)"
          colorScheme="orange" fontSize="9px" px={1} borderRadius="full"
          pointerEvents="none" lineHeight="14px" whiteSpace="nowrap"
        >
          Aa
        </Badge>
      )}

      {token.optional && (
        <Badge
          position="absolute" top="-9px" right="2px"
          colorScheme="green" fontSize="9px" px={1} borderRadius="full"
          pointerEvents="none" lineHeight="14px"
        >
          ?
        </Badge>
      )}

      {isAlt && (
        <Badge
          position="absolute" top="-9px" left="2px"
          colorScheme="blue" fontSize="9px" px={1} borderRadius="full"
          pointerEvents="none" lineHeight="14px"
        >
          OR
        </Badge>
      )}
    </Box>
  );
}

// ─── TokenEditor ──────────────────────────────────────────────────────────────

function TokenEditor({ token, onUpdate, onDelete, onClose }) {
  const [text, setText] = useState(
    token.type === "alternation" ? (token.options || []).join("\n") : (token.value || "")
  );
  const [optional, setOptional] = useState(token.optional || false);
  const [caseInsensitive, setCaseInsensitive] = useState(token.caseInsensitive !== false);
  const [boundaryBefore, setBoundaryBefore] = useState(token.boundaryBefore || false);
  const [boundaryAfter, setBoundaryAfter] = useState(token.boundaryAfter || false);
  const taRef = useRef(null);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.focus();
      const len = taRef.current.value.length;
      taRef.current.setSelectionRange(len, len);
    }
  }, []);

  const linesArr = text.split("\n");
  const validLines = linesArr.filter((l) => l.trim());
  const isMulti = validLines.length > 1;

  const save = () => {
    const rawLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) { onDelete(); return; }
    const base = { ...token, optional, caseInsensitive, boundaryBefore, boundaryAfter };
    if (rawLines.length === 1) {
      onUpdate({ ...base, type: "literal", value: rawLines[0], options: undefined });
    } else {
      onUpdate({ ...base, type: "alternation", options: rawLines, value: undefined });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <Box
      bg="gray.50"
      border="1px solid"
      borderColor={isMulti ? "blue.200" : "gray.200"}
      borderRadius="lg"
      p={3}
      mt={3}
    >
      <VStack align="stretch" spacing={3}>
        <Text fontSize="xs" color="gray.500">
          {isMulti
            ? `${validLines.length} options · Shift+Enter to add more · Enter to save`
            : "Shift+Enter to add alternates · Enter to save · Esc to cancel"}
        </Text>

        <Textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          fontFamily="mono"
          fontSize="sm"
          rows={Math.min(Math.max(linesArr.length, 1), 8)}
          resize="none"
          placeholder="type text… (use * as a wildcard)"
          bg="white"
          borderColor={isMulti ? "blue.300" : "gray.200"}
          _focus={{ borderColor: isMulti ? "blue.400" : "purple.400", boxShadow: "none" }}
        />

        {isMulti && (
          <HStack flexWrap="wrap" spacing={1}>
            {validLines.map((opt, i) => (
              <Badge key={i} colorScheme="blue" fontFamily="mono" fontSize="xs">{opt}</Badge>
            ))}
          </HStack>
        )}

        {/* Case sensitivity */}
        <HStack justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">Case</Text>
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

        {/* Optional + stops */}
        <HStack justify="space-between">
          <HStack spacing={4} flexWrap="wrap">
            <Checkbox isChecked={optional} onChange={(e) => setOptional(e.target.checked)} size="sm" colorScheme="green">
              <Text fontSize="xs">Optional</Text>
            </Checkbox>
            <Checkbox isChecked={boundaryBefore} onChange={(e) => setBoundaryBefore(e.target.checked)} size="sm" colorScheme="red">
              <Text fontSize="xs">Stop before</Text>
            </Checkbox>
            <Checkbox isChecked={boundaryAfter} onChange={(e) => setBoundaryAfter(e.target.checked)} size="sm" colorScheme="red">
              <Text fontSize="xs">Stop after</Text>
            </Checkbox>
          </HStack>
          <HStack>
            <IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" variant="ghost" onClick={onDelete} aria-label="Delete" />
            <Button size="xs" colorScheme="purple" onClick={save}>Save</Button>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
}

// ─── RegexTester ──────────────────────────────────────────────────────────────

function RegexTester({ regex }) {
  const [testText, setTestText] = useState("");
  const parts = useMemo(() => splitByMatches(testText, regex), [testText, regex]);
  const matchCount = useMemo(() => parts.filter((p) => p.matched).length, [parts]);

  return (
    <VStack align="stretch" spacing={2}>
      <HStack>
        <Input
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Type a test sentence..."
          fontFamily="mono"
          fontSize="sm"
          size="sm"
        />
        {testText && (
          <Badge flexShrink={0} colorScheme={matchCount > 0 ? "green" : "red"} fontSize="xs">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </Badge>
        )}
      </HStack>

      {testText && (
        <Box
          bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="md"
          px={3} py={2} fontFamily="mono" fontSize="sm" lineHeight="tall"
          whiteSpace="pre-wrap" wordBreak="break-word" minH="36px"
        >
          {parts.map((part, i) =>
            part.matched ? (
              <Box key={i} as="mark" bg="yellow.200" borderRadius="sm" px="1px">{part.text}</Box>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </Box>
      )}
    </VStack>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <Text fontSize="10px" fontWeight="semibold" color="gray.400"
      textTransform="uppercase" letterSpacing="widest" mb={3}>
      {children}
    </Text>
  );
}

// ─── RegexBuilder ─────────────────────────────────────────────────────────────

/**
 * Interactive regex visualizer and builder.
 * @param {{
 *   initialPhrase?: string,
 *   initialTokens?: Array<{id:string, type:"literal"|"alternation", value?:string, options?:string[], optional:boolean, caseInsensitive?:boolean, boundaryBefore?:boolean, boundaryAfter?:boolean}>
 * }} props
 */
export function RegexBuilder({ initialPhrase = "", initialTokens = null }) {
  const [phraseInput, setPhraseInput] = useState(initialPhrase);
  const [tokens, setTokens] = useState(
    () => initialTokens ?? (initialPhrase ? phraseToTokens(initialPhrase) : [])
  );
  const [selectedId, setSelectedId] = useState(null);
  const [showRegex, setShowRegex] = useState(false);

  const { pattern, regex, flags } = useMemo(() => buildRegex(tokens), [tokens]);

  const selectedToken = useMemo(
    () => tokens.find((t) => t.id === selectedId) ?? null,
    [tokens, selectedId]
  );

  const handleParse = () => {
    if (!phraseInput.trim()) return;
    setTokens(phraseToTokens(phraseInput));
    setSelectedId(null);
  };

  const handleAddToken = (afterIdx) => {
    const t = makeToken("");
    setTokens((prev) => {
      const next = [...prev];
      next.splice(afterIdx + 1, 0, t);
      return next;
    });
    setSelectedId(t.id);
  };

  const handleUpdate = (updated) => {
    setTokens((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedId(null);
  };

  const handleDelete = (id) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    setSelectedId(null);
  };

  const cardProps = {
    bg: "white", border: "1px solid", borderColor: "gray.200",
    borderRadius: "xl", p: 4, boxShadow: "sm",
  };

  return (
    <VStack align="stretch" spacing={3} maxW="760px">

      {/* ── Phrase Input ── */}
      <Box {...cardProps}>
        <SectionLabel>Phrase</SectionLabel>
        <HStack>
          <Input
            value={phraseInput}
            onChange={(e) => setPhraseInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleParse()}
            placeholder="Type a phrase, then press Enter or Build…"
            fontFamily="mono" fontSize="sm"
          />
          <Button colorScheme="purple" onClick={handleParse} flexShrink={0}>Build</Button>
        </HStack>
      </Box>

      {/* ── Pattern Blocks ── */}
      {tokens.length > 0 && (
        <Box {...cardProps}>
          <SectionLabel>Pattern Blocks</SectionLabel>
          <Flex align="center" flexWrap="wrap" gap={1} rowGap={5}>
            <IconButton
              icon={<AddIcon boxSize={2} />} size="xs" variant="ghost" colorScheme="purple"
              borderRadius="full" aria-label="Prepend block" onClick={() => handleAddToken(-1)}
              opacity={0.4} _hover={{ opacity: 1 }}
            />
            {tokens.map((token, i) => (
              <React.Fragment key={token.id}>
                {i > 0 && (
                  <Text fontSize="xs" color="gray.300" fontFamily="mono" userSelect="none"
                    title="[\s\/\-]+ (space, slash, or hyphen)">·</Text>
                )}
                {/* Boundary stop markers flank the pill */}
                <HStack spacing="3px" align="center">
                  {token.boundaryBefore && <BoundaryStop />}
                  <TokenPill
                    token={token}
                    isSelected={token.id === selectedId}
                    onClick={() => setSelectedId((p) => (p === token.id ? null : token.id))}
                  />
                  {token.boundaryAfter && <BoundaryStop />}
                </HStack>
                <IconButton
                  icon={<AddIcon boxSize={2} />} size="xs" variant="ghost" colorScheme="purple"
                  borderRadius="full" aria-label="Add block after" onClick={() => handleAddToken(i)}
                  opacity={0.4} _hover={{ opacity: 1 }}
                />
              </React.Fragment>
            ))}
          </Flex>

          {selectedToken && (
            <TokenEditor
              key={selectedToken.id}
              token={selectedToken}
              onUpdate={handleUpdate}
              onDelete={() => handleDelete(selectedToken.id)}
              onClose={() => setSelectedId(null)}
            />
          )}
        </Box>
      )}

      {/* ── Test ── */}
      {tokens.length > 0 && (
        <Box {...cardProps}>
          <SectionLabel>Test</SectionLabel>
          <RegexTester regex={regex} />
        </Box>
      )}

      {/* ── View Regex (debug) ── */}
      {tokens.length > 0 && (
        <Box>
          <Button
            size="xs" variant="ghost" colorScheme="gray"
            rightIcon={showRegex ? <ChevronUpIcon /> : <ChevronDownIcon />}
            onClick={() => setShowRegex((v) => !v)}
            color="gray.400" _hover={{ color: "gray.600" }}
          >
            {showRegex ? "Hide regex" : "View regex"}
          </Button>
          <Collapse in={showRegex} animateOpacity>
            <Box mt={2} p={3} bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="lg">
              {pattern ? (
                <Code fontSize="xs" bg="transparent" color="purple.700" wordBreak="break-all" whiteSpace="pre-wrap">
                  /{pattern}/{flags}
                </Code>
              ) : (
                <Text fontSize="xs" color="gray.400">No pattern yet</Text>
              )}
              {!regex && pattern && (
                <Text fontSize="xs" color="red.500" mt={1}>Invalid pattern</Text>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

    </VStack>
  );
}
