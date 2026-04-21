/**
 * Registry of design pages. Adding an entry here automatically adds it to
 * the sidebar nav and the /design gallery. Each page lives at /design/<key>.
 */
export const designPages = [
  {
    key: "example",
    label: "Example Page",
    to: "/design/example",
    description: "Starter template — shows the design page pattern with mock data."
  },
  {
    key: "learn-landing",
    label: "Learn — Landing Page",
    to: "/design/learn-landing",
    description: "Topic card grid with category filter bubbles and permission badges."
  },
  {
    key: "learn-topic",
    label: "Learn — Topic Detail",
    to: "/design/learn-topic",
    description: "Category reference page with sticky right-side table of contents."
  }
];
