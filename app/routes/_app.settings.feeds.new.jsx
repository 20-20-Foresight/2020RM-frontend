import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { FeedNewPage } from "../components/FeedEditorPage";
import { createFeed, FeedApiError, readFeedFormPayload } from "../models/feeds.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") || null;
  return json({ initialSource: source });
}

export async function action({ request }) {
  const formData = await request.formData();
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

  try {
    const feed = await createFeed({
      request,
      feed: payload
    });

    return redirect(feed?.id ? `/settings/feeds/${feed.id}` : "/settings/feeds");
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
}

export default function FeedNewRoute() {
  const { initialSource } = useLoaderData();
  const actionData = useActionData();
  return <FeedNewPage initialSource={initialSource} actionData={actionData} />;
}
