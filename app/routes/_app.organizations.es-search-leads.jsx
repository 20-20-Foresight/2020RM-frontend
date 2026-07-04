import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { EsSearchLeadsPage } from "../components/LeadPages";
import { loadEsSearchLeadsPage } from "../models/es-search-leads.server";

export async function loader({ request }) {
  return json(await loadEsSearchLeadsPage({ request }));
}

export default function OrganizationsEsSearchLeadsPage() {
  const data = useLoaderData();
  return <EsSearchLeadsPage data={data} />;
}
