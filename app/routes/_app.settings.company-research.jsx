import CompanyResearchLayoutRoute from "../components/CompanyResearchLayoutPage";
import { json } from "@remix-run/node";
import {
  CompanyResearchMutationApiError,
  createCompanyResearchManualRequest,
} from "../models/company-research-mutations.server";

export async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create_manual_request") {
    try {
      const createdRequest = await createCompanyResearchManualRequest({
        request,
        formData,
      });
      return json({
        ok: true,
        request: createdRequest,
      });
    } catch (error) {
      return json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to create the Company Research request.",
        },
        {
          status:
            error instanceof CompanyResearchMutationApiError
              ? error.statusCode
              : 500,
        }
      );
    }
  }

  return json(
    {
      ok: false,
      error: "Unsupported Company Research action.",
    },
    { status: 400 }
  );
}

export default CompanyResearchLayoutRoute;
