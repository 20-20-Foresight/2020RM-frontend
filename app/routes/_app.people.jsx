import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { SearchDirectoryPage } from "../components/SearchDirectoryPage";

const { loadRestSearchPage } = require("../models/rest-search.server");

export async function loader({ request }) {
  return json(
    await loadRestSearchPage({
      request,
      entityType: "person"
    })
  );
}

export default function PeoplePage() {
  const data = useLoaderData();

  return (
    <SearchDirectoryPage
      title="People"
      searchPlaceholder="Search people by name"
      emptyLabel="Unnamed person"
      secondaryFieldLabel="Email"
      secondaryFieldPaths={[
        "metadata.primaryemail",
        "metadata.workemail",
        "metadata.email.work",
        "metadata.email.personal",
        "metadata.email"
      ]}
      data={data}
    />
  );
}
