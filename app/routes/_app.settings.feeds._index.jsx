import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { FeedsListPage } from "../components/FeedsListPage";
import {
  loadFeedsList,
  groupFeedsBySource,
  computeFeedStats
} from "../models/feeds.server";

export async function loader({ request }) {
  try {
    const feeds = await loadFeedsList();
    return json({
      feedsBySource: groupFeedsBySource(feeds),
      stats: computeFeedStats(feeds),
      error: null
    });
  } catch (error) {
    return json(
      {
        feedsBySource: {},
        stats: { total: 0, enabled: 0, running: 0, failed: 0 },
        error: error instanceof Error ? error.message : "Unable to load feeds."
      },
      { status: 500 }
    );
  }
}

export async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get("_action");

  // TODO: implement real API calls once the backend feeds management API is available
  if (intent === "toggleEnabled") {
    const feedId = formData.get("feedId");
    const enabled = formData.get("enabled") === "true";
    // await toggleFeedEnabled(feedId, enabled, request);
  }

  return redirect("/settings/feeds");
}

export default function FeedsIndexRoute() {
  const data = useLoaderData();
  return (
    <FeedsListPage
      feedsBySource={data.feedsBySource}
      stats={data.stats}
      error={data.error}
    />
  );
}
