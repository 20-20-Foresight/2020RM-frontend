import { redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/admin/data?type=dimension-definition");
}

export default function AdminSegmentationDimensionsRoute() {
  return null;
}
