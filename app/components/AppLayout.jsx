import {
  Box,
  Flex,
  IconButton,
  Drawer,
  DrawerContent,
  useDisclosure,
  VStack,
  HStack,
  Text,
  Spacer,
  Avatar,
  Divider,
  Collapse
} from "@chakra-ui/react";
import { Link, NavLink, useFetchers, useLocation, useNavigation } from "@remix-run/react";
import { ChevronDownIcon, ChevronRightIcon, HamburgerIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import {
  MdBusiness,
  MdPeople,
  MdWork,
  MdCampaign,
  MdSecurity,
  MdSettings,
  MdDashboard
} from "react-icons/md";
import { FiLogOut } from "react-icons/fi";
import {
  navItems,
  isPathWithinItem,
  isNavItemActive,
  getExpandedNavItemKeys
} from "../models/navigation.mjs";
import {
  getAppLoadingOverlayState,
  isAdminDataPath
} from "../models/app-loading-state";
import { BlockingLoadingOverlay } from "./BlockingLoadingOverlay";

const iconByName = {
  dashboard: MdDashboard,
  business: MdBusiness,
  people: MdPeople,
  work: MdWork,
  campaign: MdCampaign,
  security: MdSecurity,
  settings: MdSettings
};

/**
 * Render one child navigation link.
 * @param {{
 *   item: {label: string, to: string},
 *   pathname: string,
 *   onNavigate?: () => void
 * }} props
 * @returns {JSX.Element}
 */
function SubNavItem({ item, pathname, onNavigate }) {
  const isActive = isPathWithinItem(item, pathname);

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      prefetch="intent"
      style={{
        textDecoration: "none",
        width: "100%"
      }}
    >
      <Flex
        align="center"
        ml={10}
        mt={1}
        px={3}
        py={2}
        borderRadius="md"
        bg={isActive ? "blue.50" : "transparent"}
        color={isActive ? "blue.700" : "gray.600"}
        _hover={{ bg: isActive ? "blue.100" : "gray.50" }}
        transition="background 0.2s ease"
      >
        <Text fontSize="sm" fontWeight={isActive ? "semibold" : "medium"}>
          {item.label}
        </Text>
      </Flex>
    </Link>
  );
}

/**
 * Render one top-level navigation item, optionally with subsections.
 * @param {{
 *   item: {key: string, label: string, to: string, icon: string, children?: object[]},
 *   pathname: string,
 *   expandedItems: Record<string, boolean>,
 *   onToggle: (key: string) => void,
 *   onNavigate?: () => void
 * }} props
 * @returns {JSX.Element}
 */
