import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  LinkBox,
  LinkOverlay,
  SimpleGrid,
  Text,
  VStack
} from "@chakra-ui/react";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { FiExternalLink, FiFileText } from "react-icons/fi";
import { loadEsClientAgreements } from "../models/es-client.server";

export async function loader({ request }) {
  return json(await loadEsClientAgreements({ request }));
}

export default function AgreementsPage() {
  const data = useLoaderData();
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="md" color="gray.900">Agreements</Heading>
        <Text color="gray.500" mt={1} fontSize="sm">
          Signed agreements, engagement letters, and client-facing presentation artifacts
        </Text>
      </Box>

      {items.length ? (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
          {items.map((item) => (
            <LinkBox
              key={item.id}
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="xl"
              p={5}
              shadow="sm"
            >
              <Flex justify="space-between" gap={4} align="flex-start">
                <Box>
                  <HStack spacing={2} mb={2}>
                    <Badge colorScheme={item.status === "executed" ? "green" : "blue"}>
                      {item.status}
                    </Badge>
                    {item.document?.kind ? <Badge variant="outline">{item.document.kind}</Badge> : null}
                  </HStack>
                  <Heading size="sm">
                    {item.document?.href ? (
                      <LinkOverlay as={Link} to={item.document.href} target="_blank" rel="noreferrer">
                        {item.title}
                      </LinkOverlay>
                    ) : (
                      item.title
                    )}
                  </Heading>
                  <Text color="gray.600" mt={2}>{item.organizationName}</Text>
                  {item.searchTitle ? <Text color="gray.500" fontSize="sm" mt={1}>{item.searchTitle}</Text> : null}
                  {item.description ? <Text color="gray.600" fontSize="sm" mt={3}>{item.description}</Text> : null}
                </Box>
                <Icon as={FiFileText} boxSize={5} color="gray.400" flexShrink={0} />
              </Flex>

              <HStack spacing={5} mt={4} color="gray.500" fontSize="sm">
                <Text>Effective: {item.effectiveDate || "TBD"}</Text>
                {item.document?.downloadName ? <Text>{item.document.downloadName}</Text> : null}
              </HStack>

              {item.document?.href ? (
                <Button
                  as={Link}
                  to={item.document.href}
                  target="_blank"
                  rel="noreferrer"
                  mt={4}
                  size="sm"
                  variant="outline"
                  leftIcon={<FiExternalLink />}
                >
                  Open Document
                </Button>
              ) : null}
            </LinkBox>
          ))}
        </SimpleGrid>
      ) : (
        <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" p={10} textAlign="center">
          <Text color="gray.400" fontSize="sm">No agreements are available.</Text>
        </Box>
      )}
    </VStack>
  );
}
