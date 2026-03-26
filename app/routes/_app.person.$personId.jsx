import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { EntityDetailPage } from "../components/EntityDetailPage";
import { loadEntityDetailPage } from "../models/entity-detail.server";

export async function loader({ request, params }) {
  return json(
    await loadEntityDetailPage({
      request,
      entityType: "person",
      uuid: params.personId || ""
    })
  );
}

export default function PersonDetailRoute() {
  const data = useLoaderData();

  return <EntityDetailPage entityType="person" data={data} />;
}
