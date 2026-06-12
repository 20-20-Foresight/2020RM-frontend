import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { CompanyResearchPriorityManagerPage } from "../components/CompanyResearchPriorityManagerPage";
import {
  DEFAULT_ACTIVITY,
  CompanyResearchSettingsApiError,
  DEFAULT_SETTINGS,
  loadCompanyResearchSettingsDocument,
  normalizeCompanyResearchSettingsDocument,
  saveCompanyResearchSettingsDocument,
} from "../models/company-research-settings.server";

export async function loader({ request }) {
  const data = await loadCompanyResearchSettingsDocument({ request });
  return json({
    id: data.id,
    version: data.version ?? null,
    settings: data.document,
    activity: data.activity || DEFAULT_ACTIVITY,
  });
}

export async function action({ request }) {
  const formData = await request.formData();
  const settingsJson = String(formData.get("settingsJson") || "");
  const expectedVersionRaw = formData.get("expectedVersion");

  let settings;
  try {
    settings = normalizeCompanyResearchSettingsDocument(
      settingsJson ? JSON.parse(settingsJson) : {}
    );
  } catch (_error) {
    return json({ error: "Settings payload is invalid." }, { status: 400 });
  }

  const expectedVersion = Number.isFinite(Number(expectedVersionRaw))
    ? Number(expectedVersionRaw)
    : null;

  let saved;
  try {
    saved = await saveCompanyResearchSettingsDocument({
      request,
      expectedVersion,
      document: settings,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error:
          error instanceof CompanyResearchSettingsApiError
            ? error.message
            : "Unable to save Company Research settings.",
      },
      {
        status:
          error instanceof CompanyResearchSettingsApiError
            ? error.statusCode
            : 500,
      }
    );
  }

  return json({
    ok: true,
    version: saved.version ?? null,
    settings,
  });
}

export default function CompanyResearchPriorityManagerRoute() {
  const data = useLoaderData() || null;
  return (
    <CompanyResearchPriorityManagerPage
      initialSettings={data?.settings || DEFAULT_SETTINGS}
      initialVersion={data?.version ?? null}
      initialActivity={data?.activity || DEFAULT_ACTIVITY}
    />
  );
}
