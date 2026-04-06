import { Alert, AlertIcon, Box, Button, Heading, Stack, Text, VStack } from "@chakra-ui/react";

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

  return (
    <Box maxW="2xl" mx="auto" px={6} py={16}>
      <VStack align="stretch" spacing={6}>
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
