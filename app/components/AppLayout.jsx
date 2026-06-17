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
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
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
  MdDashboard,
  MdSchool,
  MdTableChart,
  MdPalette,
  MdBuild,
  MdFormatListBulleted
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
} from "../models/app-loading-state.mjs";
import { BlockingLoadingOverlay } from "./BlockingLoadingOverlay";

const iconByName = {
  dashboard: MdDashboard,
  business: MdBusiness,
  people: MdPeople,
  work: MdWork,
  campaign: MdCampaign,
  security: MdSecurity,
  settings: MdSettings,
  school: MdSchool,
  table_chart: MdTableChart,
  format_list_bulleted: MdFormatListBulleted,
  palette: MdPalette,
  build: MdBuild
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

/**
 * Render one child navigation link.
 * @param {{
 *   item: {label: string, to: string},
 *   pathname: string,
 *   onNavigate?: () => void,
 *   isCollapsed?: boolean
 * }} props
 * @returns {JSX.Element}
 */
function SubNavItem({ item, pathname, onNavigate, isCollapsed = false }) {
  const isActive = isPathWithinItem(item, pathname);

  if (isCollapsed) {
    return null;
  }

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
 *   onNavigate?: () => void,
 *   isCollapsed?: boolean
 * }} props
 * @returns {JSX.Element}
 */
function NavItem({ item, pathname, expandedItems, onToggle, onNavigate, isCollapsed = false }) {
  const Icon = iconByName[item.icon];
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isActive = isNavItemActive(item, pathname);
  const isExpanded = Boolean(expandedItems[item.key]);
  const linkContent = (
    <Flex
      className="sidebar-nav-link"
      align="center"
      justify={isCollapsed ? "center" : "flex-start"}
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
      {isCollapsed ? null : (
        <Text className="sidebar-label" fontWeight="medium">
          {item.label}
        </Text>
      )}
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
            display={isCollapsed ? "none" : "inline-flex"}
            onClick={() => onToggle(item.key)}
          />
        ) : null}
      </HStack>
      {hasChildren ? (
        <Collapse in={isExpanded} animateOpacity className="sidebar-subnav">
          <Box pt={1}>
            {item.children.map((child) => (
              <SubNavItem
                key={child.key}
                item={child}
                pathname={pathname}
                onNavigate={onNavigate}
                isCollapsed={isCollapsed}
              />
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
 *   onNavigate?: () => void,
 *   isCollapsed?: boolean,
 *   onToggleCollapse?: () => void
 * }} props
 * @returns {JSX.Element}
 */
function SidebarContent({ meta, onNavigate, isCollapsed = false, onToggleCollapse }) {
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
              isCollapsed={isCollapsed}
            />
          </Box>
        ))}
      </VStack>
      <Spacer />
      <Divider borderColor={SIDEBAR_BORDER} />
      <HStack
        px={3}
        py={2}
        borderRadius="md"
        justifyContent={isCollapsed ? "center" : "flex-start"}
        spacing={2}
        color={SIDEBAR_TEXT}
        _hover={{ bg: "rgba(255, 255, 255, 0.06)" }}
        transition="background 0.2s ease"
        as="button"
        type="button"
        onClick={onToggleCollapse}
      >
        {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        {isCollapsed ? null : (
          <Text fontWeight="medium">
            Collapse sidebar
          </Text>
        )}
      </HStack>
    </Flex>
  );
}

export function AppLayout({ user, meta, children }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const isAdminDataRoute = isAdminDataPath(location.pathname);
  const loadingState = getAppLoadingOverlayState({
    currentPathname: location.pathname,
    navigationState: navigation.state,
    navigationPathname: navigation.location?.pathname || null,
    fetchers: fetchers.map((fetcher) => ({
      state: fetcher.state,
      formMethod: fetcher.formMethod || "",
      formAction: fetcher.formAction || null
    }))
  });
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "User";
  const accountMenuLabel = `Open account menu for ${displayName}`;

  return (
    <Flex minH="100vh" bg="gray.50" color="gray.900" position="relative" direction="column">
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
        <Menu>
          <MenuButton
            as={IconButton}
            aria-label={accountMenuLabel}
            variant="ghost"
            color={SIDEBAR_TEXT}
            _hover={{ bg: "rgba(255, 255, 255, 0.06)" }}
            icon={<Avatar size="sm" name={displayName} bg={BRAND_RED} color="white" />}
          />
          <MenuList>
            <Box px={3} py={3}>
              <Text fontWeight="semibold">{displayName}</Text>
              {user?.email ? (
                <Text fontSize="sm" color="gray.600">
                  {user.email}
                </Text>
              ) : null}
              {meta?.personas?.current ? (
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Persona: {meta.personas.current}
                </Text>
              ) : null}
            </Box>
            <MenuItem as={NavLink} to="/auth/logout" icon={<FiLogOut />}>
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      <Flex flex="1" minH="0" className="app-shell-body">
        <Box
          display={{ base: "none", md: "block" }}
          bg={SIDEBAR_BG}
          color={SIDEBAR_TEXT}
          borderRightWidth="1px"
          borderRightColor={SIDEBAR_BORDER}
          width={isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH}
          transition="width 0.2s ease"
        >
          <SidebarContent
            meta={meta}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
          />
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

      {/* Thin progress bar: fires on every navigation state transition,
          catching cases where the overlay is suppressed or the transition
          resolves before a full render cycle completes. */}
      {navigation.state !== "idle" ? (
        <Box
          position="fixed"
          top={0}
          left={0}
          h="3px"
          zIndex={9999}
          bg={BRAND_RED}
          sx={{
            "@keyframes navProgress": {
              "0%":   { width: "0%",   opacity: 1 },
              "60%":  { width: "85%",  opacity: 1 },
              "100%": { width: "95%",  opacity: 1 }
            },
            animation: "navProgress 8s ease-out forwards"
          }}
        />
      ) : null}

      {loadingState.isLoading && loadingState.label ? (
        <BlockingLoadingOverlay label={loadingState.label} />
      ) : null}
    </Flex>
  );
}
