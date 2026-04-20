import { json } from "@remix-run/node";
import { Box } from "@chakra-ui/react";
import { Outlet, useLoaderData, useLocation, useNavigation } from "@remix-run/react";
import { BlockingLoadingOverlay } from "../components/BlockingLoadingOverlay";
import { OrganizationDetailLayout } from "../components/OrganizationDetailLayout";
import { loadEntityDetailPage } from "../models/entity-detail.server";
import {
  buildOrganizationDetailTabPath
} from "../models/entity-route.mjs";
import {
  getOrganizationDetailTabUiState,
  shouldRevalidateOrganizationDetailRoute
} from "../models/organization-detail-tabs.mjs";
import {
  ORGANIZATION_DETAIL_TABS
} from "../models/organization-detail-config.mjs";

export async function loader({ request, params }) {
  return json(
    await loadEntityDetailPage({
      request,
      entityType: "organization",
      uuid: params.organizationId || ""
    })
  );
}

export function shouldRevalidate(args) {
  return shouldRevalidateOrganizationDetailRoute(args);
}

export default function OrganizationDetailRoute() {
  const data = useLoaderData();
  const location = useLocation();
  const navigation = useNavigation();
  const tabs = ORGANIZATION_DETAIL_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    to: buildOrganizationDetailTabPath(data.uuid, tab.key)
  })).filter((tab) => tab.to);
  const tabState = getOrganizationDetailTabUiState({
    organizationUUID: data.uuid,
    currentPathname: location.pathname,
    navigationState: navigation.state,
    navigationPathname: navigation.location?.pathname || null
  });

  return (
    <OrganizationDetailLayout tabs={tabs} activeTabKey={tabState.activeTabKey} data={data}>
      <Box position="relative" minH="240px">
        <Outlet context={{ organizationDetail: data }} />
        {tabState.isLoading ? (
          <BlockingLoadingOverlay
            label={tabState.label || "Loading..."}
            zIndex={2}
            position="absolute"
            borderRadius="20px"
          />
        ) : null}
      </Box>
    </OrganizationDetailLayout>
  );
}
