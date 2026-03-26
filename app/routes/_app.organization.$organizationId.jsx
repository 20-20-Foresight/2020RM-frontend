import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { EntityDetailPage } from "../components/EntityDetailPage";
import { loadEntityDetailPage } from "../models/entity-detail.server";

export async function loader({ request, params }) {
  return json(
    await loadEntityDetailPage({
      request,
      entityType: "organization",
      uuid: params.organizationId || ""
    })
  );
}

export default function OrganizationDetailRoute() {
  const data = useLoaderData();

  return <EntityDetailPage entityType="organization" data={data} />;
}
