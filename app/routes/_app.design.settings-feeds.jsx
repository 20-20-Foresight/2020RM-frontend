/**
 * Design page: Settings — Search Feeds
 * Live mock for the Feeds settings page. Uses mock data only.
 * Production implementation lives at /settings/feeds.
 */
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { FeedsListPage } from "../components/FeedsListPage";
import {
  loadFeedsList,
  groupFeedsBySource,
  computeFeedStats
} from "../models/feeds.server";

export async function loader() {
  const feeds = await loadFeedsList();
  return json({
    feedsBySource: groupFeedsBySource(feeds),
    stats: computeFeedStats(feeds),
    error: null
  });
}

export async function action({ request }) {
  // Design mock — actions are no-ops, just re-render
  return redirect("/design/settings-feeds");
}

export default function DesignSettingsFeedsPage() {
  const data = useLoaderData();
  return (
    <FeedsListPage
      feedsBySource={data.feedsBySource}
      stats={data.stats}
      error={data.error}
    />
  );
}
