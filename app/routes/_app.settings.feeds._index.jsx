import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { FeedsListPage } from "../components/FeedsListPage";
import {
  FeedApiError,
  loadFeedsList,
  groupFeedsBySource,
  computeFeedStats,
  setFeedEnabled
} from "../models/feeds.server";

export async function loader({ request }) {
  try {
    const feeds = await loadFeedsList({ request });
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

  if (intent === "toggleEnabled") {
    const feedId = formData.get("feedId");
    const enabled = formData.get("enabled") === "true";

    if (!feedId) {
      return json({ error: "Feed id is required." }, { status: 400 });
    }

    try {
      await setFeedEnabled({
        request,
        id: feedId,
        enabled
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof FeedApiError ? error.message : "Unable to update feed status."
        },
        {
          status: error instanceof FeedApiError ? error.statusCode : 500
        }
      );
    }
  }

  return redirect("/settings/feeds");
}

export default function FeedsIndexRoute() {
  const data = useLoaderData();
  const actionData = useActionData();
  return (
    <FeedsListPage
      feedsBySource={data.feedsBySource}
      stats={data.stats}
      error={actionData?.error || data.error}
    />
  );
}
