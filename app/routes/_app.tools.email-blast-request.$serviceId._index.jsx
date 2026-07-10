import { useParams } from "@remix-run/react";
import { EmailBlastRequestPage } from "../components/EmailBlastRequestPage";

export default function EmailBlastRequestNewRoute() {
  const { serviceId } = useParams();
  return <EmailBlastRequestPage serviceId={serviceId} />;
}
