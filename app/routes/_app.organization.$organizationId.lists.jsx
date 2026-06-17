import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import EntityListsPanel from "../components/EntityListsPanel";
import { loadEntityLists } from "../models/lists.server";

export async function loader({ request, params }) {
  try {
    const result = await loadEntityLists({
      request,
      entityType: "organization",
      uuid: params.organizationId || "",
    });
    return json({
      rows: Array.isArray(result.data) ? result.data : [],
      error: null,
    });
  } catch (error) {
    return json({
      rows: [],
      error:
        error instanceof Error ? error.message : "Unable to load organization list memberships.",
    });
  }
}

export default function OrganizationListsRoute() {
  const data = useLoaderData();
  return (
    <EntityListsPanel
      rows={data?.rows}
      error={data?.error}
      emptyLabel="This organization is not currently on any lists."
    />
  );
}
