import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { DirectoryResultsContent } from "../components/DirectoryResultsContent";
import { EntityDetailPage } from "../components/EntityDetailPage";
import { loadEntityDetailPage } from "../models/entity-detail.server";
import {
  buildEntityDetailPath,
  buildOrganizationPeoplePath
} from "../models/entity-route";
import { loadOrganizationPeoplePage } from "../models/organization-people.server";

export async function loader({ request, params }) {
  const organizationUUID = params.organizationId || "";
  const [detail, people] = await Promise.all([
    loadEntityDetailPage({
      request,
      entityType: "organization",
      uuid: organizationUUID
    }),
    loadOrganizationPeoplePage({
      request,
      organizationUUID
    })
  ]);

  return json({
    detail,
    people
  });
}

export default function OrganizationPeopleRoute() {
  const { detail, people } = useLoaderData();
  const organizationUUID = detail.uuid || people.organizationUUID;
  const tabs = [
    {
      key: "info",
      label: "Info",
      to: buildEntityDetailPath("organization", organizationUUID)
    },
    {
      key: "people",
      label: "People",
      to: buildOrganizationPeoplePath(organizationUUID)
    }
  ].filter((tab) => tab.to);

  return (
    <EntityDetailPage entityType="organization" tabs={tabs} activeTabKey="people" data={detail}>
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
        data={people}
      />
    </EntityDetailPage>
  );
}
