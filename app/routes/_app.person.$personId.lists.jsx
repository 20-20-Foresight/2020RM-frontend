import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import EntityListsPanel from "../components/EntityListsPanel";
import { loadEntityLists } from "../models/lists.server";

/**
 * Renders the lists tab for one contact detail page.
 */
export async function loader({ request, params }) {
  try {
    const result = await loadEntityLists({
      request,
      entityType: "person",
      uuid: params.personId || "",
    });
    return json({
      rows: Array.isArray(result.data) ? result.data : [],
      error: null,
    });
  } catch (error) {
    return json({
      rows: [],
      error: error instanceof Error ? error.message : "Unable to load person list memberships.",
    });
  }
}

export default function PersonListsRoute() {
  const data = useLoaderData();
  return (
    <EntityListsPanel
      rows={data?.rows}
      error={data?.error}
      emptyLabel="This person is not currently on any lists."
    />
  );
}
