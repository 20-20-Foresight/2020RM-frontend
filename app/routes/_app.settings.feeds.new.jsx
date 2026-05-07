import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { FeedNewPage } from "../components/FeedEditorPage";
import { readFeedFormIntent } from "../models/feed-form-intent.mjs";
import { buildFeedPreviewSignature } from "../models/feed-preview-signature.mjs";
import {
  createFeed,
  FeedApiError,
  loadFeedDestinationLists,
  previewFeed,
  readFeedFormPayload,
  saveFeedToQueue
} from "../models/feeds.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") || null;
  let availableLists = [];

  try {
    availableLists = await loadFeedDestinationLists({ request });
  } catch (_error) {
    availableLists = [];
  }

  return json({ initialSource: source, availableLists });
}

export async function action({ request }) {
  const formData = await request.formData();
  const intent = readFeedFormIntent(formData, "create");
  let payload;

  try {
    payload = readFeedFormPayload(formData, {
      includeSource: true
    });
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

  if (!payload.name || !payload.source) {
    return json({ error: "Feed name and source are required." }, { status: 400 });
  }

  if (intent === "preview") {
    try {
      const preview = await previewFeed({
        request,
        feed: payload
      });
      return json({
        intent: "preview",
        error: null,
        preview,
        previewSignature: buildFeedPreviewSignature(payload)
      });
    } catch (error) {
      return json(
        {
          intent: "preview",
          error: error instanceof FeedApiError ? error.message : "Unable to preview feed.",
          preview: null,
          previewSignature: null
        },
        {
          status: error instanceof FeedApiError ? error.statusCode : 500
        }
      );
    }
  }

  const submittedPreviewSignature =
    typeof formData.get("previewSignature") === "string"
      ? formData.get("previewSignature").trim()
      : "";
  const currentPreviewSignature = buildFeedPreviewSignature(payload);
  if (!submittedPreviewSignature || submittedPreviewSignature !== currentPreviewSignature) {
    return json(
      {
        intent: "create",
        error: "Run a successful preview before creating this saved search.",
        preview: null,
        previewSignature: null
      },
      { status: 400 }
    );
  }

  let feed;
  try {
    feed = await createFeed({
      request,
      feed: payload
    });
  } catch (error) {
    return json(
      {
        error: error instanceof FeedApiError ? error.message : "Unable to create feed."
      },
      {
        status: error instanceof FeedApiError ? error.statusCode : 500
      }
    );
  }

  if (!feed?.id) {
    return redirect("/settings/feeds");
  }

  try {
    const run = await saveFeedToQueue({
      request,
      id: feed.id,
      linkedListName: payload.settings?.linkedListName || payload.settings?.outputList?.name || null
    });

    if (run?.id) {
      return redirect(`/settings/feeds/${feed.id}?runId=${encodeURIComponent(String(run.id))}`);
    }
  } catch (_error) {
    return redirect(`/settings/feeds/${feed.id}?queueError=Unable%20to%20queue%20the%20initial%20saved-search%20run.`);
  }

  return redirect(`/settings/feeds/${feed.id}`);
}

export default function FeedNewRoute() {
  const { initialSource, availableLists } = useLoaderData();
  const actionData = useActionData();
  return <FeedNewPage initialSource={initialSource} availableLists={availableLists} actionData={actionData} />;
}
