import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Alert, AlertDescription, AlertIcon } from "@chakra-ui/react";
import { AdminDataDetailEditor } from "../components/AdminDataPage";
import { CategoryEditorPage } from "../components/CategoryEditorPage";
import { DimensionDefinitionEditorPage } from "../components/DimensionDefinitionEditorPage";
import { SegmentationDefaultEditorPage } from "../components/SegmentationDefaultEditorPage";
import {
  buildDimensionDefinitionDocument,
  buildDimensionDefinitionViewModel
} from "../models/dimension-definition-document.mjs";
import {
  buildCategoryDocument,
  buildCategoryViewModel
} from "../models/segmentation-category-document.mjs";
import {
  buildSegmentationDefaultDocument,
  buildSegmentationDefaultViewModel,
  resolveSegmentationDefaultEditorType
} from "../models/segmentation-default-editor.mjs";

const CUSTOM_SEGMENTATION_EDITOR_TYPES = new Set(["segmentation.default", "segmentation.code", "segmentation.list"]);

/**
 * Builds a stable route error payload.
 * @param {unknown} error
 * @returns {{message: string}}
 */
function buildRouteError(error) {
  if (error instanceof Error && error.name === "AdminDataApiError") {
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

/**
 * Loads the admin-data server module without pulling it into the browser route chunk.
 * @returns {Promise<import("../models/admin-data.server.js")>}
 */
async function loadAdminDataServerModule() {
  const module = await import("../models/admin-data.server.js");
  return module.default || module;
}

/**
 * Loads the segmentation category catalog server module on the server only.
 * @returns {Promise<import("../models/segmentation-category-catalog.server.js")>}
 */
async function loadSegmentationCategoryCatalogModule() {
  const module = await import("../models/segmentation-category-catalog.server.js");
  return module.default || module;
}

/**
 * Loads the segmentation dimension catalog server module on the server only.
 * @returns {Promise<import("../models/segmentation-dimension-catalog.server.js")>}
 */
async function loadSegmentationDimensionCatalogModule() {
  const module = await import("../models/segmentation-dimension-catalog.server.js");
  return module.default || module;
}

export async function loader({ request, params }) {
  const id = typeof params.dataId === "string" ? params.dataId : "";
  const { loadRawAdminDataDocument, loadAdminDataDocument } = await loadAdminDataServerModule();

  try {
    const rawData = await loadRawAdminDataDocument({
      request,
      id
    });
    const documentType = rawData.metadata?.type;
    const editorType = resolveSegmentationDefaultEditorType(rawData.editor, rawData.document, rawData.metadata?.type);

    if (documentType === "dimension-definition") {
      return json({
        data: {
          ...rawData,
          dimensionDefinition: buildDimensionDefinitionViewModel({
            document: rawData.document
          })
        },
        error: null
      });
    }

    if (documentType === "categories") {
      const supportsPreference = String(rawData.name || "").trim().toLowerCase() === "industry";
      const { loadSegmentationDimensionCatalog } = await loadSegmentationDimensionCatalogModule();
      const dimensionCatalog = await loadSegmentationDimensionCatalog({
        request
      });

      return json({
        data: {
          ...rawData,
          dimensionCatalog,
          categoryEditor: {
            ...buildCategoryViewModel({
              document: rawData.document,
              supportsPreference
            }),
            supportsPreference
          }
        },
        error: null
      });
    }

    if (CUSTOM_SEGMENTATION_EDITOR_TYPES.has(editorType)) {
      const { loadSegmentationCategoryCatalog } = await loadSegmentationCategoryCatalogModule();
      const categoryCatalog = await loadSegmentationCategoryCatalog({
        request
      });

      return json({
        data: {
          ...rawData,
          editorType,
          segmentationDefault: buildSegmentationDefaultViewModel({
            editorType,
            document: rawData.document
          }),
          categoryCatalog
        },
        error: null
      });
    }

    const data = await loadAdminDataDocument({
      request,
      id
    });

    return json({
      data,
      error: null
    });
  } catch (error) {
    const status = error?.name === "AdminDataApiError" ? error.statusCode : 500;

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
  const { saveAdminDataDocument, saveRawAdminDataDocument } = await loadAdminDataServerModule();
  const formData = await request.formData();
  const description = readFormString(formData, "description");
  const editorType = readFormString(formData, "editorType").trim();
  const shape = readFormString(formData, "shape");
  const expectedVersion = readFormNumber(formData, "expectedVersion");
  const columns = parseJsonField(formData, "columns", []);
  const rows = parseJsonField(formData, "rows", []);
  const document = parseJsonField(formData, "document", null);
  const editor = parseJsonField(formData, "editor", null);
  const metadata = parseJsonField(formData, "metadata", null);
  const segmentationStructure = readFormString(formData, "segmentationStructure").trim();
  const segmentationRows = parseJsonField(formData, "segmentationRows", []);
  const dimensionDefinitionRows = parseJsonField(formData, "dimensionDefinitionRows", []);
  const categoryRows = parseJsonField(formData, "categoryRows", []);
  const customDocumentType = readFormString(formData, "customDocumentType").trim();
  const supportsPreference = readFormString(formData, "supportsPreference").trim() === "true";

  try {
    if (customDocumentType === "dimension-definition") {
      const saved = await saveRawAdminDataDocument({
        request,
        id,
        metadata: metadata && typeof metadata === "object" ? metadata : null,
        description,
        expectedVersion,
        editor: editor && typeof editor === "object" ? editor : null,
        document: buildDimensionDefinitionDocument({
          sourceDocument: document,
          rows: Array.isArray(dimensionDefinitionRows) ? dimensionDefinitionRows : []
        })
      });

      return json({
        ok: true,
        saved,
        error: null
      });
    }

    if (customDocumentType === "categories") {
      const saved = await saveRawAdminDataDocument({
        request,
        id,
        metadata: metadata && typeof metadata === "object" ? metadata : null,
        description,
        expectedVersion,
        editor: editor && typeof editor === "object" ? editor : null,
        document: buildCategoryDocument({
          sourceDocument: document,
          rows: Array.isArray(categoryRows) ? categoryRows : [],
          supportsPreference
        })
      });

      return json({
        ok: true,
        saved,
        error: null
      });
    }

    if (CUSTOM_SEGMENTATION_EDITOR_TYPES.has(editorType)) {
      const saved = await saveRawAdminDataDocument({
        request,
        id,
        metadata: metadata && typeof metadata === "object" ? metadata : null,
        description,
        expectedVersion,
        editor: editor && typeof editor === "object" ? editor : null,
        document: buildSegmentationDefaultDocument({
          sourceDocument: document,
          structure: segmentationStructure,
          rows: Array.isArray(segmentationRows) ? segmentationRows : []
        })
      });

      return json({
        ok: true,
        saved,
        error: null
      });
    }

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
    const status = error?.name === "AdminDataApiError" ? error.statusCode : 500;

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

  if (CUSTOM_SEGMENTATION_EDITOR_TYPES.has(data.editorType)) {
    return (
      <SegmentationDefaultEditorPage
        data={data}
        actionData={actionData}
        isSaving={navigation.state === "submitting"}
      />
    );
  }

  if (data.metadata?.type === "dimension-definition") {
    return (
      <DimensionDefinitionEditorPage
        data={data}
        actionData={actionData}
        isSaving={navigation.state === "submitting"}
      />
    );
  }

  if (data.metadata?.type === "categories") {
    return (
      <CategoryEditorPage
        data={data}
        actionData={actionData}
        isSaving={navigation.state === "submitting"}
      />
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
