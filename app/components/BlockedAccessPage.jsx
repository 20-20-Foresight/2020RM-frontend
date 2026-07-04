import { Alert, AlertIcon, Box, Button, Heading, Stack, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";

const blockerLabels = {
  missing_role_assignment: "No access-granting role has been assigned yet.",
  missing_local_person_link: "Your account still needs a local person link before activation."
};

/**
 * Renders the blocked-user access page.
 * @param {{meta: {blockers?: string[]}, retryPath?: string}} props
 * @returns {JSX.Element}
 */
export function BlockedAccessPage({ meta, retryPath = "/dashboard" }) {
  const blockers = Array.isArray(meta?.blockers) ? meta.blockers : [];
  const [isStoppingGhost, setIsStoppingGhost] = useState(false);

  async function handleStopGhost() {
    if (isStoppingGhost) {
      return;
    }

    setIsStoppingGhost(true);
    try {
      await fetch("/api/ghost/stop", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      });
    } finally {
      window.location.assign(retryPath);
    }
  }

  return (
    <Box maxW="2xl" mx="auto" px={6} py={16}>
      <VStack align="stretch" spacing={6}>
        {meta?.ghost?.active ? (
          <Alert status="info" borderRadius="lg" alignItems="flex-start">
            <AlertIcon mt={1} />
            <Box>
              <Text fontWeight="semibold">
                Ghosting as {meta.ghost.effectiveDisplayName || meta.ghost.effectiveEmail || "selected user"}
              </Text>
              <Text mt={1}>
                Exit ghosting to return to your own admin session.
              </Text>
              <Button mt={3} size="sm" variant="outline" colorScheme="blue" onClick={handleStopGhost} isLoading={isStoppingGhost}>
                Exit Ghost
              </Button>
            </Box>
          </Alert>
        ) : null}

        <Box>
          <Heading size="lg" mb={3}>
            Access Pending
          </Heading>
          <Text color="gray.600">
            Your sign-in worked, but this account is still waiting for access setup to finish.
          </Text>
        </Box>

        <Alert status="warning" borderRadius="lg" alignItems="flex-start">
          <AlertIcon mt={1} />
          <Box>
            <Text fontWeight="semibold">Current blockers</Text>
            <Stack mt={2} spacing={2}>
              {blockers.length ? (
                blockers.map((blocker) => (
                  <Text key={blocker}>{blockerLabels[blocker] || blocker}</Text>
                ))
              ) : (
                <Text>Access is still pending. Retry after the required setup changes are complete.</Text>
              )}
            </Stack>
          </Box>
        </Alert>

        <Box>
          <Button as="a" href={retryPath} colorScheme="blue">
            Retry Access
          </Button>
        </Box>
      </VStack>
    </Box>
  );
}
