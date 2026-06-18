import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  return redirect("/tools/company-research/feeds");
}
export default function CompanyResearchSourceFeedsRoute() { return null; }
