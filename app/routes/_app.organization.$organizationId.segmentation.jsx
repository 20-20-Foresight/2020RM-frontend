import { useOutletContext } from "@remix-run/react";
import { OrganizationSegmentationTab } from "../components/OrganizationSegmentationTab.jsx";

/**
 * Renders the segmentation tab for one organization detail page.
 * @returns {JSX.Element}
 */
export default function OrganizationSegmentationRoute() {
  const { organizationDetail } = useOutletContext();
  return <OrganizationSegmentationTab organizationDetail={organizationDetail} />;
}
