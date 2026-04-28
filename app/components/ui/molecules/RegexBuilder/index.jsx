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
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";

// ─── Utilities ────────────────────────────────────────────────────────────────

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const uid = () => Math.random().toString(36).slice(2, 8);

function tokenPattern(token) {
  if (token.type === "literal") return esc(token.value || "");
  if (token.type === "alternation") {
    const opts = (token.options || []).filter(Boolean).map(esc);
    if (!opts.length) return "";
    return opts.length === 1 ? opts[0] : `(?:${opts.join("|")})`;
  }
  return "";
}

function buildRegex(tokens, flags, boundaryBefore, boundaryAfter) {
  const parts = tokens
    .map((t) => {
      const base = tokenPattern(t);
      if (!base) return "";
      return t.optional ? `(?:${base})?` : base;
    })
    .filter(Boolean);

  if (!parts.length) return { pattern: "", regex: null };

  // Spaces, forward slashes, and hyphens are all treated as equivalent separators
  let pattern = parts.join("[\\s\\/\\-]+");
  if (boundaryBefore) pattern = `\\b${pattern}`;
  if (boundaryAfter) pattern = `${pattern}\\b`;

  try {
    return { pattern, regex: new RegExp(pattern, flags) };
  } catch {
    return { pattern, regex: null };
  }
}

function phraseToTokens(phrase) {
  return phrase
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ id: uid(), type: "literal", value: w, optional: false }));
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

// ─── TokenPill ────────────────────────────────────────────────────────────────

function TokenPill({ token, isSelected, onClick }) {
  const isAlt = token.type === "alternation";
  const options = isAlt ? (token.options || []).filter(Boolean) : [];

  let bg, borderColor, color, dividerColor;
  if (isSelected) {
    bg = "purple.50";
    borderColor = "purple.400";
    color = "purple.700";
    dividerColor = "purple.200";
  } else if (isAlt) {
    bg = "blue.50";
    borderColor = "blue.300";
    color = "blue.700";
    dividerColor = "blue.200";
  } else {
    bg = "white";
    borderColor = "gray.300";
    color = "gray.700";
    dividerColor = "gray.200";
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
          // OR block: each option on its own line with dividers
          options.map((opt, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <Box
                  h="1px"
                  bg={dividerColor}
                  mx={-3}
                  my={1}
                />
              )}
              <Text fontSize="xs" fontFamily="mono" lineHeight="short">
                {opt}
              </Text>
            </React.Fragment>
          ))
        ) : (
          <Box
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {token.value || (
              <Box as="span" opacity={0.4}>
                empty
              </Box>
            )}
          </Box>
        )}
      </Box>

      {token.optional && (
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
      )}

      {isAlt && (
        <Badge
          position="absolute"
          top="-9px"
          left="2px"
          colorScheme="blue"
          fontSize="9px"
          px={1}
          borderRadius="full"
          pointerEvents="none"
          lineHeight="14px"
        >
          OR
        </Badge>
      )}
    </Box>
  );
}

// ─── BoundaryMarker ───────────────────────────────────────────────────────────

function BoundaryMarker() {
  return (
    <Box
      px={2}
      py="3px"
      border="2px dashed"
      borderColor="gray.300"
      borderRadius="md"
      bg="gray.50"
      fontFamily="mono"
      fontSize="xs"
      color="gray.500"
      userSelect="none"
      title="Word boundary (\b)"
      lineHeight="short"
    >
      \b
    </Box>
  );
}

// ─── TokenEditor ──────────────────────────────────────────────────────────────

