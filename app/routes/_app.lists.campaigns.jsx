import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ListsIndexPage from "../components/ListsIndexPage";
import { loadListsIndex } from "../models/lists.server";

export async function loader({ request }) {
  try {
    const result = await loadListsIndex({
      request,
      view: "campaigns",
    });
    return json({
      lists: Array.isArray(result.data) ? result.data : [],
      error: null,
    });
  } catch (error) {
    return json({
      lists: [],
      error: error instanceof Error ? error.message : "Unable to load campaign lists.",
    });
  }
}

export default function CampaignListsRoute() {
  const data = useLoaderData();
  return (
    <ListsIndexPage
      title="Campaigns"
      description="People-oriented campaign lists built on the shared CRM list runtime."
      lists={data?.lists}
      error={data?.error}
    />
  );
}
