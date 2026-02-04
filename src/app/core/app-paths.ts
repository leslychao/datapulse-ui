export const APP_ROUTE_SEGMENTS = {
  login: "login",
  app: "app",
  onboarding: "onboarding",
  overview: "overview",
  finance: "finance",
  pnl: "pnl",
  unitEconomics: "unit-economics",
  operations: "operations",
  inventoryDoc: "inventory-doc",
  returnsBuyout: "returns-buyout",
  salesMonitoring: "sales-monitoring",
  marketing: "marketing",
  ads: "ads",
  monitoring: "monitoring",
  users: "users",
  connections: "connections",
  workspaces: "workspaces",
  workspacesCreate: "create",
  workspaceSettings: "workspace-settings",
  profile: "profile"
} as const;

export const APP_PATHS = {
  login: `/${APP_ROUTE_SEGMENTS.login}`,
  root: `/${APP_ROUTE_SEGMENTS.app}`,
  workspaces: `/${APP_ROUTE_SEGMENTS.workspaces}`,
  workspacesAccount: (accountId: number) => `/${APP_ROUTE_SEGMENTS.workspaces}/${accountId}`,
  workspacesCreate: `/${APP_ROUTE_SEGMENTS.workspaces}/${APP_ROUTE_SEGMENTS.workspacesCreate}`,
  onboarding: `/${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.onboarding}`,
  overview: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.overview}`,
  financePnl: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.finance}/${APP_ROUTE_SEGMENTS.pnl}`,
  financeUnitEconomics: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.finance}/${APP_ROUTE_SEGMENTS.unitEconomics}`,
  operationsInventory: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.operations}/${APP_ROUTE_SEGMENTS.inventoryDoc}`,
  operationsReturns: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.operations}/${APP_ROUTE_SEGMENTS.returnsBuyout}`,
  operationsSalesMonitoring: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.operations}/${APP_ROUTE_SEGMENTS.salesMonitoring}`,
  marketingAds: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.marketing}/${APP_ROUTE_SEGMENTS.ads}`,
  monitoring: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.monitoring}`,
  connections: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.connections}`,
  users: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.users}`,
  workspaceSettings: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.workspaceSettings}`,
  profile: `/${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.profile}`
} as const;
