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
  Image,
  Spacer,
  Divider,
  Collapse,
  Avatar
} from "@chakra-ui/react";
import { Link, NavLink, useFetchers, useLocation, useNavigation } from "@remix-run/react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, HamburgerIcon } from "@chakra-ui/icons";
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
  getNavigationItems,
  isPathWithinItem,
  isNavItemActive,
  getExpandedNavItemKeys
} from "../models/navigation.mjs";
import {
  getAppLoadingOverlayState,
  isAdminDataPath
} from "../models/app-loading-state";
import { BlockingLoadingOverlay } from "./BlockingLoadingOverlay";
import { syncSifTaxonomyToCache } from "../models/sif-taxonomy-cache";

const iconByName = {
  dashboard: MdDashboard,
  business: MdBusiness,
  people: MdPeople,
  work: MdWork,
  campaign: MdCampaign,
  security: MdSecurity,
  settings: MdSettings
};

const SIDEBAR_BG = "#16181d";
const SIDEBAR_BORDER = "rgba(255, 255, 255, 0.08)";
const SIDEBAR_TEXT = "rgba(255, 255, 255, 0.92)";
const SIDEBAR_MUTED = "rgba(255, 255, 255, 0.62)";
const BRAND_RED = "#D72638";
const LOGO_PATH = "/assets/2020-ets-horiz-logo-rgb-color-lg.png";
const HEADER_BG = "#000000";
const SIDEBAR_EXPANDED_WIDTH = "250px";
const SIDEBAR_COLLAPSED_WIDTH = "88px";
const APP_LAYOUT_CSS = `
  .app-shell-toggle {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .app-shell-sidebar {
    width: ${SIDEBAR_EXPANDED_WIDTH};
    transition: width 0.2s ease;
  }

  .app-shell-account {
    position: relative;
  }

  .app-shell-account > summary {
    list-style: none;
  }

  .app-shell-account > summary::-webkit-details-marker {
    display: none;
  }

  .app-shell-account-menu {
    display: none;
    position: absolute;
    right: 0;
    top: calc(100% + 0.5rem);
    width: 260px;
    background: white;
    color: #1A202C;
    border: 1px solid #E2E8F0;
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    z-index: 1000;
  }

  .app-shell-account[open] .app-shell-account-menu {
    display: block;
  }

  .app-shell-account-row {
    padding: 0.75rem;
  }

  .app-shell-account-label {
    font-size: 0.75rem;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .app-shell-account-divider {
    border-top: 1px solid #E2E8F0;
  }

  .app-shell-account-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    color: inherit;
    text-decoration: none;
  }

  .app-shell-account-link:hover {
    background: #F7FAFC;
  }

  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar {
    width: ${SIDEBAR_COLLAPSED_WIDTH};
  }

  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-label,
  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-section-toggle,
  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-subnav,
  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-collapse-text,
  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-collapse-left {
    display: none !important;
  }

  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-nav-link {
    justify-content: center;
  }

  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-nav-link,
  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-collapse-control {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  #app-shell-sidebar-toggle:checked ~ .app-shell-body .app-shell-sidebar .sidebar-collapse-control {
    justify-content: center;
  }

  #app-shell-sidebar-toggle:not(:checked) ~ .app-shell-body .app-shell-sidebar .sidebar-collapse-right {
    display: none !important;
  }
`;

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
        bg={isActive ? "rgba(215, 38, 56, 0.14)" : "transparent"}
        color={isActive ? "white" : SIDEBAR_MUTED}
        _hover={{ bg: isActive ? "rgba(215, 38, 56, 0.2)" : "rgba(255, 255, 255, 0.06)" }}
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
  const linkContent = (
    <Flex
      className="sidebar-nav-link"
      align="center"
      justify="flex-start"
      px={3}
      py={2}
      gap={3}
      borderRadius="md"
      bg={isActive ? BRAND_RED : "transparent"}
      color={isActive ? "white" : SIDEBAR_TEXT}
      _hover={{ bg: isActive ? "#bb2332" : "rgba(255, 255, 255, 0.06)" }}
      transition="background 0.2s ease"
    >
      <Icon />
      <Text className="sidebar-label" fontWeight="medium">
        {item.label}
      </Text>
    </Flex>
  );

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
          {linkContent}
        </Link>
        {hasChildren ? (
          <IconButton
            className="sidebar-section-toggle"
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
        <Collapse in={isExpanded} animateOpacity className="sidebar-subnav">
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

/**
 * Render the collapsible application sidebar.
 * @param {{
 *   meta: object,
 *   onNavigate?: () => void
 * }} props
 * @returns {JSX.Element}
 */
function SidebarContent({ meta, onNavigate }) {
  const location = useLocation();
  const navItems = getNavigationItems(meta);
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
      <VStack align="stretch" spacing={1}>
        {navItems.map((item) => (
          <Box key={item.label}>
            {item.dividerAbove ? <Divider my={2} borderColor={SIDEBAR_BORDER} /> : null}
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
      <Divider borderColor={SIDEBAR_BORDER} />
      <HStack
        as="label"
        htmlFor="app-shell-sidebar-toggle"
        className="sidebar-collapse-control"
        px={3}
        py={2}
        borderRadius="md"
        cursor="pointer"
        justifyContent="flex-start"
        spacing={2}
        color={SIDEBAR_TEXT}
        _hover={{ bg: "rgba(255, 255, 255, 0.06)" }}
        transition="background 0.2s ease"
      >
        <ChevronLeftIcon className="sidebar-collapse-left" />
        <Text className="sidebar-collapse-text" fontWeight="medium">
          Collapse sidebar
        </Text>
        <ChevronRightIcon className="sidebar-collapse-right" />
      </HStack>
    </Flex>
  );
}

export function AppLayout({ user, meta, children }) {
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
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "User";
  const accountMenuLabel = `Open account menu for ${displayName}`;

  useEffect(() => {
    /**
     * Keep the SIF taxonomy cached in IndexedDB for reuse across the app.
     * Failures stay silent because the live routes still load through the BFF.
     */
    async function syncNow() {
      try {
        await syncSifTaxonomyToCache();
      } catch (_error) {}
    }

    void syncNow();

    const intervalId = window.setInterval(() => {
      void syncNow();
    }, 15 * 60 * 1000);

    const handleWindowFocus = () => {
      void syncNow();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  return (
    <Flex minH="100vh" bg="gray.50" color="gray.900" position="relative" direction="column">
      <style>{APP_LAYOUT_CSS}</style>
      <input id="app-shell-sidebar-toggle" className="app-shell-toggle" type="checkbox" />
      <Flex
        as="header"
        align="center"
        px={{ base: 4, md: 6 }}
        py={4}
        bg={HEADER_BG}
        color={SIDEBAR_TEXT}
        borderBottomWidth="1px"
        borderBottomColor={SIDEBAR_BORDER}
        gap={4}
      >
        <IconButton
          display={{ base: "inline-flex", md: "none" }}
          aria-label="Open menu"
          icon={<HamburgerIcon />}
          onClick={onOpen}
          variant="ghost"
          color={SIDEBAR_TEXT}
          _hover={{ bg: "rgba(255, 255, 255, 0.06)" }}
        />
        <Link to="/dashboard" style={{ textDecoration: "none" }}>
          <Image
            src={LOGO_PATH}
            alt="2020 Foresight Executive Talent Solutions"
            h={{ base: "34px", md: "40px" }}
            maxW={{ base: "220px", md: "340px" }}
            objectFit="contain"
          />
        </Link>
        <Spacer />
        <Box
          as="details"
          className="app-shell-account"
          sx={{
            "&[open] summary": {
              bg: "rgba(255, 255, 255, 0.06)"
            }
          }}
        >
          <HStack
            as="summary"
            aria-label={accountMenuLabel}
            listStyleType="none"
            px={2}
            h="40px"
            minW="40px"
            borderRadius="full"
            color={SIDEBAR_TEXT}
            spacing={2}
            cursor="pointer"
            _hover={{ bg: "rgba(255, 255, 255, 0.06)" }}
          >
            <Avatar size="sm" name={displayName} bg={BRAND_RED} color="white" />
            <ChevronDownIcon />
          </HStack>
          <Box className="app-shell-account-menu">
            <Box className="app-shell-account-row">
              <Text fontWeight="semibold">{displayName}</Text>
              {user?.email ? (
                <Text fontSize="sm" color="gray.600">
                  {user.email}
                </Text>
              ) : null}
            </Box>
            {meta?.personas?.current ? (
              <Box className="app-shell-account-row">
                <Text className="app-shell-account-label">
                  Persona
                </Text>
                <Text fontSize="sm">{meta.personas.current}</Text>
              </Box>
            ) : null}
            <Box className="app-shell-account-divider" />
            <NavLink to="/auth/logout" className="app-shell-account-link">
              <FiLogOut />
              <Text fontWeight="medium">Logout</Text>
            </NavLink>
          </Box>
        </Box>
      </Flex>

      <Flex flex="1" minH="0" className="app-shell-body">
        <Box
          className="app-shell-sidebar"
          display={{ base: "none", md: "block" }}
          bg={SIDEBAR_BG}
          color={SIDEBAR_TEXT}
          borderRightWidth="1px"
          borderRightColor={SIDEBAR_BORDER}
        >
          <SidebarContent meta={meta} />
        </Box>

        <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
          <DrawerContent bg={SIDEBAR_BG} color={SIDEBAR_TEXT}>
            <SidebarContent meta={meta} onNavigate={onClose} />
          </DrawerContent>
        </Drawer>

        <Flex
          direction="column"
          flex="1"
          minW="0"
        >
          <Box as="main" flex="1" minH="0" p={isAdminDataRoute ? 0 : { base: 4, md: 6 }}>
            {children}
          </Box>
        </Flex>
      </Flex>

      {loadingState.isLoading && loadingState.label ? (
        <BlockingLoadingOverlay label={loadingState.label} />
      ) : null}
    </Flex>
  );
}
