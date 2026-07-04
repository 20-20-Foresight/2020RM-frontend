import {
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
  VStack,
  Badge,
} from "@chakra-ui/react";
import { Link } from "@remix-run/react";
import { FiArrowRight, FiTrendingUp } from "react-icons/fi";
import { MdBusiness, MdPerson, MdWork } from "react-icons/md";
import { ServiceCard } from "../components/ServiceCard";
import {
  ES_MILESTONES,
  EM_MILESTONES,
  MOCK_ES_SERVICES,
  MOCK_EM_SERVICES,
} from "../models/services-mock-data.mjs";

const BRAND_BLUE = "#0F4C81";
const BRAND_RED = "#D72638";
const BORDER_COLOR = "#D7DFEC";

function StatCard({ label, value, sublabel, colorScheme = "blue", icon }) {
  const bgMap = { blue: "#EEF4FF", red: "#FFF5F5", green: "#F0FFF4", orange: "#FFFAF0" };
  const colorMap = { blue: BRAND_BLUE, red: BRAND_RED, green: "#276749", orange: "#C05621" };
  return (
    <Box bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" px={5} py={4} shadow="sm">
      <HStack justify="space-between" align="flex-start">
        <Stat>
          <StatLabel color="gray.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.06em">
            {label}
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold" color={colorMap[colorScheme]} mt={1}>
            {value}
          </StatNumber>
          {sublabel && <Text fontSize="xs" color="gray.500" mt={1}>{sublabel}</Text>}
        </Stat>
        <Flex
          boxSize="38px"
          borderRadius="lg"
          bg={bgMap[colorScheme]}
          color={colorMap[colorScheme]}
          align="center"
          justify="center"
        >
          <Icon as={icon} boxSize={5} />
        </Flex>
      </HStack>
    </Box>
  );
}

function buildChevronClip(i, total, notch) {
  const first = i === 0;
  const last = i === total - 1;
  if (first && last) return "none";
  if (first) return `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%)`;
  if (last)  return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${notch}px 50%)`;
  return `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%, ${notch}px 50%)`;
}

function PipelineBar({ milestones, services, linkTo, label }) {
  const n = milestones.length;
  const countByPhase = milestones.map((_, i) =>
    services.filter((s) => s.activePhaseIndex === i).length
  );
  const total = services.length;
  const active = services.filter((s) => s.status === "active").length;
  const placed = services.filter((s) => s.status === "placed").length;
  const notch = 9;
  const hPx = 32;

  return (
    <Box bg="white" borderWidth="1px" borderColor={BORDER_COLOR} borderRadius="xl" overflow="hidden" shadow="sm">
      <Flex px={5} pt={4} pb={3} justify="space-between" align="center">
        <HStack spacing={3}>
          <Text fontWeight="bold" color="gray.800">{label}</Text>
          <HStack spacing={2}>
            <Badge colorScheme="green" variant="subtle" borderRadius="full" px={2}>{active} Active</Badge>
            <Badge colorScheme="blue" variant="subtle" borderRadius="full" px={2}>{placed} Placed</Badge>
          </HStack>
        </HStack>
        <Box
          as={Link}
          to={linkTo}
          fontSize="sm"
          fontWeight="semibold"
          color={BRAND_BLUE}
          _hover={{ textDecoration: "none", opacity: 0.8 }}
          display="flex"
          alignItems="center"
          gap={1}
        >
          View All <Icon as={FiArrowRight} boxSize={3.5} />
        </Box>
      </Flex>

      <Box px={5} pb={2}>
        <Box position="relative" w="full" h={`${hPx}px`}>
          {milestones.map((m, i) => {
            const count = countByPhase[i];
            const isLast = i === n - 1;
            const widthPct = 100 / n;
            const extraPx = isLast ? 0 : notch;
            const clip = buildChevronClip(i, n, notch);
            const bg = count > 0 ? BRAND_BLUE : "#CBD5E0";

            return (
              <Tooltip key={m.key} label={m.label} placement="top" hasArrow>
                <Box
                  position="absolute"
                  top={0}
                  left={`${i * widthPct}%`}
                  h="100%"
                  bg={bg}
                  zIndex={i}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor="default"
                  style={{
                    width: `calc(${widthPct}% + ${extraPx}px)`,
                    clipPath: clip,
                    paddingLeft: i === 0 ? "8px" : `${notch + 4}px`,
                    paddingRight: isLast ? "8px" : `${notch + 4}px`,
                  }}
                >
                  {count > 0 ? (
                    <Text fontSize="xs" color="white" fontWeight="bold">{count}</Text>
                  ) : (
                    <Text style={{ fontSize: "9px" }} color="white" opacity={0.4}>—</Text>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        <Flex w="full" mt={1}>
          {milestones.map((m) => (
            <Box key={m.key} flex="1" textAlign="center">
              <Text style={{ fontSize: "8px" }} color="gray.400" fontWeight="semibold" noOfLines={1}>
                {m.shortLabel}
              </Text>
            </Box>
          ))}
        </Flex>
      </Box>

      <Box px={5} pb={4} pt={1}>
        <Text fontSize="xs" color="gray.400">{total} total services tracked</Text>
      </Box>
    </Box>
  );
}

export default function ServicesIndexPage() {
  const activeEs = MOCK_ES_SERVICES.filter((s) => s.status === "active").length;
  const activeEm = MOCK_EM_SERVICES.filter((s) => s.status === "active").length;
  const placedMtd = [...MOCK_ES_SERVICES, ...MOCK_EM_SERVICES].filter((s) => s.status === "placed").length;
  const myServices = [...MOCK_ES_SERVICES, ...MOCK_EM_SERVICES].filter((s) =>
    s.recruiter === "Sarah K."
  );

  return (
    <VStack align="stretch" spacing={6}>
      <Flex justify="space-between" align="flex-start">
        <Box>
          <Heading size="lg" color="gray.900">Services</Heading>
          <Text color="gray.500" mt={1} fontSize="sm">
            Executive Search and Executive Management pipeline overview
          </Text>
        </Box>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <StatCard label="Active ES" value={activeEs} sublabel="Executive Search" colorScheme="blue" icon={MdBusiness} />
        <StatCard label="Active EM" value={activeEm} sublabel="Executive Management" colorScheme="red" icon={MdPerson} />
        <StatCard label="Placed MTD" value={placedMtd} sublabel="Month to date" colorScheme="green" icon={FiTrendingUp} />
        <StatCard label="Total Active" value={activeEs + activeEm} sublabel="Across all types" colorScheme="orange" icon={MdWork} />
      </SimpleGrid>

      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={4}>
        <PipelineBar
          milestones={ES_MILESTONES}
          services={MOCK_ES_SERVICES}
          linkTo="/jobs/all-es-jobs"
          label="ES Pipeline"
        />
        <PipelineBar
          milestones={EM_MILESTONES}
          services={MOCK_EM_SERVICES}
          linkTo="/jobs/all-em-jobs"
          label="EM Pipeline"
        />
      </Grid>

      <Box>
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="bold" color="gray.700" fontSize="sm" textTransform="uppercase" letterSpacing="0.06em">
            My Active Services
          </Text>
          <Box
            as={Link}
            to="/jobs/my-jobs"
            fontSize="sm"
            fontWeight="semibold"
            color={BRAND_BLUE}
            _hover={{ textDecoration: "none", opacity: 0.8 }}
            display="flex"
            alignItems="center"
            gap={1}
          >
            View All <Icon as={FiArrowRight} boxSize={3.5} />
          </Box>
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
          {myServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </SimpleGrid>
      </Box>
    </VStack>
  );
}
