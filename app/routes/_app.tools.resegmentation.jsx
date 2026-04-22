import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import ResegmentationToolPage from "../components/ResegmentationToolPage";
import {
  ResegmentationApiError,
  loadResegmentationListDetail,
  loadResegmentationLists,
  loadResegmentationOrganization,
  runOrganizationResegmentation,
  searchResegmentationOrganizations,
} from "../models/resegmentation.server";

/**
 * Read one trimmed form value.
 * @param {FormData} formData
 * @param {string} key
 * @returns {string}
 */
function readFormString(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Read one boolean form value.
 * @param {FormData} formData
 * @param {string} key
 * @param {boolean} fallback
 * @returns {boolean}
 */
function readFormBoolean(formData, key, fallback) {
  const value = readFormString(formData, key).toLowerCase();
  if (!value) {
    return fallback;
  }
  if (["true", "1", "yes", "on"].includes(value)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(value)) {
    return false;
  }
  return fallback;
}

/**
 * Convert one action/model error into a stable JSON response.
 * @param {unknown} error
 * @param {string} fallbackMessage
 * @returns {import("@remix-run/node").TypedResponse<{error: string}>}
 */
function buildErrorResponse(error, fallbackMessage) {
  return json(
    {
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    {
      status: error instanceof ResegmentationApiError ? error.statusCode : 500,
    }
  );
}

export async function loader({ request }) {
  try {
    const result = await loadResegmentationLists({ request });
    return json({
      lists: Array.isArray(result.data) ? result.data : [],
      error: null,
    });
  } catch (error) {
    return json(
      {
        lists: [],
        error: error instanceof Error ? error.message : "Unable to load resegmentation lists.",
      },
      {
        status: error instanceof ResegmentationApiError ? error.statusCode : 500,
      }
    );
  }
}

export async function action({ request }) {
  const formData = await request.formData();
  const intent = readFormString(formData, "_action");

  try {
    switch (intent) {
      case "searchOrganizations": {
        const query = readFormString(formData, "query");
        if (!query) {
          return json({
            organizations: [],
            status: "idle",
            statusExplained: "Enter an organization name to search.",
          });
        }

        const result = await searchResegmentationOrganizations({
          request,
          query,
        });
        return json({
          organizations: Array.isArray(result.data) ? result.data : [],
          status: result.status,
          statusExplained: result.statusExplained,
        });
      }

      case "loadOrganization": {
        const uuid = readFormString(formData, "uuid");
        if (!uuid) {
          return json({ error: "Organization uuid is required." }, { status: 400 });
        }

        const result = await loadResegmentationOrganization({
          request,
          uuid,
        });
        return json({
          organization: result.data,
          status: result.status,
          statusExplained: result.statusExplained,
        });
      }

      case "loadListDetail": {
        const uuid = readFormString(formData, "uuid");
        if (!uuid) {
          return json({ error: "List uuid is required." }, { status: 400 });
        }

        const result = await loadResegmentationListDetail({
          request,
          uuid,
        });
        return json({
          listDetail: result.data,
          status: result.status,
          statusExplained: result.statusExplained,
        });
      }

      case "segmentOrganization": {
        const uuid = readFormString(formData, "uuid");
        if (!uuid) {
          return json({ error: "Organization uuid is required." }, { status: 400 });
        }

        const result = await runOrganizationResegmentation({
          request,
          uuid,
          dryRun: readFormBoolean(formData, "dryRun", true),
          saveSalesforce: readFormBoolean(formData, "saveSalesforce", false),
          includeExplanation: readFormBoolean(formData, "includeExplanation", true),
        });
        return json({
          resegmentation: result.data,
          status: result.status,
          statusExplained: result.statusExplained,
        });
      }

      default:
        return json({ error: "Unknown resegmentation action." }, { status: 400 });
    }
  } catch (error) {
    return buildErrorResponse(error, "Unable to complete the resegmentation request.");
  }
}

export default function ResegmentationToolRoute() {
  const data = useLoaderData();

  return (
    <ResegmentationToolPage
      initialLists={data?.lists}
      initialError={data?.error}
    />
  );
}
