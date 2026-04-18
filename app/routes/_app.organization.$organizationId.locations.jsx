import { useOutletContext } from "@remix-run/react";
import { OrganizationLocationsPanel } from "../components/OrganizationDetailPanels";

/**
 * Renders the locations tab for one organization detail page.
 * @returns {JSX.Element}
 */
export default function OrganizationLocationsRoute() {
  const { organizationDetail } = useOutletContext();
  return <OrganizationLocationsPanel organizationDetail={organizationDetail} />;
}
