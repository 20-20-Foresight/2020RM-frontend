import { Box, HStack, Spinner, Text } from "@chakra-ui/react";

/**
 * Formats one timestamp for editor headers.
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

/**
 * Renders one subtle inline save status with the latest modified metadata.
 * @param {{
 *   isSaving?: boolean,
 *   savedVisible?: boolean,
 *   lastmodifieddate?: string|null,
 *   lastmodifiedby?: string|null
 * }} props
 * @returns {JSX.Element}
 */
export function InlineSaveStatus({
  isSaving = false,
  savedVisible = false,
  lastmodifieddate = null,
  lastmodifiedby = null
}) {
  const shouldShowSaved = !isSaving && savedVisible;
  const shouldRenderStatus = isSaving || shouldShowSaved;

  if (!lastmodifieddate && !lastmodifiedby && !shouldRenderStatus) {
    return <></>;
  }

  return (
    <HStack spacing={3} mt={2} align="center" flexWrap="wrap">
      {lastmodifiedby ? (
        <Text color="gray.600">
          {`Last modified ${formatTimestamp(lastmodifieddate)} by ${lastmodifiedby}`}
        </Text>
      ) : (
        <Text color="gray.600">{`Last modified ${formatTimestamp(lastmodifieddate)}`}</Text>
      )}
      <Box
        px={2.5}
        py={1}
        borderRadius="md"
        bg={isSaving ? "blue.50" : "green.50"}
        borderWidth="1px"
        borderColor={isSaving ? "blue.100" : "green.100"}
        color={isSaving ? "blue.700" : "green.700"}
        fontSize="xs"
        fontWeight="bold"
        letterSpacing="0.08em"
        opacity={shouldRenderStatus ? 1 : 0}
        transform={shouldRenderStatus ? "translateY(0)" : "translateY(-2px)"}
        transition="opacity 0.35s ease, transform 0.35s ease"
        pointerEvents="none"
      >
        <HStack spacing={2}>
          {isSaving ? <Spinner size="xs" thickness="2px" speed="0.6s" color="blue.500" emptyColor="blue.100" /> : null}
          <Text as="span" fontSize="inherit" fontWeight="inherit" letterSpacing="inherit">
            {isSaving ? "SAVING" : "SAVED"}
          </Text>
        </HStack>
      </Box>
    </HStack>
  );
}
