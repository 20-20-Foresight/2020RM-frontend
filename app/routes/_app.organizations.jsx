import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SearchDirectoryPage } from "../components/SearchDirectoryPage";

const { loadRestSearchPage } = require("../models/rest-search.server");

export async function loader({ request }) {
  return json(
    await loadRestSearchPage({
      request,
      entityType: "organization"
    })
  );
}

export default function OrganizationsPage() {
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
      data={data}
    />
  );
}
