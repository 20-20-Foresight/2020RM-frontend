import organizationDetailTabsModule from "./organization-detail-tabs.cjs";

export const {
  getOrganizationDetailTabUiState,
  isSameOrganizationDetailNavigation,
  parseOrganizationDetailPath,
  shouldRevalidateOrganizationDetailRoute
} = organizationDetailTabsModule;
