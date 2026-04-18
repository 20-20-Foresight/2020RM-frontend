import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link as ChakraLink,
  Text,
  VStack
} from "@chakra-ui/react";
import { Link as RemixLink } from "@remix-run/react";
import { FaLinkedin } from "react-icons/fa";
import { FiGlobe, FiMapPin, FiPhone, FiSettings } from "react-icons/fi";
import { MdBusiness } from "react-icons/md";
import { buildOrganizationHeaderViewModel } from "../models/organization-detail-view";

const BRAND_BLUE = "#0F4C81";
const PAGE_BG = "#F8FAFC";
const BORDER_COLOR = "#D7DFEC";
const SURFACE_TINT = "#EEF4FF";

/**
 * Renders one inline organization metadata item in the header row.
 * @param {{
 *   icon: import("react").ElementType,
 *   label: string,
 *   href?: string|null,
 *   isExternal?: boolean
 * }} props
 * @returns {JSX.Element}
 */
function HeaderMetaItem({ icon, label, href = null, isExternal = false }) {
  if (!label) {
    return null;
  }

  const content = (
    <HStack
      spacing={2}
      px={3}
      py={2}
      borderRadius="full"
      bg="gray.50"
      color="gray.700"
      borderWidth="1px"
      borderColor="gray.100"
      minH="40px"
    >
      <Icon as={icon} color={BRAND_BLUE} />
      <Text fontSize="sm" fontWeight="medium">
        {label}
      </Text>
    </HStack>
  );

  if (href) {
    return (
      <ChakraLink
        href={href}
        isExternal={isExternal}
        _hover={{ textDecoration: "none" }}
      >
        {content}
      </ChakraLink>
    );
  }

  return content;
}

/**
 * Renders the static organization-local header and tab navigation.
 * @param {{
 *   data: {
 *     record: object|null,
 *     schema: object|null,
 *     locations: object[],
 *     error: string|null,
 *     statusExplained: string
 *   },
 *   tabs: Array<{key: string, label: string, to: string|null|undefined}>,
 *   activeTabKey: string,
 *   children?: import("react").ReactNode
 * }} props
 * @returns {JSX.Element}
 */
export function OrganizationDetailLayout({ data, tabs, activeTabKey, children = null }) {
  const header = buildOrganizationHeaderViewModel({
    record: data?.record || null,
    schema: data?.schema || null,
    locations: Array.isArray(data?.locations) ? data.locations : []
  });

  return (
    <VStack align="stretch" spacing={6} data-testid="organization-detail-page">
      <Box
        bg="white"
        borderWidth="1px"
        borderColor={BORDER_COLOR}
        borderRadius="24px"
        overflow="hidden"
        shadow="sm"
      >
        <Box px={{ base: 5, md: 8 }} pt={{ base: 5, md: 7 }} pb={5}>
          <Flex
            align={{ base: "flex-start", lg: "center" }}
            justify="space-between"
            gap={5}
            direction={{ base: "column", lg: "row" }}
          >
            <HStack align="flex-start" spacing={{ base: 4, md: 5 }}>
              <Flex
                boxSize={{ base: "68px", md: "84px" }}
                borderRadius="20px"
                bg={SURFACE_TINT}
                borderWidth="1px"
                borderColor={BORDER_COLOR}
                color={BRAND_BLUE}
                align="center"
                justify="center"
                position="relative"
                overflow="hidden"
              >
                <Icon as={MdBusiness} boxSize={{ base: 8, md: 10 }} />
                <Text
                  position="absolute"
                  bottom={2}
                  right={2}
                  fontSize="11px"
                  fontWeight="bold"
                  letterSpacing="0.08em"
                  color={BRAND_BLUE}
                >
                  {header.initials}
                </Text>
              </Flex>

              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="0.08em"
                  color="gray.500"
                >
                  Organization
                </Text>
                <Heading
                  as="h1"
                  size="xl"
                  mt={1}
                  color="gray.900"
                  lineHeight="shorter"
                >
                  {header.name}
                </Heading>
                <Text mt={2} color="gray.600">
                  {data?.statusExplained || "Organization detail loaded."}
                </Text>

                <Flex mt={4} wrap="wrap" gap={3}>
                  <HeaderMetaItem icon={FiMapPin} label={header.hqLabel} />
                  <HeaderMetaItem icon={FiPhone} label={header.phone || "Phone unavailable"} />
                  {header.websiteUrl ? (
                    <HeaderMetaItem
                      icon={FiGlobe}
                      label={header.websiteLabel || "Website"}
                      href={header.websiteUrl}
                      isExternal
                    />
                  ) : null}
                  {header.linkedInUrl ? (
                    <HeaderMetaItem
                      icon={FaLinkedin}
                      label="LinkedIn"
                      href={header.linkedInUrl}
                      isExternal
                    />
                  ) : null}
                </Flex>
              </Box>
            </HStack>

            <IconButton
              aria-label="Organization options"
              icon={<FiSettings />}
              variant="outline"
              colorScheme="gray"
              borderColor={BORDER_COLOR}
              color={BRAND_BLUE}
              alignSelf={{ base: "stretch", lg: "flex-start" }}
              isDisabled
            />
          </Flex>
        </Box>

        <Box bg={PAGE_BG} borderTopWidth="1px" borderColor={BORDER_COLOR}>
          <HStack
            spacing={{ base: 1, md: 3 }}
            px={{ base: 3, md: 6 }}
            overflowX="auto"
            whiteSpace="nowrap"
          >
            {tabs.map((tab) => {
              const isActive = tab.key === activeTabKey;

              return (
                <ChakraLink
                  key={tab.key}
                  as={RemixLink}
                  to={tab.to || "#"}
                  px={3}
                  py={4}
                  fontSize="sm"
                  fontWeight={isActive ? "bold" : "semibold"}
                  color={isActive ? BRAND_BLUE : "gray.600"}
                  borderBottomWidth="3px"
                  borderColor={isActive ? BRAND_BLUE : "transparent"}
                  _hover={{
                    textDecoration: "none",
                    color: isActive ? BRAND_BLUE : "gray.800"
                  }}
                >
                  {tab.label}
                </ChakraLink>
              );
            })}
          </HStack>
        </Box>
      </Box>

      {data?.error ? (
        <Alert status="error" borderRadius="20px">
          <AlertIcon />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      ) : null}

      {children}
    </VStack>
  );
}
