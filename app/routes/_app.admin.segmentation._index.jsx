import { redirect } from "@remix-run/node";

export async function loader({ request }) {
  void request;
  return redirect("/admin/segmentation/sectors");
}

export default function AdminSegmentationIndexRoute() {
  return null;
}
