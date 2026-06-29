import { json } from "@remix-run/node";
import { Box } from "@chakra-ui/react";
import { useLoaderData } from "@remix-run/react";
import { LeadDetailPage } from "../components/LeadPages.jsx";
import { loadLeadDetailPage } from "../models/lead-detail.server";

export async function loader({ request, params }) {
  return json(
    await loadLeadDetailPage({
      request,
      uuid: params.leadId || "",
    })
  );
}

export default function LeadDetailRoute() {
  const data = useLoaderData();
  return (
    <Box>
      <LeadDetailPage data={data} />
    </Box>
  );
}
