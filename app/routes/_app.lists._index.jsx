import { redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/lists/campaigns");
}

export default function ListsIndexRedirectRoute() {
  return null;
}
