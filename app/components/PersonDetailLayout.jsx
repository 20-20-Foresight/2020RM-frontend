import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Badge,
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
import { FiMail, FiPhone, FiPhoneCall, FiSettings } from "react-icons/fi";
import { buildPersonHeaderViewModel } from "../models/person-detail-view.mjs";

const BRAND_BLUE = "#0F4C81";
const PAGE_BG = "#F8FAFC";
const BORDER_COLOR = "#D7DFEC";
const SURFACE_TINT = "#EEF4FF";

/**
 * Renders one inline contact metadata item in the header row.
 * @param {{
 *   icon: import("react").ElementType,
 *   label: string,
 *   href?: string|null,
 *   isExternal?: boolean
 * }} props
 * @returns {JSX.Element|null}
 */
function ContactMetaItem({ icon, label, href = null, isExternal = false }) {
  if (!label) {
    return null;
  }

  const content = (
    <HStack
      spacing={2}
      color="gray.700"
      minH="32px"
      whiteSpace="nowrap"
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
        _hover={{ textDecoration: "none", color: BRAND_BLUE }}
      >
        {content}
      </ChakraLink>
    );
  }

  return content;
}

/**
 * Renders the static contact-local header and tab navigation.
 * @param {{
 *   data: {
 *     record: object|null,
 *     schema: object|null,
 *     locations: object[],
 *     relationships?: object[],
 *     error: string|null
 *   },
 *   tabs: Array<{key: string, label: string, to: string|null|undefined}>,
 *   activeTabKey: string,
 *   children?: import("react").ReactNode
 * }} props
 * @returns {JSX.Element}
 */
export function PersonDetailLayout({ data, tabs, activeTabKey, children = null }) {
  const header = buildPersonHeaderViewModel({
    record: data?.record || null,
    schema: data?.schema || null,
    locations: Array.isArray(data?.locations) ? data.locations : [],
    relationships: Array.isArray(data?.relationships) ? data.relationships : []
  });

  return (
    <VStack align="stretch" spacing={6} data-testid="person-detail-page">
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
            <HStack align="flex-start" spacing={{ base: 4, md: 6 }}>
              <Avatar
                name={header.name}
                src={header.avatarUrl || undefined}
                boxSize={{ base: "72px", md: "92px" }}
                borderRadius="20px"
                bg={SURFACE_TINT}
                color={BRAND_BLUE}
                borderWidth="1px"
                borderColor={BORDER_COLOR}
              />

              <Box>
                <Flex align="center" gap={4} wrap="wrap">
                  <Heading
                    as="h1"
                    size="xl"
                    color="gray.900"
                    lineHeight="shorter"
                  >
                    {header.name}
                  </Heading>

                  {header.linkedInUrl ? (
                    <ChakraLink
                      href={header.linkedInUrl}
                      isExternal
                      color="gray.500"
                      _hover={{ color: BRAND_BLUE }}
                    >
                      <Icon as={FaLinkedin} boxSize={6} />
                    </ChakraLink>
                  ) : null}
                </Flex>

                <Text mt={2} fontSize={{ base: "md", md: "lg" }} color="gray.700">
                  {header.subtitle}
                </Text>

                <HStack mt={4} spacing={3} flexWrap="wrap">
                  {header.tagLabels.map((label) => (
                    <Badge
                      key={label}
                      px={3}
                      py={1.5}
                      borderRadius="md"
                      colorScheme="blue"
                      variant="subtle"
                      textTransform="uppercase"
                      letterSpacing="0.08em"
                    >
                      {label}
                    </Badge>
                  ))}
                </HStack>

                <Flex mt={4} wrap="wrap" gap={{ base: 3, md: 5 }}>
                  <ContactMetaItem
                    icon={FiMail}
                    label={header.workEmail}
                    href={header.workEmail ? `mailto:${header.workEmail}` : null}
                  />
                  <ContactMetaItem icon={FiPhone} label={header.workPhone} />
                  <ContactMetaItem
                    icon={FiMail}
                    label={header.personalEmail}
                    href={header.personalEmail ? `mailto:${header.personalEmail}` : null}
                  />
                  <ContactMetaItem icon={FiPhoneCall} label={header.mobilePhone} />
                </Flex>
              </Box>
            </HStack>

            <IconButton
              aria-label="Contact options"
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
