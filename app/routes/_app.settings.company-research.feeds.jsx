import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { CompanyResearchFeedsPage } from "../components/CompanyResearchFeedsPage";
import { loadCompanyResearchFeeds } from "../models/company-research-feeds.server";
import { loadCompanyResearchStreams } from "../models/company-research-streams.server";
import { readFeedFormIntent } from "../models/feed-form-intent.mjs";
import {
  FeedApiError,
  deleteFeed,
  loadFeedById,
  loadFeedDestinationLists,
  loadFeedRunById,
  previewFeed,
  readFeedFormPayload,
  refreshFeed,
  setFeedEnabled,
  updateFeed,
} from "../models/feeds.server";

function buildFeedsPath(feedId = null, runId = null) {
  const searchParams = new URLSearchParams();
  if (feedId) {
    searchParams.set("feedId", String(feedId));
  }
  if (runId) {
    searchParams.set("runId", String(runId));
  }
  const query = searchParams.toString();
  return query ? `/tools/company-research/feeds?${query}` : "/tools/company-research/feeds";
}

export async function loader({ request }) {
  const url = new URL(request.url);
  const selectedFeedId = url.searchParams.get("feedId");
  try {
    const [streamData, feedData] = await Promise.all([
      loadCompanyResearchStreams({ request }),
      loadCompanyResearchFeeds({ request }),
    ]);
    let availableLists = [];
    try {
      availableLists = await loadFeedDestinationLists({ request });
    } catch (_error) {
      availableLists = [];
    }

    const selectedFeed = selectedFeedId
      ? await loadFeedById({ request, id: selectedFeedId })
      : null;
    const selectedRun =
      selectedFeed && url.searchParams.get("runId")
        ? await loadFeedRunById({ request, id: url.searchParams.get("runId") })
        : null;

    return json({
      ...streamData,
      feeds: feedData.feeds,
      availableLists,
      selectedFeed,
      selectedRun,
      error: null,
    });
  } catch (error) {
    return json(
      {
        streams: [],
        feeds: [],
        availableLists: [],
        selectedFeed: null,
        selectedRun: null,
        stats: { total: 0, feeds: 0, manualLists: 0, specialStreams: 0 },
        error: error instanceof Error ? error.message : "Unable to load feeds.",
      },
      { status: 500 }
    );
  }
}

export async function action({ request }) {
  const formData = await request.formData();
  const feedId = formData.get("feedId");
  const intent = readFeedFormIntent(formData, "update");
  const embeddedMode = String(formData.get("embeddedMode") || "").trim() === "true";
  const currentFeed = await loadFeedById({ request, id: feedId });

  if (!currentFeed) {
    throw new Response("Feed not found", { status: 404 });
  }

  if (intent === "delete") {
    try {
      await deleteFeed({ request, id: feedId });
    } catch (error) {
      return json(
        { error: error instanceof FeedApiError ? error.message : "Unable to delete feed." },
        { status: error instanceof FeedApiError ? error.statusCode : 500 }
      );
    }

    if (embeddedMode) {
      return json({ ok: true, deleted: true });
    }
    return redirect("/tools/company-research/feeds");
  }

  if (intent === "refresh") {
    try {
      const run = await refreshFeed({ request, id: feedId });
      if (embeddedMode) {
        return json({ ok: true, run, refreshed: true });
      }
      return redirect(buildFeedsPath(feedId, run?.id || null));
    } catch (error) {
      return json(
        { error: error instanceof FeedApiError ? error.message : "Unable to refresh feed." },
        { status: error instanceof FeedApiError ? error.statusCode : 500 }
      );
    }
  }

  if (intent === "pause" || intent === "resume") {
    try {
      const feed = await setFeedEnabled({
        request,
        id: feedId,
        enabled: intent === "resume",
      });
      if (embeddedMode) {
        return json({ ok: true, feed, toggled: true });
      }
      return redirect(buildFeedsPath(feedId));
    } catch (error) {
      return json(
        { error: error instanceof FeedApiError ? error.message : "Unable to update feed status." },
        { status: error instanceof FeedApiError ? error.statusCode : 500 }
      );
    }
  }

  if (intent === "preview" || intent === "update") {
    let payload;
    try {
      payload = readFeedFormPayload(formData);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Feed settings are invalid." },
        { status: error instanceof FeedApiError ? error.statusCode : 400 }
      );
    }

    if (!payload.name) {
      return json({ error: "Feed name is required." }, { status: 400 });
    }

    if (intent === "preview") {
      try {
        const preview = await previewFeed({
          request,
          feed: { ...payload, source: currentFeed.source },
        });
        return json({ ok: true, preview, error: null });
      } catch (error) {
        return json(
          { error: error instanceof FeedApiError ? error.message : "Unable to preview feed." },
          { status: error instanceof FeedApiError ? error.statusCode : 500 }
        );
      }
    }

    try {
      const feed = await updateFeed({ request, id: feedId, feed: payload });
      if (embeddedMode) {
        return json({ ok: true, feed, updated: true });
      }
    } catch (error) {
      return json(
        { error: error instanceof FeedApiError ? error.message : "Unable to update feed." },
        { status: error instanceof FeedApiError ? error.statusCode : 500 }
      );
    }

    return redirect(buildFeedsPath(feedId));
  }

  return redirect(buildFeedsPath(feedId));
}

export default function CompanyResearchFeedsRoute() {
  const data = useLoaderData();
  const actionData = useActionData();
  return (
    <CompanyResearchFeedsPage
      streams={data.streams}
      feeds={data.feeds}
      availableLists={data.availableLists}
      selectedFeed={data.selectedFeed}
      selectedRun={data.selectedRun}
      actionData={actionData}
      error={data.error}
    />
  );
}
