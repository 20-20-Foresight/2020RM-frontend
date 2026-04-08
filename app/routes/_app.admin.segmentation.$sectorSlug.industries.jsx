import { redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/admin/segmentation/categories");
}

export default function AdminSegmentationIndustriesRoute() {
  return null;
}
