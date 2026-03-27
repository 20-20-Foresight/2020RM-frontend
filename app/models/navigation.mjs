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
        to: "/people/advanced-search"
      }
    ]
  },
  {
    key: "jobs",
    label: "Jobs",
    to: "/jobs",
    icon: "work",
    children: [
      {
        key: "jobs-my-jobs",
        label: "My Jobs",
        to: "/jobs/my-jobs"
      },
      {
        key: "jobs-all-em-jobs",
        label: "All EM Jobs",
        to: "/jobs/all-em-jobs"
      },
      {
        key: "jobs-all-es-jobs",
        label: "All ES Jobs",
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
    key: "marketing",
    label: "Marketing",
    to: "/marketing",
    icon: "campaign"
  },
  {
    key: "admin",
    label: "Admin",
    to: "/admin",
    icon: "security",
    dividerAbove: true,
    children: [
      {
        key: "admin-user-management",
        label: "User Management",
        to: "/admin/user-management"
      },
      {
        key: "admin-data",
        label: "Data",
        to: "/admin/data"
      },
      {
        key: "admin-segmentation",
        label: "Segmentation",
        to: "/admin/segmentation"
      }
    ]
  },
  {
    key: "settings",
    label: "Settings",
    to: "/settings",
    icon: "settings"
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
  if (isPathWithinItem(item, pathname)) {
    return true;
  }

  return Array.isArray(item?.children)
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
