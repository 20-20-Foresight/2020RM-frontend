import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { SegmentationCrosswalkListPage } from "../components/SegmentationPage";
import { AdminDataApiError } from "../models/admin-data.server";
import { loadSegmentationDocuments } from "../models/segmentation-document.server";

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
    message: error instanceof Error ? error.message : "Unable to load the segmentation documents."
  };
}

export async function loader({ request }) {
  try {
    const items = await loadSegmentationDocuments({
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

export default function AdminSegmentationCrosswalksRoute() {
  const data = useLoaderData();

  return <SegmentationCrosswalkListPage items={data.items} error={data.error} />;
}
