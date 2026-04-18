import { useOutletContext } from "@remix-run/react";
import { OrganizationSimilarOrganizationsPanel } from "../components/OrganizationDetailPanels";

/**
 * Renders the similar-organizations tab for one organization detail page.
 * @returns {JSX.Element}
 */
export default function OrganizationSimilarOrganizationsRoute() {
  const { organizationDetail } = useOutletContext();
  return <OrganizationSimilarOrganizationsPanel organizationDetail={organizationDetail} />;
}
