import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ListsIndexPage from "../components/ListsIndexPage";
import { loadListsIndex } from "../models/lists.server";

export async function loader({ request }) {
  try {
    const result = await loadListsIndex({
      request,
      view: "my_lists",
    });
    return json({
      lists: Array.isArray(result.data) ? result.data : [],
      error: null,
    });
  } catch (error) {
    return json({
      lists: [],
      error: error instanceof Error ? error.message : "Unable to load your lists.",
    });
  }
}

export default function MyListsRoute() {
  const data = useLoaderData();
  return (
    <ListsIndexPage
      title="My Lists"
      description="Lists currently owned by the signed-in CRM user."
      lists={data?.lists}
      error={data?.error}
    />
  );
}
