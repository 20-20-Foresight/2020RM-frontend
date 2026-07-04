import personDetailTabsModule from "./person-detail-tabs.cjs";

export const {
  getPersonDetailTabUiState,
  isSamePersonDetailNavigation,
  parsePersonDetailPath,
  shouldRevalidatePersonDetailRoute
} = personDetailTabsModule;
