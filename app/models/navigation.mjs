import { designPages } from "./design-pages.mjs";
import { listAdminDataCategories } from "./admin-data-categories.mjs";
import { toolsConfig } from "./tools-config.mjs";

/**
 * Sidebar navigation model for the application shell.
 */
export const navItems = [
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/dashboard",
    icon: "dashboard"
  },
  {
    key: "organizations",
    label: "Organizations",
    to: "/organizations",
    icon: "business",
    children: [
      {
        key: "organizations-clients",
        label: "Clients",
        to: "/organizations/clients"
      },
      {
        key: "organizations-advanced-search",
        label: "Advanced Search",
        to: "/organizations/advanced-search"
      }
    ]
  },
  {
    key: "people",
    label: "People",
    to: "/people",
    icon: "people",
    children: [
      {
        key: "people-candidates",
        label: "Candidates",
        to: "/people/candidates"
      },
      {
        key: "people-em-clients",
        label: "EM Clients",
        to: "/people/em-clients"
      },
      {
        key: "people-advanced-search",
        label: "Advanced Search",
        to: "/people"
      }
    ]
  },
  {
    key: "jobs",
    label: "Services",
    to: "/jobs",
    icon: "work",
    children: [
      {
        key: "jobs-my-jobs",
        label: "My Services",
        to: "/jobs/my-jobs"
      },
      {
        key: "jobs-all-em-jobs",
        label: "EM Services",
        to: "/jobs/all-em-jobs"
      },
      {
        key: "jobs-all-es-jobs",
        label: "ES Services",
        to: "/jobs/all-es-jobs"
      },
      {
        key: "jobs-advanced-search",
        label: "Advanced Search",
        to: "/jobs/advanced-search"
      }
    ]
  },
  {
    key: "reports",
    label: "Reports",
    to: "/reports",
    icon: "table_chart"
  },
  {
    key: "lists",
    label: "Lists",
    to: "/lists",
    icon: "format_list_bulleted",
    children: [
      {
        key: "lists-campaigns",
        label: "Campaigns",
        to: "/lists/campaigns"
      },
      {
        key: "lists-my-lists",
        label: "My Lists",
        to: "/lists/my-lists"
      },
      {
        key: "lists-all",
        label: "All Lists",
        to: "/lists/all"
      }
    ]
  },
  {
    key: "learn",
    label: "Learn",
    to: "/learn",
    icon: "school"
  },
  {
    key: "marketing",
    label: "Marketing",
    to: "/marketing",
    icon: "campaign"
  },
  {
    key: "tools",
    label: "Tools",
    to: "/tools",
    icon: "build",
    children: toolsConfig
      .filter((t) => t.status === "available")
      .map((t) => ({ key: `tools-${t.key}`, label: t.label, to: t.to }))
  },
  {
    key: "admin",
    label: "Admin",
    to: "/admin",
    icon: "security",
    dividerAbove: true,
    children: [
      {
        key: "admin-roles",
        label: "Roles",
        to: "/admin/roles"
      },
      {
        key: "admin-user-management",
        label: "User Management",
        to: "/admin/user-management"
      }
    ]
  },
  {
    key: "settings",
    label: "Settings",
    to: "/settings",
    icon: "settings"
  },
  {
    key: "design",
    label: "Design",
    to: "/design",
    icon: "palette",
    dividerAbove: true,
    children: designPages.map((p) => ({ key: `design-${p.key}`, label: p.label, to: p.to }))
  },
  {
    key: "data",
    label: "Data",
    to: "/admin/data",
    icon: "table_chart",
    children: listAdminDataCategories()
      .filter((category) => category.slug !== "view-all")
      .map((category) => ({
        key: `data-${category.slug}`,
        label: category.title,
        to: category.to
      }))
  }
];

/**
 * Returns whether the pathname points to the item or one of its descendants.
 * @param {{to?: string}} item
 * @param {string} pathname
 * @returns {boolean}
 */
export function isPathWithinItem(item, pathname) {
  if (!item || typeof item.to !== "string" || typeof pathname !== "string") {
    return false;
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/**
 * Returns whether an item should render active for the current pathname.
 * @param {{to?: string, children?: {to?: string}[]}} item
 * @param {string} pathname
 * @returns {boolean}
 */
export function isNavItemActive(item, pathname) {
  const hasChildren = Array.isArray(item?.children) && item.children.length > 0;

  if (hasChildren) {
    if (pathname === item.to) {
      return true;
    }
  } else if (isPathWithinItem(item, pathname)) {
    return true;
  }

  return hasChildren
    ? item.children.some((child) => isPathWithinItem(child, pathname))
    : false;
}

/**
 * Returns which sections should be expanded for a given pathname.
 * @param {string} pathname
 * @returns {string[]}
 */
export function getExpandedNavItemKeys(pathname) {
  return navItems
    .filter((item) => Array.isArray(item.children) && item.children.length && isNavItemActive(item, pathname))
    .map((item) => item.key);
}

/**
 * Returns the navigation model filtered by the current permission payload.
 * @param {{permissions?: {admin_access?: {configuration?: string[], data_settings?: string[]}}}|null|undefined} meta
 * @returns {typeof navItems}
 */
export function getNavigationItems(meta) {
  const adminActions = Array.isArray(meta?.permissions?.admin_access?.configuration)
    ? meta.permissions.admin_access.configuration
    : [];
  const dataSettingsActions = Array.isArray(meta?.permissions?.admin_access?.data_settings)
    ? meta.permissions.admin_access.data_settings
    : [];

  return navItems
    .map((item) => {
      if (item.key === "data") {
        return dataSettingsActions.includes("access") ? item : null;
      }

      if (item.key !== "admin") {
        return item;
      }

      const children = (item.children || []).filter((child) => {
        if (child.key === "admin-roles") {
          return adminActions.includes("access");
        }

        if (child.key === "admin-user-management") {
          return adminActions.includes("access");
        }

        return false;
      });

      return {
        ...item,
        children
      };
    })
    .filter((item) => {
      if (!item) {
        return false;
      }

      if (item.key !== "admin") {
        return true;
      }

      return Array.isArray(item.children) && item.children.length > 0;
    });
}
