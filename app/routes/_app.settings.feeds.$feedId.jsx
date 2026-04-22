import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { FeedEditPage } from "../components/FeedEditorPage";
import { readFeedFormIntent } from "../models/feed-form-intent.mjs";
import {
  FeedApiError,
  deleteFeed,
  loadFeedById,
  readFeedFormPayload,
  updateFeed
} from "../models/feeds.server";

export async function loader({ params, request }) {
  const feed = await loadFeedById({
    request,
    id: params.feedId
  });

  if (!feed) {
    throw new Response("Feed not found", { status: 404 });
  }

  return json({ feed });
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const intent = readFeedFormIntent(formData, "update");

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

  if (intent === "update") {
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
  const { feed } = useLoaderData();
  const actionData = useActionData();
  return <FeedEditPage feed={feed} actionData={actionData} />;
}
