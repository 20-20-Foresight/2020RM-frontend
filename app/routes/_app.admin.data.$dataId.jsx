import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Alert, AlertDescription, AlertIcon } from "@chakra-ui/react";
import { AdminDataDetailEditor } from "../components/AdminDataPage";
import {
  AdminDataApiError,
  loadAdminDataDocument,
  saveAdminDataDocument
} from "../models/admin-data.server";

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
    message: error instanceof Error ? error.message : "Admin data request failed."
  };
}

/**
 * Reads a trimmed form value.
 * @param {FormData} formData
 * @param {string} name
 * @returns {string}
 */
function readFormString(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Reads an optional numeric form value.
 * @param {FormData} formData
 * @param {string} name
 * @returns {number|null}
 */
function readFormNumber(formData, name) {
  const value = readFormString(formData, name).trim();
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parses one JSON-encoded form field.
 * @param {FormData} formData
 * @param {string} name
 * @param {unknown} fallback
 * @returns {unknown}
 */
function parseJsonField(formData, name, fallback) {
  const rawValue = readFormString(formData, name);
  if (!rawValue.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return fallback;
  }
}

export async function loader({ request, params }) {
  const id = typeof params.dataId === "string" ? params.dataId : "";

  try {
    const data = await loadAdminDataDocument({
      request,
      id
    });

    return json({
      data,
      error: null
    });
  } catch (error) {
    const status = error instanceof AdminDataApiError ? error.statusCode : 500;

    return json(
      {
        data: null,
        error: buildRouteError(error)
      },
      {
        status
      }
    );
  }
}

export async function action({ request, params }) {
  const id = typeof params.dataId === "string" ? params.dataId : "";
  const formData = await request.formData();
  const description = readFormString(formData, "description");
  const shape = readFormString(formData, "shape");
  const expectedVersion = readFormNumber(formData, "expectedVersion");
  const columns = parseJsonField(formData, "columns", []);
  const rows = parseJsonField(formData, "rows", []);
  const document = parseJsonField(formData, "document", null);

  try {
    const saved = await saveAdminDataDocument({
      request,
      id,
      description,
      expectedVersion,
      shape,
      columns: Array.isArray(columns) ? columns : [],
      rows: Array.isArray(rows) ? rows : [],
      document
    });

    return json({
      ok: true,
      saved,
      error: null
    });
  } catch (error) {
    const status = error instanceof AdminDataApiError ? error.statusCode : 500;

    return json(
      {
        ok: false,
        saved: null,
        error: buildRouteError(error)
      },
      {
        status
      }
    );
  }
}

export default function AdminDataDetailRoute() {
  const { data, error } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  if (!data) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertDescription>{error?.message || "Unable to load this data set."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <AdminDataDetailEditor
      data={data}
      actionData={actionData}
      isSaving={navigation.state === "submitting"}
    />
  );
}
