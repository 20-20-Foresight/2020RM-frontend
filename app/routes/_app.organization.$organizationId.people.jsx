import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { DirectoryResultsContent } from "../components/DirectoryResultsContent";
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

  return (
    <DirectoryResultsContent
      emptyLabel="Unnamed person"
      secondaryFieldLabel="Email"
      secondaryFieldPaths={[
        "metadata.primaryemail",
        "metadata.workemail",
        "metadata.email.work",
        "metadata.email.personal",
        "metadata.email"
      ]}
      linkedInFieldPaths={[
        "metadata.socials.linkedin"
      ]}
      emptyStateMessage="No people associated with this organization."
      data={data}
    />
  );
}
