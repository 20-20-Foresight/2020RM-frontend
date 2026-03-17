import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";

export const meta = () => [{ title: "2020RM — Sign In" }];

export default function SignInPage() {
  return (
    <Box minH="100vh" display="grid" placeItems="center" bgGradient="linear(to-br, gray.900, gray.800)">
      <Box
        bg="white"
        color="gray.900"
        p={8}
        borderRadius="lg"
        shadow="2xl"
        w="full"
        maxW="480px"
      >
        <VStack align="start" spacing={4}>
          <Heading size="md">Sign in</Heading>
          <Text color="gray.600">Microsoft-only sign-in for this prototype.</Text>
          <Button as="a" href="/auth/login" colorScheme="blue" size="lg" w="full">
            Sign in with Microsoft
          </Button>
          <Text fontSize="sm" color="gray.500">
            After sign-in you will land on the dashboard.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}

