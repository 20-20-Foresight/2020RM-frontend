import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { CompanyResearchDashboardPage } from "../components/CompanyResearchDashboardPage";
import { loadCompanyResearchDashboard } from "../models/company-research.server";

function buildEmptyDashboard() {
  return {
    nextUp: { count: 0, items: [] },
    processing: { total: 0, groups: [] },
    completed: { count: 0, items: [] },
  };
}

export async function loader({ request }) {
  try {
    const dashboard = await loadCompanyResearchDashboard({ request });
    return json({
      dashboard,
      error: null,
    });
  } catch (error) {
    return json(
      {
        dashboard: buildEmptyDashboard(),
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Company Research.",
      },
      { status: 500 }
    );
  }
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
