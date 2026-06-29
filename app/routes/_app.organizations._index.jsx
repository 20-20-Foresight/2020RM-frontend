import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SearchDirectoryPage } from "../components/SearchDirectoryPage";
import { loadRestSearchPage } from "../models/rest-search.server";

export async function loader({ request }) {
  return json(
    await loadRestSearchPage({
      request,
      entityType: "organization"
    })
  );
}

export default function OrganizationsIndexPage() {
  const data = useLoaderData();

  return (
    <SearchDirectoryPage
      title="Organizations"
      searchPlaceholder="Search organizations by name"
      emptyLabel="Unnamed organization"
      secondaryFieldLabel="Website"
      secondaryFieldPaths={[
        "metadata.website",
        "metadata.domain"
      ]}
      linkedInFieldPaths={[
        "metadata.socials.linkedin"
      ]}
      data={data}
    />
  );
}
