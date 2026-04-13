import { redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/admin/segmentation/dimensions");
}

export default function AdminSegmentationSectorsRoute() {
  return null;
}
