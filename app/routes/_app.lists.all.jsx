import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ListsIndexPage from "../components/ListsIndexPage";
import { loadListsIndex } from "../models/lists.server";

export async function loader({ request }) {
  try {
    const result = await loadListsIndex({
      request,
      view: "all",
    });
    return json({
      lists: Array.isArray(result.data) ? result.data : [],
      error: null,
    });
  } catch (error) {
    return json({
      lists: [],
      error: error instanceof Error ? error.message : "Unable to load lists.",
    });
  }
}

export default function AllListsRoute() {
  const data = useLoaderData();
  return (
    <ListsIndexPage
      title="All Lists"
      description="Browse the current shared list inventory across campaigns and other list types."
      lists={data?.lists}
      error={data?.error}
    />
  );
}
