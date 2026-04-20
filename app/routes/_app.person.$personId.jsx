import { json } from "@remix-run/node";
import { Box } from "@chakra-ui/react";
import { Outlet, useLoaderData, useLocation, useNavigation } from "@remix-run/react";
import { BlockingLoadingOverlay } from "../components/BlockingLoadingOverlay";
import { PersonDetailLayout } from "../components/PersonDetailLayout";
import { loadEntityDetailPage } from "../models/entity-detail.server";
import { buildPersonDetailTabPath } from "../models/entity-route.mjs";
import {
  getPersonDetailTabUiState,
  shouldRevalidatePersonDetailRoute
} from "../models/person-detail-tabs.mjs";
import {
  PERSON_DETAIL_TABS
} from "../models/person-detail-config.mjs";

export async function loader({ request, params }) {
  return json(
    await loadEntityDetailPage({
      request,
      entityType: "person",
      uuid: params.personId || ""
    })
  );
}

export function shouldRevalidate(args) {
  return shouldRevalidatePersonDetailRoute(args);
}

export default function PersonDetailRoute() {
  const data = useLoaderData();
  const location = useLocation();
  const navigation = useNavigation();
  const tabs = PERSON_DETAIL_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    to: buildPersonDetailTabPath(data.uuid, tab.key)
  })).filter((tab) => tab.to);
  const tabState = getPersonDetailTabUiState({
    personUUID: data.uuid,
    currentPathname: location.pathname,
    navigationState: navigation.state,
    navigationPathname: navigation.location?.pathname || null
  });

  return (
    <PersonDetailLayout tabs={tabs} activeTabKey={tabState.activeTabKey} data={data}>
      <Box position="relative" minH="240px">
        <Outlet context={{ personDetail: data }} />
        {tabState.isLoading ? (
          <BlockingLoadingOverlay
            label={tabState.label || "Loading..."}
            zIndex={2}
            position="absolute"
            borderRadius="20px"
          />
        ) : null}
      </Box>
    </PersonDetailLayout>
  );
}
