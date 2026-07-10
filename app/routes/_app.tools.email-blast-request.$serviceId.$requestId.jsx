import { useParams } from "@remix-run/react";
import { EmailBlastRequestPage } from "../components/EmailBlastRequestPage";

export default function EmailBlastRequestEditRoute() {
  const { serviceId, requestId } = useParams();
  return <EmailBlastRequestPage serviceId={serviceId} requestId={requestId} />;
}
