import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AdminDataCategoryDetailPage } from "../components/AdminDataCategoryPages";
import { loadAdminDataList } from "../models/admin-data.server";
import { getAdminDataCategoryBySlug, resolveAdminDataCategoryEntries } from "../models/admin-data-categories.mjs";

export async function loader({ request, params }) {
  const category = getAdminDataCategoryBySlug(params.categorySlug);

  if (!category || !Array.isArray(category.items)) {
    throw new Response("Not Found", { status: 404 });
  }

  const items = await loadAdminDataList({ request });
  const entries = resolveAdminDataCategoryEntries(category, items);

  return json({
    category,
    entries
  });
}

export default function AdminDataCategoryRoute() {
  const data = useLoaderData();
  return <AdminDataCategoryDetailPage category={data.category} entries={data.entries} />;
}
