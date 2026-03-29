import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { EntityDetailPage } from "../components/EntityDetailPage";
import { loadEntityDetailPage } from "../models/entity-detail.server";
import {
  buildEntityDetailPath,
  buildOrganizationPeoplePath
} from "../models/entity-route";

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
  const tabs = [
    {
      key: "info",
      label: "Info",
      to: buildEntityDetailPath("organization", data.uuid)
    },
    {
      key: "people",
      label: "People",
      to: buildOrganizationPeoplePath(data.uuid)
    }
  ].filter((tab) => tab.to);

  return <EntityDetailPage entityType="organization" tabs={tabs} activeTabKey="info" data={data} />;
}
