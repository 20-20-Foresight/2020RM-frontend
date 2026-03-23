import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { AdminDataShell } from "../components/AdminDataPage";
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
  try {
    const items = await loadAdminDataList({
      request
    });

    return json({
      items,
      error: null
    });
  } catch (error) {
    const status = error instanceof AdminDataApiError ? error.statusCode : 500;

    return json(
      {
        items: [],
        error: buildRouteError(error)
      },
      {
        status
      }
    );
  }
}

export default function AdminDataPage() {
  const data = useLoaderData();

  return (
    <AdminDataShell items={data.items} error={data.error}>
      <Outlet />
    </AdminDataShell>
  );
}
