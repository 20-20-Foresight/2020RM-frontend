import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { OrganizationContactsPanel } from "../components/OrganizationDetailPanels";
import { loadOrganizationPeoplePage } from "../models/organization-people.server";

export async function loader({ request, params }) {
  return json(
    await loadOrganizationPeoplePage({
      request,
      organizationUUID: params.organizationId || ""
    })
  );
}

export default function OrganizationPeopleRoute() {
  const data = useLoaderData();

  return <OrganizationContactsPanel data={data} />;
}
