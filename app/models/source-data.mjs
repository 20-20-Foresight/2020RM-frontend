import sourceDataModule from "./source-data.cjs";

export const {
  PRIMARY_RECORD_TAB_KEY,
  SUPPORTED_SOURCE_TABS,
  buildSourceDataTabs,
  buildSalesforceRecordCards,
  collectExternalOrganizations,
  hasSourceDataTabs,
  resolveSourceDataTabKey
} = sourceDataModule;
