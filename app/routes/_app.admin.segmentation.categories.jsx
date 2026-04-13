import { redirect } from "@remix-run/node";

export async function loader() {
  return redirect("/admin/data?type=categories");
}

export default function AdminSegmentationCategoriesRoute() {
  return null;
}
