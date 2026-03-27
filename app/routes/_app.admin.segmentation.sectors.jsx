import { json } from "@remix-run/node";
import { Alert, AlertDescription, AlertIcon } from "@chakra-ui/react";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";

import { SifTaxonomyEditorPage } from "../components/SegmentationPage";
import { AdminDataApiError } from "../models/admin-data.server";
import { loadSifTaxonomyDocument } from "../models/sif-taxonomy.server";
import {
  buildRouteError,
  handleSifTaxonomyAction
} from "../models/sif-taxonomy-route.server";

export async function loader({ request }) {
  try {
    const data = await loadSifTaxonomyDocument({
      request
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
  return handleSifTaxonomyAction({
    request,
    params
  });
}

export default function AdminSegmentationSectorsRoute() {
  const { data, error } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  if (!data) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertDescription>{error?.message || "Unable to load the SIF sectors."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <SifTaxonomyEditorPage
      taxonomyData={data}
      items={Array.isArray(data.document?.sectors) ? data.document.sectors : []}
      kind="sector"
      actionData={actionData}
      isSaving={navigation.state === "submitting"}
    />
  );
}

