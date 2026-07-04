import {
  Avatar,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Select,
  SimpleGrid,
  Switch,
  Text,
  VStack,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import { Link as RemixLink } from "@remix-run/react";
import { useState } from "react";
import { MdSearch, MdTune, MdMail, MdPhone, MdOpenInNew, MdBusiness, MdSchedule } from "react-icons/md";
import { SurfaceCard } from "./ui/atoms/SurfaceCard";
import { SectionLabel } from "./ui/atoms/SectionLabel";

const POSITION_LEVELS = [
  { value: "", label: "Any level" },
  { value: "c-suite", label: "C-Suite" },
  { value: "executive", label: "Executive" },
  { value: "mid-senior", label: "Mid-Senior" },
  { value: "manager", label: "Manager" },
  { value: "other", label: "Other" }
];

const MOCK_RECENTLY_VIEWED = [
  {
    id: "p1",
    name: "Alexandra Chen",
    title: "Chief Investment Officer",
    company: "Meridian Capital Partners",
    location: "New York, NY",
    skills: ["Private Equity", "Portfolio Management", "M&A"],
    lastContacted: "2026-04-18",
    email: "a.chen@meridian.com",
    eligibleForCampaigns: true,
    initials: "AC",
    colorScheme: "blue"
  },
  {
    id: "p2",
    name: "Marcus Delgado",
    title: "Managing Director",
    company: "Vortex Infrastructure Fund",
    location: "Chicago, IL",
    skills: ["Infrastructure", "Real Assets", "LBO"],
    lastContacted: "2026-04-15",
    email: "m.delgado@vortex.com",
    eligibleForCampaigns: true,
    initials: "MD",
    colorScheme: "purple"
  },
  {
    id: "p3",
    name: "Priya Nair",
    title: "VP of Business Development",
    company: "Sequoia Growth Advisors",
    location: "San Francisco, CA",
    skills: ["Venture Capital", "Growth Equity", "SaaS"],
    lastContacted: "2026-04-10",
    email: "p.nair@sequoiagrowth.com",
    eligibleForCampaigns: false,
    initials: "PN",
    colorScheme: "green"
  },
  {
    id: "p4",
    name: "Thomas Wicker",
    title: "Senior Portfolio Manager",
    company: "Blackstone Asset Management",
    location: "London, UK",
    skills: ["Hedge Funds", "Derivatives", "Fixed Income"],
    lastContacted: "2026-04-08",
    email: "t.wicker@blackstone.com",
    eligibleForCampaigns: true,
    initials: "TW",
    colorScheme: "orange"
  },
  {
    id: "p5",
    name: "Yuki Tanaka",
    title: "Director, Fund of Funds",
    company: "Pacific Alternatives",
    location: "Tokyo, JP",
    skills: ["Fund of Funds", "LP Relations", "APAC Markets"],
    lastContacted: "2026-04-05",
    email: "y.tanaka@pacalt.jp",
    eligibleForCampaigns: true,
    initials: "YT",
    colorScheme: "teal"
  },
  {
    id: "p6",
    name: "Isabelle Moreau",
    title: "Partner",
    company: "Altaïr Ventures",
    location: "Paris, FR",
    skills: ["Early Stage", "DeepTech", "Climate"],
    lastContacted: "2026-04-02",
    email: "i.moreau@altair.vc",
    eligibleForCampaigns: false,
    initials: "IM",
    colorScheme: "red"
  },
  {
    id: "p7",
    name: "David Okonkwo",
    title: "Head of Investor Relations",
    company: "Sentry Real Estate Capital",
    location: "Atlanta, GA",
    skills: ["Real Estate", "Investor Relations", "CRE"],
    lastContacted: "2026-03-28",
    email: "d.okonkwo@sentryrecap.com",
    eligibleForCampaigns: true,
    initials: "DO",
    colorScheme: "cyan"
  },
  {
    id: "p8",
    name: "Rachel Hoffmann",
    title: "General Partner",
    company: "Cornerstone Growth Fund",
    location: "Austin, TX",
    skills: ["Growth Equity", "B2B SaaS", "Fintech"],
    lastContacted: "2026-03-25",
    email: "r.hoffmann@cornerstonegf.com",
    eligibleForCampaigns: true,
    initials: "RH",
    colorScheme: "pink"
  },
  {
    id: "p9",
    name: "James Calloway",
    title: "Senior Advisor",
    company: "Sterling Bridge Capital",
    location: "Boston, MA",
    skills: ["Restructuring", "Credit", "Special Situations"],
    lastContacted: "2026-03-20",
    email: "j.calloway@sterlingbridge.com",
    eligibleForCampaigns: false,
    initials: "JC",
    colorScheme: "yellow"
  }
];

function formatRelativeDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date("2026-04-23");
  const diffDays = Math.round((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)} weeks ago`;
  return `${Math.round(diffDays / 30)} months ago`;
}

function ContactCard({ contact }) {
  return (
    <Box
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
      p={4}
      _hover={{ borderColor: "blue.300", boxShadow: "md" }}
      transition="all 0.15s ease"
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <HStack align="start" spacing={3}>
        <Avatar
          size="md"
          name={contact.name}
          bg={`${contact.colorScheme}.100`}
          color={`${contact.colorScheme}.700`}
          fontWeight="semibold"
          flexShrink={0}
        />
        <Box flex={1} minW={0}>
          <Link
            as={RemixLink}
            to={`/person/${contact.id}`}
            fontWeight="semibold"
            color="gray.900"
            fontSize="sm"
            _hover={{ color: "blue.600", textDecoration: "none" }}
            display="block"
            isTruncated
          >
            {contact.name}
          </Link>
          <Text fontSize="xs" color="gray.600" isTruncated>{contact.title}</Text>
          <HStack spacing={1} mt={0.5}>
            <Icon as={MdBusiness} boxSize={3} color="gray.400" flexShrink={0} />
            <Text fontSize="xs" color="gray.500" isTruncated>{contact.company}</Text>
          </HStack>
        </Box>
      </HStack>

      <Divider />

      <VStack align="stretch" spacing={1.5}>
        <HStack spacing={1.5}>
          <Icon as={MdSchedule} boxSize={3} color="gray.400" flexShrink={0} />
          <Text fontSize="xs" color="gray.500">
            Last contacted{" "}
            <Text as="span" color="gray.700" fontWeight="medium">
              {formatRelativeDate(contact.lastContacted)}
            </Text>
          </Text>
        </HStack>
        <HStack spacing={1.5}>
          <Icon as={MdMail} boxSize={3} color="gray.400" flexShrink={0} />
          <Text fontSize="xs" color="gray.500" isTruncated>{contact.email}</Text>
        </HStack>
      </VStack>

      <Wrap spacing={1}>
        {contact.skills.slice(0, 3).map((skill) => (
          <WrapItem key={skill}>
            <Badge
              colorScheme="gray"
              variant="subtle"
              fontSize="2xs"
              px={1.5}
              py={0.5}
              borderRadius="md"
            >
              {skill}
            </Badge>
          </WrapItem>
        ))}
      </Wrap>

      <HStack spacing={2} mt="auto">
        <Button
          as={RemixLink}
          to={`/person/${contact.id}`}
          size="xs"
          variant="ghost"
          colorScheme="blue"
          leftIcon={<Icon as={MdOpenInNew} boxSize={3} />}
          flex={1}
        >
          View Profile
        </Button>
        {contact.eligibleForCampaigns && (
          <Badge colorScheme="green" variant="subtle" fontSize="2xs" px={1.5}>
            Campaign Ready
          </Badge>
        )}
      </HStack>
    </Box>
  );
}

function BasicSearchForm({ onSearch }) {
  return (
    <InputGroup size="lg">
      <InputLeftElement pointerEvents="none">
        <Icon as={MdSearch} color="gray.400" boxSize={5} />
      </InputLeftElement>
      <Input
        name="q"
        placeholder="Search contacts by name, company, title, or email…"
        bg="white"
        borderColor="gray.300"
        borderRadius="xl"
        _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
        _placeholder={{ color: "gray.400" }}
        fontSize="md"
      />
    </InputGroup>
  );
}

function AdvancedSearchForm({ industries, focuses }) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Keyword</FormLabel>
        <Input name="keyword" placeholder="Any keyword…" size="sm" borderRadius="lg" />
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Company Industry</FormLabel>
        <Select name="industry" placeholder="Any industry" size="sm" borderRadius="lg">
          {industries.map((ind) => (
            <option key={ind.value} value={ind.value}>{ind.label}</option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Company Focus</FormLabel>
        <Select name="focus" placeholder="Any focus" size="sm" borderRadius="lg">
          {focuses.map((foc) => (
            <option key={foc.value} value={foc.value}>{foc.label}</option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Skills</FormLabel>
        <Input name="skills" placeholder="e.g. Private Equity, SaaS…" size="sm" borderRadius="lg" />
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Location</FormLabel>
        <Grid templateColumns="1fr 1fr" gap={2}>
          <Input name="city" placeholder="City" size="sm" borderRadius="lg" />
          <Input name="stateProvince" placeholder="State / Province" size="sm" borderRadius="lg" />
        </Grid>
        <Input name="country" placeholder="Country" size="sm" borderRadius="lg" mt={2} />
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Position Level</FormLabel>
        <Select name="positionLevel" size="sm" borderRadius="lg">
          {POSITION_LEVELS.map((lvl) => (
            <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Title</FormLabel>
        <Input name="title" placeholder="e.g. Managing Director…" size="sm" borderRadius="lg" />
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Last Contacted</FormLabel>
        <Input name="lastContacted" type="date" size="sm" borderRadius="lg" />
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Last Responded</FormLabel>
        <Input name="lastResponded" type="date" size="sm" borderRadius="lg" />
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Created Date</FormLabel>
        <Input name="createdDate" type="date" size="sm" borderRadius="lg" />
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm" color="gray.700" fontWeight="medium">Eligible for Campaigns</FormLabel>
        <HStack mt={1} spacing={3}>
          <Switch name="eligibleForCampaigns" defaultChecked colorScheme="blue" />
          <Text fontSize="sm" color="gray.600">Only show eligible contacts</Text>
        </HStack>
      </FormControl>
    </SimpleGrid>
  );
}

/**
 * @param {{
 *   industries: {value: string, label: string}[],
 *   focuses: {value: string, label: string}[]
 * }} props
 */
export function PeopleSearchPage({ industries, focuses }) {
  const [isAdvanced, setIsAdvanced] = useState(false);

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="md" color="gray.900">Search Contacts</Heading>
        <Text fontSize="sm" color="gray.500" mt={1}>
          Find people in your network
        </Text>
      </Box>

      <SurfaceCard>
        <VStack align="stretch" spacing={4}>
          <BasicSearchForm />

          <HStack justify="space-between" align="center">
            <Button
              size="sm"
              variant="ghost"
              colorScheme={isAdvanced ? "blue" : "gray"}
              leftIcon={<Icon as={MdTune} boxSize={4} />}
              onClick={() => setIsAdvanced(!isAdvanced)}
              px={2}
            >
              {isAdvanced ? "Hide Advanced Filters" : "Advanced Search"}
            </Button>
            {isAdvanced && (
              <Button size="sm" variant="ghost" colorScheme="gray" fontSize="xs">
                Clear all filters
              </Button>
            )}
          </HStack>

          <Collapse in={isAdvanced} animateOpacity>
            <Box pt={2} borderTopWidth="1px" borderColor="gray.100">
              <AdvancedSearchForm industries={industries} focuses={focuses} />
            </Box>
          </Collapse>

          <HStack justify="flex-end" spacing={3}>
            <Button type="reset" size="sm" variant="ghost" colorScheme="gray">
              Clear
            </Button>
            <Button
              type="submit"
              size="sm"
              colorScheme="blue"
              leftIcon={<Icon as={MdSearch} boxSize={4} />}
              minW="120px"
            >
              Search Contacts
            </Button>
          </HStack>
        </VStack>
      </SurfaceCard>

      <Box>
        <HStack justify="space-between" align="center" mb={4}>
          <SectionLabel>Recently Viewed</SectionLabel>
          <Text fontSize="xs" color="gray.400">
            {MOCK_RECENTLY_VIEWED.length} contacts
          </Text>
        </HStack>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
          {MOCK_RECENTLY_VIEWED.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </SimpleGrid>
      </Box>
    </VStack>
  );
}
