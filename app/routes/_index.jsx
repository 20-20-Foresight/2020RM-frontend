import { redirect } from "@remix-run/node";

export function loader() {
  return redirect("/dashboard");
}

export default function Index() {
  return null;
}

