import { Badge, Box, Flex, HStack, Icon, IconButton, Text } from "@chakra-ui/react";
import { useNavigate } from "@remix-run/react";
import { FiExternalLink, FiMapPin } from "react-icons/fi";
import { MdBusiness, MdPerson } from "react-icons/md";
import { MilestoneChevrons } from "./MilestoneChevrons";

const STATUS_COLORS = {
  active: "green",
  placed: "blue",
  lost: "red",
  on_hold: "orange",
  closed: "gray",
};

/**
 * Card representing one ES or EM service in a list view.
 * Clicking the card navigates within the app; the external-link button opens a new window.
 */
export function ServiceCard({ service }) {
  const navigate = useNavigate();
  const isEs = service.type === "es";
  const iconBg = isEs ? "#EEF4FF" : "#FFF5F5";
  const iconColor = isEs ? "#0F4C81" : "#C53030";

  function handleCardClick() {
    navigate(service.detailUrl);
  }

  function handleOpenNewWindow(e) {
    e.stopPropagation();
    window.open(service.detailUrl, "_blank", "noreferrer");
  }

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      shadow="sm"
      overflow="hidden"
      cursor="pointer"
      onClick={handleCardClick}
      _hover={{ shadow: "md", borderColor: "blue.300" }}
      transition="all 0.18s"
    >
      <Box px={5} pt={4} pb={3}>
        <Flex justify="space-between" align="flex-start" mb={3}>
          <HStack spacing={3} align="flex-start" flex={1} minW={0}>
            <Flex
              boxSize="38px"
              borderRadius="lg"
              bg={iconBg}
              color={iconColor}
              align="center"
              justify="center"
              flexShrink={0}
            >
              <Icon as={isEs ? MdBusiness : MdPerson} boxSize={5} />
            </Flex>

            <Box flex={1} minW={0}>
              <Text fontWeight="bold" color="gray.900" noOfLines={1} mb={1}>
                {service.title}
              </Text>
              <HStack spacing={2} mb={1}>
                <Badge
                  colorScheme={STATUS_COLORS[service.status] || "gray"}
                  fontSize="xs"
                  borderRadius="full"
                  px={2}
                  variant="subtle"
                >
                  {service.statusLabel}
                </Badge>
                <Badge
                  colorScheme={isEs ? "blue" : "red"}
                  fontSize="xs"
                  borderRadius="full"
                  px={2}
                  variant="outline"
                >
                  {isEs ? "ES" : "EM"}
                </Badge>
              </HStack>

              <HStack spacing={4} flexWrap="wrap">
                {service.subtitle && (
                  <HStack spacing={1}>
                    <Icon as={MdBusiness} color="gray.400" boxSize={3.5} />
                    <Text fontSize="sm" color="gray.600">{service.subtitle}</Text>
                  </HStack>
                )}
                {service.location && (
                  <HStack spacing={1}>
                    <Icon as={FiMapPin} color="gray.400" boxSize={3.5} />
                    <Text fontSize="sm" color="gray.500">{service.location}</Text>
                  </HStack>
                )}
              </HStack>
            </Box>
          </HStack>

          <IconButton
            aria-label="Open in new window"
            icon={<FiExternalLink />}
            size="sm"
            variant="ghost"
            colorScheme="blue"
            onClick={handleOpenNewWindow}
            flexShrink={0}
          />
        </Flex>

        <MilestoneChevrons
          milestones={service.milestones}
          activeIndex={service.activePhaseIndex}
          size="sm"
        />
      </Box>

      {service.nextStep && (
        <Box
          bg="gray.50"
          borderTopWidth="1px"
          borderColor="gray.100"
          px={5}
          py={2}
        >
          <HStack spacing={2}>
            <Text
              fontSize="xs"
              fontWeight="bold"
              color="gray.500"
              textTransform="uppercase"
              letterSpacing="0.06em"
              flexShrink={0}
            >
              Next:
            </Text>
            <Text fontSize="xs" color="gray.700" noOfLines={1}>
              {service.nextStep}
            </Text>
          </HStack>
        </Box>
      )}
    </Box>
  );
}
