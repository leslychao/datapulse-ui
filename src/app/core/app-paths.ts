export const APP_ROUTE_SEGMENTS = {
  login: "login",
  app: "app",
  home: "home",
  summary: "summary",
  selectAccount: "select-account",
  onboarding: "onboarding",
  dashboard: "dashboard",
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
  dataHealth: "data-health",
  freshness: "freshness",
  settings: "settings",
  users: "users",
  admin: "admin",
  connections: "connections",
  operators: "operators"
} as const;

export const APP_PATHS = {
  login: `/${APP_ROUTE_SEGMENTS.login}`,
  root: `/${APP_ROUTE_SEGMENTS.app}`,
  home: `/${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.home}`,
  selectAccount: `/${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.selectAccount}`,
  onboarding: `/${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.onboarding}`,
  homeSummary: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.home}/${APP_ROUTE_SEGMENTS.summary}`,
  dashboard: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.dashboard}`,
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
  dataHealthFreshness: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.dataHealth}/${APP_ROUTE_SEGMENTS.freshness}`,
  settingsConnections: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.settings}/${APP_ROUTE_SEGMENTS.connections}`,
  settingsUsers: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.settings}/${APP_ROUTE_SEGMENTS.users}`,
  adminConnections: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.admin}/${APP_ROUTE_SEGMENTS.connections}`,
  adminOperators: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.admin}/${APP_ROUTE_SEGMENTS.operators}`
} as const;
