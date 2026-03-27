const { json } = require("@remix-run/node");

const { AdminDataApiError } = require("./admin-data.server");
const {
  SIF_TAXONOMY_DESCRIPTION,
  addSifTaxonomyNode,
  updateSifTaxonomyNode
} = require("./sif-taxonomy");
const {
  loadSifTaxonomyDocument,
  saveSifTaxonomyDocument
} = require("./sif-taxonomy.server");

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
    message: error instanceof Error ? error.message : "Unable to load the SIF taxonomy."
  };
}

/**
 * Reads one trimmed form string value.
 * @param {FormData} formData
 * @param {string} name
 * @returns {string}
 */
function readFormString(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads one checkbox-style form value.
 * @param {FormData} formData
 * @param {string} name
 * @returns {boolean}
 */
function readFormBoolean(formData, name) {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

/**
 * Splits one textarea/input value into a stable string list.
 * @param {string} value
 * @returns {string[]}
 */
function splitFormList(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Handles one SIF taxonomy mutation action for the active route.
 * @param {{request: Request, params?: Record<string, string|undefined>}} options
 * @returns {Promise<Response>}
 */
async function handleSifTaxonomyAction(options) {
  const formData = await options.request.formData();
  const intent = readFormString(formData, "intent");

  try {
    const current = await loadSifTaxonomyDocument({
      request: options.request
    });

    let nextDocument = current.document;

    if (intent === "update-node") {
      const kind = readFormString(formData, "kind");
      const nodeId = readFormString(formData, "nodeId");
      if (!kind || !nodeId) {
        return json(
          {
            ok: false,
            saved: null,
            error: {
              message: "The selected taxonomy node could not be identified."
            }
          },
          {
            status: 400
          }
        );
      }

      nextDocument = updateSifTaxonomyNode(current.document, {
        kind,
        nodeId,
        label: readFormString(formData, "label"),
        description: readFormString(formData, "description"),
        examples: splitFormList(readFormString(formData, "examples")),
        whyHere: readFormString(formData, "whyHere") || null,
        aliases: splitFormList(readFormString(formData, "aliases")),
        active: readFormBoolean(formData, "active"),
        crosswalkOnly: readFormBoolean(formData, "crosswalkOnly"),
        seenInCrosswalks: splitFormList(readFormString(formData, "seenInCrosswalks"))
      });
    } else if (intent === "add-node") {
      nextDocument = addSifTaxonomyNode(current.document, {
        kind: readFormString(formData, "kind"),
        sectorSlug: options.params?.sectorSlug || null,
        industrySlug: options.params?.industrySlug || null,
        label: readFormString(formData, "label"),
        description: readFormString(formData, "description")
      });
    } else {
      return json(
        {
          ok: false,
          saved: null,
          error: {
            message: "Unknown segmentation editor action."
          }
        },
        {
          status: 400
        }
      );
    }

    const saved = await saveSifTaxonomyDocument({
      request: options.request,
      expectedVersion: current.version,
      description: current.description || SIF_TAXONOMY_DESCRIPTION,
      document: nextDocument
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

module.exports = {
  buildRouteError,
  handleSifTaxonomyAction
};

