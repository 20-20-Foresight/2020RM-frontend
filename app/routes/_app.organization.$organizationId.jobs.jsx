import { useOutletContext } from "@remix-run/react";
import { OrganizationJobsPanel } from "../components/OrganizationDetailPanels";

/**
 * Renders the jobs tab for one organization detail page.
 * @returns {JSX.Element}
 */
export default function OrganizationJobsRoute() {
  const { organizationDetail } = useOutletContext();
  return <OrganizationJobsPanel organizationDetail={organizationDetail} />;
}
