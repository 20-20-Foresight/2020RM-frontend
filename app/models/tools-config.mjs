/**
 * Registry of available tools. Adding an entry here surfaces the tool on the
 * /tools index page. Each tool lives at /tools/<key>.
 */
export const toolsConfig = [
  {
    key: "company-research",
    label: "Company Research",
    to: "/tools/company-research",
    permissionTarget: "company_research",
    description:
      "Queue operations, manual lists, feed intake, and prioritization for Company Research.",
    icon: "travel_explore",
    status: "available"
  },
  {
    key: "resegmentation",
    label: "Resegmentation",
    to: "/tools/resegmentation",
    permissionTarget: "resegmentation",
    description:
      "Re-run organization segmentation to update industry and focus classifications. Works on a single organization or a full list.",
    icon: "category",
    status: "available"
  },
  {
    key: "email-templates",
    label: "Email Templates",
    to: "/tools/email-templates",
    permissionTarget: "email_templates",
    description:
      "Draft, preview, and publish CRM email templates plus shared global header and footer snippets.",
    icon: "mail",
    status: "available"
  }
];

export function listAvailableTools(meta) {
  const toolPermissions = meta?.permissions?.tools_access && typeof meta.permissions.tools_access === "object"
    ? meta.permissions.tools_access
    : {};

  return toolsConfig.filter((tool) => {
    if (tool.status !== "available") {
      return false;
    }

    if (!tool.permissionTarget) {
      return true;
    }

    const actions = Array.isArray(toolPermissions[tool.permissionTarget])
      ? toolPermissions[tool.permissionTarget]
      : [];
    return actions.includes("access");
  });
}
