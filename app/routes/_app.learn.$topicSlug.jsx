import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { LearnTopicPage } from "../components/LearnTopicPage";

/**
 * Loads the Learn server module without bundling it into the browser chunk.
 * @returns {Promise<import("../models/learn.server.js")>}
 */
async function loadLearnServerModule() {
  const module = await import("../models/learn.server.js");
  return module.default || module;
}

export async function loader({ request, params }) {
  const topicSlug = typeof params.topicSlug === "string" ? params.topicSlug : "";
  const { loadLearnTopicDetail } = await loadLearnServerModule();
  const detail = await loadLearnTopicDetail({
    request,
    slug: topicSlug
  });

  if (!detail) {
    throw new Response("Not Found", {
      status: 404
    });
  }

  return json(detail);
}

export default function LearnTopicRoute() {
  const { topic, categories } = useLoaderData();
  return <LearnTopicPage topic={topic} categories={categories} />;
}
