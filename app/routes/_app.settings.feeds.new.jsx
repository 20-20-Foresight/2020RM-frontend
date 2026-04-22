import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { FeedNewPage } from "../components/FeedEditorPage";

export async function loader({ request }) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") || null;
  return json({ initialSource: source });
}

export async function action({ request }) {
  const formData = await request.formData();

  const name = formData.get("name")?.toString().trim();
  const source = formData.get("source")?.toString().trim();

  if (!name || !source) {
    return json({ error: "Feed name and source are required." }, { status: 400 });
  }

  // TODO: call real API — POST /api/feeds
  // const feed = await createFeed({
  //   name,
  //   source,
  //   description: formData.get("description"),
  //   interval_days: Number(formData.get("interval_days")) || 7,
  //   records_limit: Number(formData.get("records_limit")) || null,
  //   crm_age_days: Number(formData.get("crm_age_days")) || null,
  //   next_run_at: formData.get("next_run_at") || null,
  //   enabled: formData.get("enabled") === "true",
  //   settings: JSON.parse(formData.get("settingsJson") || "{}")
  // }, request);

  // Mock: redirect to list with a fake success
  return redirect("/settings/feeds");
}

export default function FeedNewRoute() {
  const { initialSource } = useLoaderData();
  const actionData = useActionData();
  return <FeedNewPage initialSource={initialSource} actionData={actionData} />;
}