function NavItem({ item, pathname, expandedItems, onToggle, onNavigate }) {
  const Icon = iconByName[item.icon];
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isActive = isNavItemActive(item, pathname);
  const isExpanded = Boolean(expandedItems[item.key]);

  return (
    <Box>
      <HStack spacing={2} align="stretch">
        <Link
          to={item.to}
          onClick={onNavigate}
          prefetch="intent"
          style={{
            textDecoration: "none",
            width: "100%"
          }}
        >
          <Flex
            align="center"
            px={3}
            py={2}
            gap={3}
            borderRadius="md"
            bg={isActive ? "blue.600" : "transparent"}
            color={isActive ? "white" : "inherit"}
            _hover={{ bg: isActive ? "blue.700" : "gray.100" }}
            transition="background 0.2s ease"
          >
            <Icon />
            <Text fontWeight="medium">{item.label}</Text>
          </Flex>
        </Link>
        {hasChildren ? (
          <IconButton
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label} submenu`}
            icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            variant="ghost"
            size="sm"
            alignSelf="center"
            onClick={() => onToggle(item.key)}
          />
        ) : null}
      </HStack>
      {hasChildren ? (
        <Collapse in={isExpanded} animateOpacity>
          <Box pt={1}>
            {item.children.map((child) => (
              <SubNavItem key={child.key} item={child} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </Box>
        </Collapse>
      ) : null}
    </Box>
  );
}

function SidebarContent({ user, onNavigate }) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState(() =>
    Object.fromEntries(getExpandedNavItemKeys(location.pathname).map((key) => [key, true]))
  );

  useEffect(() => {
    const activeKeys = getExpandedNavItemKeys(location.pathname);
    if (!activeKeys.length) {
      return;
    }

    setExpandedItems((currentValue) => {
      const nextValue = { ...currentValue };
      let changed = false;

      for (const key of activeKeys) {
        if (!nextValue[key]) {
          nextValue[key] = true;
          changed = true;
        }
      }

      return changed ? nextValue : currentValue;
    });
  }, [location.pathname]);

  /**
   * Toggle one nav section.
   * @param {string} key
   */
  function handleToggle(key) {
    setExpandedItems((currentValue) => ({
      ...currentValue,
      [key]: !currentValue[key]
    }));
  }

  return (
    <Flex direction="column" height="100%" px={3} py={4} gap={2}>
      <Box px={3} pb={3}>
        <Link to="/dashboard" style={{ textDecoration: "none" }}>
          <Text fontWeight="bold" fontSize="lg">
            2020RM
          </Text>
        </Link>
        <Text fontSize="sm" color="gray.500">
          Salesforce-style objects
        </Text>
      </Box>
      <VStack align="stretch" spacing={1}>
        {navItems.map((item) => (
          <Box key={item.label}>
            {item.dividerAbove ? <Divider my={2} /> : null}
            <NavItem
              item={item}
              pathname={location.pathname}
              expandedItems={expandedItems}
              onToggle={handleToggle}
              onNavigate={onNavigate}
            />
          </Box>
        ))}
      </VStack>
      <Spacer />
      <Divider />
      <HStack px={2} py={2} spacing={3}>
        <Avatar size="sm" name={user?.firstName} />
        <Box>
          <Text fontWeight="semibold" fontSize="sm">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {user?.email}
          </Text>
        </Box>
      </HStack>
      <NavLink to="/auth/logout" style={{ textDecoration: "none" }}>
        <Flex align="center" gap={2} px={2} py={2} borderRadius="md" _hover={{ bg: "gray.100" }}>
          <FiLogOut />
          <Text fontWeight="medium">Logout</Text>
        </Flex>
      </NavLink>
    </Flex>
  );
}

export function AppLayout({ user, children }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const location = useLocation();
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const isAdminDataRoute = isAdminDataPath(location.pathname);
  const loadingState = getAppLoadingOverlayState({
    currentPathname: location.pathname,
    navigationState: navigation.state,
    navigationPathname: navigation.location?.pathname || null,
    fetcherStates: fetchers.map((fetcher) => fetcher.state)
  });
  const headerTitle = isAdminDataRoute ? "Data" : "Dashboard";

  return (
    <Flex minH="100vh" bg="gray.50" color="gray.900" position="relative">
      <Box display={{ base: "none", md: "block" }} w="250px" bg="white" borderRightWidth="1px">
        <SidebarContent user={user} />
      </Box>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerContent>
          <SidebarContent user={user} onNavigate={onClose} />
        </DrawerContent>
      </Drawer>

      <Flex direction="column" flex="1" minW="0">
        <Flex
          as="header"
          align="center"
          px={4}
          py={3}
          bg="white"
          borderBottomWidth="1px"
          shadow="sm"
          gap={3}
        >
          <IconButton
            display={{ base: "inline-flex", md: "none" }}
            aria-label="Open menu"
            icon={<HamburgerIcon />}
            onClick={onOpen}
            variant="ghost"
          />
          <Text fontWeight="semibold">{headerTitle}</Text>
          <Spacer />
        </Flex>
        <Box as="main" flex="1" minH="0" p={isAdminDataRoute ? 0 : { base: 4, md: 6 }}>
          {children}
        </Box>
      </Flex>

      {loadingState.isLoading && loadingState.label ? (
        <BlockingLoadingOverlay label={loadingState.label} />
      ) : null}
    </Flex>
  );
}
