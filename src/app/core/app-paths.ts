export const APP_ROUTE_SEGMENTS = {
  app: "app",
  selectAccount: "select-account",
  onboarding: "onboarding",
  dashboard: "dashboard",
  admin: "admin",
  connections: "connections",
  operators: "operators"
} as const;

export const APP_PATHS = {
  root: `/${APP_ROUTE_SEGMENTS.app}`,
  selectAccount: `/${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.selectAccount}`,
  onboarding: `/${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.onboarding}`,
  dashboard: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.dashboard}`,
  adminConnections: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.admin}/${APP_ROUTE_SEGMENTS.connections}`,
  adminOperators: (accountId: number) =>
    `/${APP_ROUTE_SEGMENTS.app}/${accountId}/${APP_ROUTE_SEGMENTS.admin}/${APP_ROUTE_SEGMENTS.operators}`
} as const;
