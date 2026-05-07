import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  void request;
  return redirect("/admin/data/segmentation");
}

export default function AdminSegmentationIndexRoute() {
  return null;
}
