import { useOutletContext } from "@remix-run/react";
import { PersonOverviewPanel } from "../components/PersonDetailPanels";

/**
 * Renders the default overview tab for one contact detail page.
 * @returns {JSX.Element}
 */
export default function PersonOverviewRoute() {
  const { personDetail } = useOutletContext();
  return <PersonOverviewPanel personDetail={personDetail} />;
}
