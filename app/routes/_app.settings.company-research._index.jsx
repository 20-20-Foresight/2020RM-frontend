import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { CompanyResearchDashboardPage } from "../components/CompanyResearchDashboardPage";

export async function loader({ request }) {
  return json({
    dashboard: null,
    error: null,
  });
}

export default function CompanyResearchQueueRoute() {
  const data = useLoaderData();
  return (
    <CompanyResearchDashboardPage
      dashboard={data.dashboard}
      error={data.error}
    />
  );
}
