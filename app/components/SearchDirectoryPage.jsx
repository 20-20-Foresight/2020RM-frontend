import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  Heading,
  HStack,
  Input,
  List,
  ListItem,
  Text,
  VStack
} from "@chakra-ui/react";
import { Form, useNavigation } from "@remix-run/react";

const {
  getSearchResultFieldValue,
  resolveSchemaFieldPath
} = require("../models/search-result");

export function SearchDirectoryPage({
  title,
  emptyLabel,
  searchPlaceholder,
  secondaryFieldLabel,
  secondaryFieldPaths,
  data
}) {
  const navigation = useNavigation();
  const isSearching = navigation.state === "loading";
  const secondaryFieldPath = resolveSchemaFieldPath(data.schema, secondaryFieldPaths);

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="md">{title}</Heading>
        <Text color="gray.600" mt={2}>
          Search by name through the backend REST interface.
        </Text>
      </Box>

      <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
        <Form method="get">
          <HStack align="end" spacing={3}>
            <FormControl>
              <Input
                name="name"
                placeholder={searchPlaceholder}
                defaultValue={data.query.name}
                bg="gray.50"
              />
              <FormHelperText>Only name search is available in the current RPC source.</FormHelperText>
            </FormControl>
            <Button type="submit" colorScheme="blue" minW="112px" isLoading={isSearching} loadingText="Searching">
              Search
            </Button>
          </HStack>
        </Form>
      </Box>

      {data.error ? (
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      <Box bg="white" borderRadius="lg" shadow="sm" p={5}>
        <Text fontSize="sm" color="gray.500" mb={4}>
          {data.statusExplained}
        </Text>
        <Text fontSize="sm" color="gray.500" mb={4}>
          {data.meta?.count || 0} result{(data.meta?.count || 0) === 1 ? "" : "s"}
        </Text>

        {data.results.length ? (
          <List spacing={3}>
            {data.results.map((result) => {
              const secondaryValue = secondaryFieldPath
                ? getSearchResultFieldValue(result, secondaryFieldPath)
                : null;

              return (
              <ListItem
                key={result.uuid || result.name}
                borderWidth="1px"
                borderColor="gray.100"
                borderRadius="md"
                px={4}
                py={3}
              >
                <Text fontWeight="semibold">{result.name || emptyLabel}</Text>
                {secondaryFieldLabel && secondaryValue ? (
                  <Text color="gray.600" fontSize="sm" mt={1}>
                    {secondaryFieldLabel}: {secondaryValue}
                  </Text>
                ) : null}
              </ListItem>
              );
            })}
          </List>
        ) : (
          <Text color="gray.600">{data.query.name ? `No results for "${data.query.name}".` : "No search yet."}</Text>
        )}
      </Box>
    </VStack>
  );
}
