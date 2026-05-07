import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { FeedEditPage } from "../components/FeedEditorPage";
import { readFeedFormIntent } from "../models/feed-form-intent.mjs";
import {
  FeedApiError,
  deleteFeed,
  loadFeedDestinationLists,
  loadFeedRunById,
  loadFeedById,
  previewFeed,
  readFeedFormPayload,
  refreshFeed,
  setFeedEnabled,
  updateFeed
} from "../models/feeds.server";

export async function loader({ params, request }) {
  const url = new URL(request.url);
  const feed = await loadFeedById({
    request,
    id: params.feedId
  });

  if (!feed) {
    throw new Response("Feed not found", { status: 404 });
  }

  const runId = url.searchParams.get("runId");
  const run = runId
    ? await loadFeedRunById({
        request,
        id: runId
      })
    : null;

  let availableLists = [];
  try {
    availableLists = await loadFeedDestinationLists({ request });
  } catch (_error) {
    availableLists = [];
  }

  return json({
    feed,
    run,
    availableLists,
    queueError: url.searchParams.get("queueError") || null
  });
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const intent = readFeedFormIntent(formData, "update");
  const currentFeed = await loadFeedById({
    request,
    id: params.feedId
  });

  if (!currentFeed) {
    throw new Response("Feed not found", { status: 404 });
  }

  if (intent === "delete") {
    try {
      await deleteFeed({
        request,
        id: params.feedId
      });
    } catch (error) {
      return json(
        {
          error: error instanceof FeedApiError ? error.message : "Unable to delete feed."
        },
        {
          status: error instanceof FeedApiError ? error.statusCode : 500
        }
      );
    }

    return redirect("/settings/feeds");
  }

  if (intent === "refresh") {
    try {
      const run = await refreshFeed({
        request,
        id: params.feedId
      });
      if (run?.id) {
        return redirect(
          `/settings/feeds/${params.feedId}?runId=${encodeURIComponent(String(run.id))}`
        );
      }
      return redirect(`/settings/feeds/${params.feedId}`);
    } catch (error) {
      return json(
        {
          error: error instanceof FeedApiError ? error.message : "Unable to refresh feed."
        },
        {
          status: error instanceof FeedApiError ? error.statusCode : 500
        }
      );
    }
  }

  if (intent === "pause" || intent === "resume") {
    try {
      await setFeedEnabled({
        request,
        id: params.feedId,
        enabled: intent === "resume"
      });
      return redirect(`/settings/feeds/${params.feedId}`);
    } catch (error) {
      return json(
        {
          error: error instanceof FeedApiError ? error.message : "Unable to update feed status."
        },
        {
          status: error instanceof FeedApiError ? error.statusCode : 500
        }
      );
    }
  }

  if (intent === "preview" || intent === "update") {
    let payload;
    try {
      payload = readFeedFormPayload(formData);
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Feed settings are invalid."
        },
        {
          status: error instanceof FeedApiError ? error.statusCode : 400
        }
      );
    }

    if (!payload.name) {
      return json({ error: "Feed name is required." }, { status: 400 });
    }

    if (intent === "preview") {
      try {
        const preview = await previewFeed({
          request,
          feed: {
            ...payload,
            source: currentFeed.source,
          }
        });
        return json({ preview, error: null });
      } catch (error) {
        return json(
          {
            error: error instanceof FeedApiError ? error.message : "Unable to preview feed."
          },
          {
            status: error instanceof FeedApiError ? error.statusCode : 500
          }
        );
      }
    }

    try {
      await updateFeed({
        request,
        id: params.feedId,
        feed: payload
      });
    } catch (error) {
      return json(
        {
          error: error instanceof FeedApiError ? error.message : "Unable to update feed."
        },
        {
          status: error instanceof FeedApiError ? error.statusCode : 500
        }
      );
    }

    return redirect(`/settings/feeds/${params.feedId}`);
  }

  return redirect(`/settings/feeds/${params.feedId}`);
}

export default function FeedDetailRoute() {
  const { feed, run, availableLists, queueError } = useLoaderData();
  const actionData = useActionData();
  return (
    <FeedEditPage
      feed={feed}
      availableLists={availableLists}
      initialRun={run}
      actionData={actionData || (queueError ? { error: queueError } : null)}
    />
  );
}
