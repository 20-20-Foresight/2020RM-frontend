import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AdminDataListPage } from "../components/AdminDataPage";
import { AdminDataApiError, loadAdminDataList } from "../models/admin-data.server";

/**
 * Builds a stable route error payload.
 * @param {unknown} error
 * @returns {{message: string}}
 */
function buildRouteError(error) {
  if (error instanceof AdminDataApiError) {
    return {
      message: error.message
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unable to load admin data."
  };
}

export async function loader({ request }) {
  const url = new URL(request.url);
  const selectedType = url.searchParams.get("type") || "";
  const searchQuery = url.searchParams.get("q") || "";

  try {
    const items = await loadAdminDataList({
      request,
      filter: selectedType
        ? {
            type: selectedType
          }
        : null
    });

    return json({
      items,
      selectedType,
      searchQuery,
      error: null
    });
  } catch (error) {
    const status = error instanceof AdminDataApiError ? error.statusCode : 500;

    return json(
      {
        items: [],
        selectedType,
        searchQuery,
        error: buildRouteError(error)
      },
      {
        status
      }
    );
  }
}

export default function AdminDataIndexRoute() {
  const data = useLoaderData();

  return (
    <AdminDataListPage
      items={data.items}
      selectedType={data.selectedType}
      searchQuery={data.searchQuery}
      error={data.error}
    />
  );
}
