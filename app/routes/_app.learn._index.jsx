import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { LearnLandingPage } from "../components/LearnLandingPage";

/**
 * Loads the Learn server module without bundling it into the browser chunk.
 * @returns {Promise<import("../models/learn.server.js")>}
 */
async function loadLearnServerModule() {
  const module = await import("../models/learn.server.js");
  return module.default || module;
}

export async function loader({ request }) {
  const { loadLearnTopics } = await loadLearnServerModule();
  const topics = await loadLearnTopics({ request });
  return json({ topics });
}

export default function LearnIndexRoute() {
  const { topics } = useLoaderData();
  return <LearnLandingPage topics={topics} />;
}
