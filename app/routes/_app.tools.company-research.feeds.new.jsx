import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { FeedNewPage } from "../components/FeedEditorPage";
import { readFeedFormIntent } from "../models/feed-form-intent.mjs";
import { buildFeedPreviewSignature } from "../models/feed-preview-signature.mjs";
import { getCompanyResearchFeedTabPath } from "../models/company-research-feeds.server";
import {
  createFeed,
  FeedApiError,
  loadFeedDestinationLists,
  previewFeed,
  readFeedFormPayload,
  saveFeedToQueue
} from "../models/feeds.server";

function buildFeedRedirectPath(feedId, source, query = "") {
  const searchParams = new URLSearchParams();
  if (feedId) {
    searchParams.set("feedId", String(feedId));
  }
  if (query) {
    const extraParams = new URLSearchParams(String(query).replace(/^\?/, ""));
    extraParams.forEach((value, key) => {
      searchParams.set(key, value);
    });
  }
  const serialized = searchParams.toString();
  return serialized ? `/tools/company-research/feeds?${serialized}` : "/tools/company-research/feeds";
}

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
  const embeddedMode = String(formData.get("embeddedMode") || "").trim() === "true";
  let payload;

  try {
    payload = readFeedFormPayload(formData, { includeSource: true });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Feed settings are invalid." },
      { status: error instanceof FeedApiError ? error.statusCode : 400 }
    );
  }

  if (!payload.name || !payload.source) {
    return json({ error: "Feed name and source are required." }, { status: 400 });
  }

  if (intent === "preview") {
    try {
      const preview = await previewFeed({ request, feed: payload });
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
        { status: error instanceof FeedApiError ? error.statusCode : 500 }
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
    feed = await createFeed({ request, feed: payload });
  } catch (error) {
    return json(
      { error: error instanceof FeedApiError ? error.message : "Unable to create feed." },
      { status: error instanceof FeedApiError ? error.statusCode : 500 }
    );
  }

  if (!feed?.id) {
    if (embeddedMode) {
      return json({
        ok: true,
        feed: null,
        run: null,
        queueError: null,
      });
    }
    return redirect(getCompanyResearchFeedTabPath(payload.source));
  }

  try {
    const run = await saveFeedToQueue({
      request,
      id: feed.id,
      linkedListName: payload.settings?.linkedListName || payload.settings?.outputList?.name || null
    });

    if (embeddedMode) {
      return json({
        ok: true,
        feed,
        run: run || null,
        queueError: null,
      });
    }

    if (run?.id) {
      return redirect(
        buildFeedRedirectPath(
          feed.id,
          payload.source,
          `?runId=${encodeURIComponent(String(run.id))}`
        )
      );
    }
  } catch (_error) {
    if (embeddedMode) {
      return json({
        ok: true,
        feed,
        run: null,
        queueError: "Unable to queue the initial saved-search run.",
      });
    }
    return redirect(
      buildFeedRedirectPath(
        feed.id,
        payload.source,
        "?queueError=Unable%20to%20queue%20the%20initial%20saved-search%20run."
      )
    );
  }

  if (embeddedMode) {
    return json({
      ok: true,
      feed,
      run: null,
      queueError: null,
    });
  }

  return redirect(buildFeedRedirectPath(feed.id, payload.source));
}

export default function CompanyResearchFeedNewRoute() {
  const { initialSource, availableLists } = useLoaderData();
  const actionData = useActionData();
  return (
    <FeedNewPage
      initialSource={initialSource}
      availableLists={availableLists}
      actionData={actionData}
      backPath={getCompanyResearchFeedTabPath(initialSource)}
      backLabel={initialSource && getCompanyResearchFeedTabPath(initialSource).includes("query") ? "Query Feeds" : "Source Feeds"}
    />
  );
}
