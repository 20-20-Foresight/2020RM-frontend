import { AdminDataCategoryLandingPage } from "../components/AdminDataCategoryPages";
import { listAdminDataCategories } from "../models/admin-data-categories.mjs";

export default function AdminDataIndexRoute() {
  return <AdminDataCategoryLandingPage categories={listAdminDataCategories()} />;
}
