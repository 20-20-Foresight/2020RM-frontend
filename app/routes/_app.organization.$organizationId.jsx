import { json } from "@remix-run/node";
import { Box } from "@chakra-ui/react";
import { Outlet, useLoaderData, useLocation, useNavigation } from "@remix-run/react";
import { BlockingLoadingOverlay } from "../components/BlockingLoadingOverlay";
import { EntityDetailPage } from "../components/EntityDetailPage";
import { loadEntityDetailPage } from "../models/entity-detail.server";
import {
  buildEntityDetailPath,
  buildOrganizationPeoplePath
} from "../models/entity-route";
import {
  getOrganizationDetailTabUiState,
  shouldRevalidateOrganizationDetailRoute
} from "../models/organization-detail-tabs.mjs";

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
  const tabs = [
    {
      key: "info",
      label: "Info",
      to: buildEntityDetailPath("organization", data.uuid)
    },
    {
      key: "people",
      label: "People",
      to: buildOrganizationPeoplePath(data.uuid)
    }
  ].filter((tab) => tab.to);
  const tabState = getOrganizationDetailTabUiState({
    organizationUUID: data.uuid,
    currentPathname: location.pathname,
    navigationState: navigation.state,
    navigationPathname: navigation.location?.pathname || null
  });
  const shouldRenderTabBody = tabState.activeTabKey === "people" || tabState.isLoading;

  return (
    <EntityDetailPage entityType="organization" tabs={tabs} activeTabKey={tabState.activeTabKey} data={data}>
      {shouldRenderTabBody ? (
        <Box position="relative" minH="240px">
          {tabState.activeTabKey === "people" ? <Outlet /> : null}
          {tabState.isLoading ? (
            <BlockingLoadingOverlay
              label={tabState.label || "Loading..."}
              zIndex={2}
              position="absolute"
              borderRadius="16px"
            />
          ) : null}
        </Box>
      ) : null}
    </EntityDetailPage>
  );
}
