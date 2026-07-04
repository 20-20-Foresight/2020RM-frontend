import {
  Box,
  Flex,
  Grid,
  GridItem,
  HStack,
  SimpleGrid,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { ShimmerBox } from "./ui/atoms/ShimmerBox";

const BORDER_COLOR = "#D7DFEC";

function ShimmerCard({ children, p = { base: 5, md: 6 }, ...rest }) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor={BORDER_COLOR}
      borderRadius="20px"
      shadow="sm"
      p={p}
      {...rest}
    >
      {children}
    </Box>
  );
}

/* ─── Overview ──────────────────────────────────────────────── */

function OverviewShimmer() {
  return (
    <Grid
      templateColumns={{ base: "1fr", xl: "minmax(0, 2.2fr) minmax(320px, 1fr)" }}
      gap={6}
    >
      <GridItem>
        <Stack spacing={6}>
          {/* Description card */}
          <ShimmerCard>
            <ShimmerBox h="20px" w="100%" mb={3} borderRadius="sm" />
            <ShimmerBox h="20px" w="93%" mb={3} borderRadius="sm" />
            <ShimmerBox h="20px" w="85%" mb={3} borderRadius="sm" />
            <ShimmerBox h="20px" w="68%" borderRadius="sm" />
          </ShimmerCard>

          {/* 3 stat cards */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            {[0, 1, 2].map((i) => (
              <ShimmerCard key={i} p={{ base: 4, md: 5 }}>
                <ShimmerBox h="11px" w="68%" mb={4} borderRadius="sm" />
                <HStack spacing={3} align="flex-start">
                  <ShimmerBox h="20px" w="20px" borderRadius="sm" />
                  <ShimmerBox h="34px" w="90px" borderRadius="sm" />
                </HStack>
              </ShimmerCard>
            ))}
          </SimpleGrid>
        </Stack>
      </GridItem>

      <GridItem>
        <Stack spacing={6}>
          {/* Account health card */}
          <ShimmerCard>
            <Flex justify="space-between" align="center" mb={5}>
              <ShimmerBox h="24px" w="130px" borderRadius="sm" />
              <ShimmerBox h="20px" w="20px" borderRadius="sm" />
            </Flex>
            <ShimmerBox h="56px" w="90px" mb={4} borderRadius="sm" />
            <ShimmerBox h="8px" w="100%" borderRadius="full" mb={5} />
            <Stack spacing={4}>
              <Flex justify="space-between">
                <ShimmerBox h="16px" w="80px" borderRadius="sm" />
                <ShimmerBox h="16px" w="50px" borderRadius="sm" />
              </Flex>
              <Flex justify="space-between">
                <ShimmerBox h="16px" w="70px" borderRadius="sm" />
                <ShimmerBox h="16px" w="45px" borderRadius="sm" />
              </Flex>
            </Stack>
          </ShimmerCard>

          {/* Tags card */}
          <ShimmerCard>
            <ShimmerBox h="24px" w="160px" mb={5} borderRadius="sm" />
            <Flex wrap="wrap" gap={2}>
              {[88, 115, 96, 134, 72, 104].map((w, i) => (
                <ShimmerBox key={i} h="30px" w={`${w}px`} borderRadius="full" />
              ))}
            </Flex>
          </ShimmerCard>
        </Stack>
      </GridItem>
    </Grid>
  );
}

/* ─── Contacts / Jobs (table layout) ────────────────────────── */

function TableShimmer() {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor={BORDER_COLOR}
      borderRadius="20px"
      shadow="sm"
      overflow="hidden"
    >
      {/* Toolbar */}
      <Flex
        align={{ base: "stretch", lg: "center" }}
        justify="space-between"
        gap={4}
        direction={{ base: "column", lg: "row" }}
        px={{ base: 5, md: 6 }}
        py={5}
        borderBottomWidth="1px"
        borderColor={BORDER_COLOR}
      >
        <HStack spacing={3}>
          <ShimmerBox h="26px" w="100px" borderRadius="sm" />
          <ShimmerBox h="26px" w="64px" borderRadius="full" />
        </HStack>
        <HStack spacing={3} flexWrap="wrap">
          <ShimmerBox h="38px" w="200px" borderRadius="md" />
          <ShimmerBox h="38px" w="130px" borderRadius="md" />
          <ShimmerBox h="38px" w="80px" borderRadius="md" />
        </HStack>
      </Flex>

      <TableContainer>
        <Table size="md" variant="unstyled">
          <Thead bg="#F3F7FD">
            <Tr>
              {[180, 150, 120, 160, 100].map((w, i) => (
                <Th
                  key={i}
                  px={{ base: 5, md: i === 0 || i === 4 ? 6 : 4 }}
                  py={4}
                >
                  <ShimmerBox h="11px" w={`${w}px`} borderRadius="sm" />
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {Array.from({ length: 6 }, (_, row) => (
              <Tr
                key={row}
                borderTopWidth={row === 0 ? "0" : "1px"}
                borderColor={BORDER_COLOR}
              >
                <Td px={{ base: 5, md: 6 }} py={4} verticalAlign="top">
                  <ShimmerBox
                    h="16px"
                    w={`${130 + (row % 3) * 38}px`}
                    mb={2}
                    borderRadius="sm"
                  />
                  <HStack spacing={1}>
                    <ShimmerBox h="22px" w="56px" borderRadius="full" />
                    <ShimmerBox h="22px" w="52px" borderRadius="full" />
                  </HStack>
                </Td>
                <Td px={{ base: 5, md: 4 }} py={4} verticalAlign="top">
                  <ShimmerBox
                    h="16px"
                    w={`${100 + (row % 4) * 22}px`}
                    mb={2}
                    borderRadius="sm"
                  />
                  <ShimmerBox h="11px" w="50px" borderRadius="sm" />
                </Td>
                <Td px={{ base: 5, md: 4 }} py={4}>
                  <ShimmerBox h="16px" w="95px" borderRadius="sm" />
                </Td>
                <Td px={{ base: 5, md: 4 }} py={4}>
                  <ShimmerBox
                    h="16px"
                    w={`${110 + (row % 3) * 24}px`}
                    borderRadius="sm"
                  />
                </Td>
                <Td px={{ base: 5, md: 6 }} py={4}>
                  <Flex justify="flex-end">
                    <ShimmerBox h="16px" w="80px" borderRadius="sm" />
                  </Flex>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Footer */}
      <Flex
        px={{ base: 5, md: 6 }}
        py={4}
        borderTopWidth="1px"
        borderColor={BORDER_COLOR}
        justify="space-between"
        bg="#F7FAFF"
      >
        <ShimmerBox h="16px" w="160px" borderRadius="sm" />
        <ShimmerBox h="16px" w="200px" borderRadius="sm" />
      </Flex>
    </Box>
  );
}

/* ─── Locations / Similar Orgs (card grid) ───────────────────── */

function CardGridShimmer() {
  return (
    <Stack spacing={6}>
      {/* Stat row */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerCard key={i} p={{ base: 4, md: 5 }}>
            <ShimmerBox h="11px" w="68%" mb={3} borderRadius="sm" />
            <ShimmerBox h="40px" w="55%" borderRadius="sm" />
          </ShimmerCard>
        ))}
      </SimpleGrid>

      {/* Header row */}
      <Flex justify="space-between" align="center">
        <Box>
          <ShimmerBox h="32px" w="200px" mb={2} borderRadius="sm" />
          <ShimmerBox h="16px" w="300px" borderRadius="sm" />
        </Box>
        <HStack spacing={3}>
          <ShimmerBox h="38px" w="220px" borderRadius="md" />
          <ShimmerBox h="38px" w="80px" borderRadius="md" />
        </HStack>
      </Flex>

      {/* Card grid */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
        {[0, 1, 2].map((i) => (
          <ShimmerCard key={i} minH="180px">
            <Flex justify="space-between" align="start" mb={5}>
              <ShimmerBox h="24px" w="55%" borderRadius="sm" />
              <ShimmerBox h="24px" w="44px" borderRadius="full" />
            </Flex>
            <Stack spacing={3} mb={5}>
              <ShimmerBox h="16px" w="75%" borderRadius="sm" />
              <ShimmerBox h="16px" w="60%" borderRadius="sm" />
            </Stack>
            <Flex gap={2} flexWrap="wrap" pt={4} borderTopWidth="1px" borderColor={BORDER_COLOR}>
              <ShimmerBox h="14px" w="65px" borderRadius="sm" />
              <ShimmerBox h="14px" w="40px" borderRadius="sm" />
            </Flex>
          </ShimmerCard>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

/* ─── Outreach (metric cards + bar chart) ───────────────────── */

function OutreachShimmer() {
  return (
    <Stack spacing={6}>
      <Flex justify="space-between" align="flex-end" direction={{ base: "column", md: "row" }} gap={4}>
        <Box>
          <ShimmerBox h="32px" w="220px" mb={2} borderRadius="sm" />
          <ShimmerBox h="16px" w="320px" borderRadius="sm" />
        </Box>
        <HStack spacing={3}>
          <ShimmerBox h="38px" w="130px" borderRadius="md" />
          <ShimmerBox h="38px" w="110px" borderRadius="md" />
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerCard key={i} p={{ base: 4, md: 5 }}>
            <ShimmerBox h="11px" w="70%" mb={3} borderRadius="sm" />
            <ShimmerBox h="40px" w="50%" mb={4} borderRadius="sm" />
            <ShimmerBox h="6px" w="100%" borderRadius="full" />
          </ShimmerCard>
        ))}
      </SimpleGrid>

      <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 2fr) minmax(320px, 1fr)" }} gap={6}>
        <ShimmerCard>
          <Flex justify="space-between" align="center" mb={8}>
            <Box>
              <ShimmerBox h="24px" w="220px" mb={2} borderRadius="sm" />
              <ShimmerBox h="16px" w="180px" borderRadius="sm" />
            </Box>
            <ShimmerBox h="24px" w="80px" borderRadius="full" />
          </Flex>
          <Flex align="end" justify="space-between" h="260px" gap={4}>
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((_, i) => (
              <Stack key={i} justify="end" flex="1" spacing={3}>
                <ShimmerBox
                  w="100%"
                  maxW="44px"
                  h={`${20 + (i % 4) * 12}px`}
                  borderRadius="sm"
                />
                <ShimmerBox h="10px" w="80%" borderRadius="sm" alignSelf="center" />
              </Stack>
            ))}
          </Flex>
        </ShimmerCard>

        <Stack spacing={6}>
          {[0, 1].map((i) => (
            <ShimmerCard key={i}>
              <ShimmerBox h="24px" w="55%" mb={5} borderRadius="sm" />
              <Stack spacing={4}>
                {[0, 1, 2].map((j) => (
                  <Box key={j}>
                    <Flex justify="space-between" mb={2}>
                      <ShimmerBox h="16px" w="90px" borderRadius="sm" />
                      <ShimmerBox h="16px" w="36px" borderRadius="sm" />
                    </Flex>
                    <ShimmerBox h="6px" w="100%" borderRadius="full" />
                  </Box>
                ))}
              </Stack>
            </ShimmerCard>
          ))}
        </Stack>
      </Grid>
    </Stack>
  );
}

/* ─── Notes (note cards) ─────────────────────────────────────── */

function NotesShimmer() {
  return (
    <Stack spacing={5}>
      <Flex justify="space-between" align="center">
        <Box>
          <ShimmerBox h="32px" w="160px" mb={2} borderRadius="sm" />
          <ShimmerBox h="16px" w="280px" borderRadius="sm" />
        </Box>
        <ShimmerBox h="38px" w="100px" borderRadius="md" />
      </Flex>

      {[0, 1].map((i) => (
        <ShimmerCard key={i}>
          <Flex justify="space-between" align="center" mb={4}>
            <Box>
              <ShimmerBox h="20px" w="180px" mb={2} borderRadius="sm" />
              <ShimmerBox h="13px" w="120px" borderRadius="sm" />
            </Box>
            <ShimmerBox h="16px" w="130px" borderRadius="sm" />
          </Flex>
          <ShimmerBox h="16px" w="100%" mb={3} borderRadius="sm" />
          <ShimmerBox h="16px" w="95%" mb={3} borderRadius="sm" />
          <ShimmerBox h="16px" w="80%" mb={5} borderRadius="sm" />
          <Flex gap={2} pt={4} borderTopWidth="1px" borderColor={BORDER_COLOR}>
            <ShimmerBox h="26px" w="80px" borderRadius="full" />
            <ShimmerBox h="26px" w="90px" borderRadius="full" />
          </Flex>
        </ShimmerCard>
      ))}
    </Stack>
  );
}

/* ─── Public export ──────────────────────────────────────────── */

export function OrganizationTabShimmer({ tabKey }) {
  switch (tabKey) {
    case "overview":
      return <OverviewShimmer />;
    case "segmentation":
      return <CardGridShimmer />;
    case "contacts":
    case "jobs":
      return <TableShimmer />;
    case "locations":
    case "similarOrganizations":
      return <CardGridShimmer />;
    case "outreach":
      return <OutreachShimmer />;
    case "notes":
      return <NotesShimmer />;
    default:
      return <OverviewShimmer />;
  }
}
