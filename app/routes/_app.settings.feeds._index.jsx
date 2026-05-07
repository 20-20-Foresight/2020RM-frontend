import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { FeedsListPage } from "../components/FeedsListPage";
import {
  loadFeedsList,
  computeFeedStats
} from "../models/feeds.server";

export async function loader({ request }) {
  try {
    const feeds = await loadFeedsList({ request });
    return json({
      feeds,
      stats: computeFeedStats(feeds),
      error: null
    });
  } catch (error) {
    return json(
      {
        feeds: [],
        stats: { total: 0, enabled: 0, running: 0, failed: 0 },
        error: error instanceof Error ? error.message : "Unable to load feeds."
      },
      { status: 500 }
    );
  }
}

export default function FeedsIndexRoute() {
  const data = useLoaderData();
  return (
    <FeedsListPage
      feeds={data.feeds}
      stats={data.stats}
      error={data.error}
    />
  );
}
