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
  Divider
} from "@chakra-ui/react";
import { Link, NavLink } from "@remix-run/react";
import { HamburgerIcon } from "@chakra-ui/icons";
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

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: MdDashboard },
  { label: "Organizations", to: "/organizations", icon: MdBusiness },
  { label: "People", to: "/people", icon: MdPeople },
  { label: "Jobs", to: "/jobs", icon: MdWork },
  { label: "Marketing", to: "/marketing", icon: MdCampaign },
  { label: "Admin", to: "/admin", icon: MdSecurity, dividerAbove: true },
  { label: "Settings", to: "/settings", icon: MdSettings }
];

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      prefetch="intent"
      style={({ isActive }) => ({
        textDecoration: "none",
        width: "100%"
      })}
    >
      {({ isActive }) => (
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
      )}
    </NavLink>
  );
}

function SidebarContent({ user, onNavigate }) {
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
            <NavItem item={item} onNavigate={onNavigate} />
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

  return (
    <Flex minH="100vh" bg="gray.50" color="gray.900">
      <Box display={{ base: "none", md: "block" }} w="250px" bg="white" borderRightWidth="1px">
        <SidebarContent user={user} />
      </Box>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerContent>
          <SidebarContent user={user} onNavigate={onClose} />
        </DrawerContent>
      </Drawer>

      <Flex direction="column" flex="1">
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
          <Text fontWeight="semibold">Dashboard</Text>
          <Spacer />
        </Flex>
        <Box as="main" flex="1" p={{ base: 4, md: 6 }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}