function TokenEditor({ token, onUpdate, onDelete, onClose }) {
  const [text, setText] = useState(
    token.type === "alternation"
      ? (token.options || []).join("\n")
      : token.value || ""
  );
  const [optional, setOptional] = useState(token.optional || false);
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
    if (rawLines.length === 0) {
      onDelete();
      return;
    }
    if (rawLines.length === 1) {
      onUpdate({ ...token, type: "literal", value: rawLines[0], options: undefined, optional });
    } else {
      onUpdate({ ...token, type: "alternation", options: rawLines, value: undefined, optional });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
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
      <VStack align="stretch" spacing={2}>
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
          placeholder="type text…"
          bg="white"
          borderColor={isMulti ? "blue.300" : "gray.200"}
          _focus={{
            borderColor: isMulti ? "blue.400" : "purple.400",
            boxShadow: "none",
          }}
        />

        {isMulti && (
          <HStack flexWrap="wrap" spacing={1}>
            {validLines.map((opt, i) => (
              <Badge key={i} colorScheme="blue" fontFamily="mono" fontSize="xs">
                {opt}
              </Badge>
            ))}
          </HStack>
        )}

        <HStack justify="space-between">
          <Checkbox
            isChecked={optional}
            onChange={(e) => setOptional(e.target.checked)}
            size="sm"
            colorScheme="green"
          >
            <Text fontSize="xs">Optional</Text>
          </Checkbox>
          <HStack>
            <IconButton
              icon={<DeleteIcon />}
              size="xs"
              colorScheme="red"
              variant="ghost"
              onClick={onDelete}
              aria-label="Delete token"
            />
            <Button size="xs" colorScheme="purple" onClick={save}>
              Save
            </Button>
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
          <Badge
            flexShrink={0}
            colorScheme={matchCount > 0 ? "green" : "red"}
            fontSize="xs"
          >
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </Badge>
        )}
      </HStack>

      {testText && (
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
          {parts.map((part, i) =>
            part.matched ? (
              <Box key={i} as="mark" bg="yellow.200" borderRadius="sm" px="1px">
                {part.text}
              </Box>
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

// ─── RegexBuilder ─────────────────────────────────────────────────────────────

/**
 * Interactive regex visualizer and builder.
 *
 * Each word of a phrase becomes a clickable "block". Click a block to edit it.
 * Shift+Enter in the editor converts a literal into an OR alternation.
 * A test box below highlights matches in a sample string.
 *
 * @param {{
 *   initialPhrase?: string,
 *   initialTokens?: Array<{id:string, type:"literal"|"alternation", value?:string, options?:string[], optional:boolean}>
 * }} props
 */
export function RegexBuilder({ initialPhrase = "", initialTokens = null }) {
  const [phraseInput, setPhraseInput] = useState(initialPhrase);
  const [tokens, setTokens] = useState(
    () => initialTokens ?? (initialPhrase ? phraseToTokens(initialPhrase) : [])
  );
  const [selectedId, setSelectedId] = useState(null);
  const [caseInsensitive, setCaseInsensitive] = useState(true);
  const [globalMatch, setGlobalMatch] = useState(true);
  const [boundaryBefore, setBoundaryBefore] = useState(false);
  const [boundaryAfter, setBoundaryAfter] = useState(false);

  const flags = [globalMatch ? "g" : "", caseInsensitive ? "i" : ""].filter(Boolean).join("");

  const { pattern, regex } = useMemo(
    () => buildRegex(tokens, flags, boundaryBefore, boundaryAfter),
    [tokens, flags, boundaryBefore, boundaryAfter]
  );

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
    const t = { id: uid(), type: "literal", value: "", optional: false };
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

  const toggleSelect = (id) =>
    setSelectedId((prev) => (prev === id ? null : id));

  const cardProps = {
    bg: "white",
    border: "1px solid",
    borderColor: "gray.200",
    borderRadius: "xl",
    p: 4,
    boxShadow: "sm",
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
            fontFamily="mono"
            fontSize="sm"
          />
          <Button colorScheme="purple" onClick={handleParse} flexShrink={0}>
            Build
          </Button>
        </HStack>
      </Box>

      {/* ── Pattern Blocks ── */}
      {tokens.length > 0 && (
        <Box {...cardProps}>
          <SectionLabel>Pattern Blocks</SectionLabel>
          <Flex align="center" flexWrap="wrap" gap={1} rowGap={4}>
            {/* Hard stop before */}
            {boundaryBefore && <BoundaryMarker />}

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

            {tokens.map((token, i) => (
              <React.Fragment key={token.id}>
                {i > 0 && (
                  <Text
                    fontSize="xs"
                    color="gray.300"
                    fontFamily="mono"
                    userSelect="none"
                    title="[\s\/\-]+ (space, slash, or hyphen)"
                  >
                    ·
                  </Text>
                )}
                <TokenPill
                  token={token}
                  isSelected={token.id === selectedId}
                  onClick={() => toggleSelect(token.id)}
                />
                <IconButton
                  icon={<AddIcon boxSize={2} />}
                  size="xs"
                  variant="ghost"
                  colorScheme="purple"
                  borderRadius="full"
                  aria-label="Add block after"
                  onClick={() => handleAddToken(i)}
                  opacity={0.4}
                  _hover={{ opacity: 1 }}
                />
              </React.Fragment>
            ))}

            {/* Hard stop after */}
            {boundaryAfter && <BoundaryMarker />}
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

      {/* ── Generated Regex ── */}
      {tokens.length > 0 && (
        <Box {...cardProps}>
          <SectionLabel>Generated Regex</SectionLabel>
          <VStack align="stretch" spacing={3}>
            <Code
              p={3}
              borderRadius="md"
              fontSize="sm"
              bg="purple.50"
              color="purple.800"
              wordBreak="break-all"
              whiteSpace="pre-wrap"
            >
              /{pattern}/{flags}
            </Code>

            {/* Case sensitivity */}
            <HStack justify="space-between">
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

            {/* Word boundaries and global flag */}
            <HStack justify="space-between">
              <HStack spacing={4}>
                <Checkbox
                  isChecked={boundaryBefore}
                  onChange={(e) => setBoundaryBefore(e.target.checked)}
                  size="sm"
                >
                  <Text fontSize="xs">\b before</Text>
                </Checkbox>
                <Checkbox
                  isChecked={boundaryAfter}
                  onChange={(e) => setBoundaryAfter(e.target.checked)}
                  size="sm"
                >
                  <Text fontSize="xs">\b after</Text>
                </Checkbox>
              </HStack>
              <Checkbox
                isChecked={globalMatch}
                onChange={(e) => setGlobalMatch(e.target.checked)}
                size="sm"
              >
                <Text fontSize="xs">Global (g)</Text>
              </Checkbox>
            </HStack>

            {!regex && pattern && (
              <Text fontSize="xs" color="red.500">
                Invalid pattern — check for empty alternations or unbalanced groups
              </Text>
            )}
          </VStack>
        </Box>
      )}

      {/* ── Test Box ── */}
      {tokens.length > 0 && (
        <Box {...cardProps}>
          <SectionLabel>Test</SectionLabel>
          <RegexTester regex={regex} />
        </Box>
      )}
    </VStack>
  );
}
