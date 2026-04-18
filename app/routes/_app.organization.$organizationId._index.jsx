import { useOutletContext } from "@remix-run/react";
import { OrganizationOverviewPanel } from "../components/OrganizationDetailPanels";

/**
 * Renders the default overview tab for one organization detail page.
 * @returns {JSX.Element}
 */
export default function OrganizationOverviewRoute() {
  const { organizationDetail } = useOutletContext();
  return <OrganizationOverviewPanel organizationDetail={organizationDetail} />;
}
