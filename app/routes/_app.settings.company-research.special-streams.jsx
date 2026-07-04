import { redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/tools/company-research/feeds");
}
export default function CompanyResearchSpecialStreamsRoute() { return null; }
