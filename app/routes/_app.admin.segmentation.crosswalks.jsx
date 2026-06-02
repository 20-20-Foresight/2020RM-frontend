import { redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/admin/data/all?type=segmentation");
}

export default function AdminSegmentationCrosswalksRoute() {
  return null;
}
