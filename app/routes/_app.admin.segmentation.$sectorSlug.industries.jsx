import { json } from "@remix-run/node";
import { Alert, AlertDescription, AlertIcon } from "@chakra-ui/react";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";

import { SifTaxonomyEditorPage } from "../components/SegmentationPage";
import { AdminDataApiError } from "../models/admin-data.server";
import { findSectorBySlug } from "../models/sif-taxonomy";
import { loadSifTaxonomyDocument } from "../models/sif-taxonomy.server";
import {
  buildRouteError,
  handleSifTaxonomyAction
} from "../models/sif-taxonomy-route.server";

export async function loader({ request, params }) {
  try {
    const data = await loadSifTaxonomyDocument({
      request
    });
    const sector = findSectorBySlug(data.document, params.sectorSlug);

    if (!sector) {
      return json(
        {
          data: null,
          sector: null,
          error: {
            message: "That sector could not be found in the SIF taxonomy."
          }
        },
        {
          status: 404
        }
      );
    }

    return json({
      data,
      sector,
      error: null
    });
  } catch (error) {
    const status = error instanceof AdminDataApiError ? error.statusCode : 500;

    return json(
      {
        data: null,
        sector: null,
        error: buildRouteError(error)
      },
      {
        status
      }
    );
  }
}

export async function action({ request, params }) {
  return handleSifTaxonomyAction({
    request,
    params
  });
}

export default function AdminSegmentationIndustriesRoute() {
  const { data, sector, error } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  if (!data || !sector) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertDescription>{error?.message || "Unable to load the SIF industries."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <SifTaxonomyEditorPage
      taxonomyData={data}
      items={Array.isArray(sector.industries) ? sector.industries : []}
      kind="industry"
      sector={sector}
      actionData={actionData}
      isSaving={navigation.state === "submitting"}
    />
  );
}

