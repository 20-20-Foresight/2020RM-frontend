/**
 * Registry of available tools. Adding an entry here surfaces the tool on the
 * /tools index page. Each tool lives at /tools/<key>.
 */
export const toolsConfig = [
  {
    key: "resegmentation",
    label: "Resegmentation",
    to: "/tools/resegmentation",
    description:
      "Re-run organization segmentation to update industry and focus classifications. Works on a single organization or a full list.",
    icon: "category",
    status: "available"
  },
  {
    key: "email-templates",
    label: "Email Templates",
    to: "/tools/email-templates",
    description:
      "Draft, preview, and publish CRM email templates plus shared global header and footer snippets.",
    icon: "mail",
    status: "available"
  }
];
