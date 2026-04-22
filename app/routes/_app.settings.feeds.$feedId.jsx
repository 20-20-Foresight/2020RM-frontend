import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { FeedEditPage } from "../components/FeedEditorPage";
import { loadFeedById } from "../models/feeds.server";

export async function loader({ params }) {
  const feed = await loadFeedById(params.feedId);

  if (!feed) {
    throw new Response("Feed not found", { status: 404 });
  }

  return json({ feed });
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const intent = formData.get("_action");

  if (intent === "delete") {
    // TODO: call real API — DELETE /api/feeds/:id
    return redirect("/settings/feeds");
  }

  if (intent === "update") {
    const name = formData.get("name")?.toString().trim();
    if (!name) {
      return json({ error: "Feed name is required." }, { status: 400 });
    }

    // TODO: call real API — PUT /api/feeds/:id
    // await updateFeed(params.feedId, {
    //   name,
    //   description: formData.get("description"),
    //   interval_days: Number(formData.get("interval_days")) || 7,
    //   records_limit: Number(formData.get("records_limit")) || null,
    //   crm_age_days: Number(formData.get("crm_age_days")) || null,
    //   next_run_at: formData.get("next_run_at") || null,
    //   enabled: formData.get("enabled") === "true",
    //   settings: JSON.parse(formData.get("settingsJson") || "{}")
    // }, request);

    return redirect("/settings/feeds");
  }

  return redirect(`/settings/feeds/${params.feedId}`);
}

export default function FeedDetailRoute() {
  const { feed } = useLoaderData();
  const actionData = useActionData();
  return <FeedEditPage feed={feed} actionData={actionData} />;
}
