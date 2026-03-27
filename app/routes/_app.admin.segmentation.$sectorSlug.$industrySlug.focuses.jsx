import { json } from "@remix-run/node";
import { Alert, AlertDescription, AlertIcon } from "@chakra-ui/react";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";

import { SifTaxonomyEditorPage } from "../components/SegmentationPage";
import { AdminDataApiError } from "../models/admin-data.server";
import {
  findIndustryBySlug,
  findSectorBySlug
} from "../models/sif-taxonomy";
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
    const industry = findIndustryBySlug(data.document, params.sectorSlug, params.industrySlug);

    if (!sector || !industry) {
      return json(
        {
          data: null,
          sector: null,
          industry: null,
          error: {
            message: "That industry could not be found in the selected SIF sector."
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
      industry,
      error: null
    });
  } catch (error) {
    const status = error instanceof AdminDataApiError ? error.statusCode : 500;

    return json(
      {
        data: null,
        sector: null,
        industry: null,
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

export default function AdminSegmentationFocusesRoute() {
  const { data, sector, industry, error } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  if (!data || !sector || !industry) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertDescription>{error?.message || "Unable to load the SIF focuses."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <SifTaxonomyEditorPage
      taxonomyData={data}
      items={Array.isArray(industry.focuses) ? industry.focuses : []}
      kind="focus"
      sector={sector}
      industry={industry}
      actionData={actionData}
      isSaving={navigation.state === "submitting"}
    />
  );
}

