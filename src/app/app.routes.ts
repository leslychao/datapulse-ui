import {Routes} from "@angular/router";

import {APP_ROUTE_SEGMENTS} from "./core/app-paths";

export const appRoutes: Routes = [
  {
    path: "",
    pathMatch: "full",
    redirectTo: `${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.selectAccount}`
  },
  {
    path: APP_ROUTE_SEGMENTS.app,
    children: [
      {
        path: APP_ROUTE_SEGMENTS.selectAccount,
        loadComponent: () =>
          import("./pages/account-select/account-select-page.component").then(
            (m) => m.AccountSelectPageComponent
          )
      },
      {
        path: APP_ROUTE_SEGMENTS.onboarding,
        loadComponent: () =>
          import("./pages/onboarding/onboarding-page.component").then(
            (m) => m.OnboardingPageComponent
          )
      },
      {
        path: ":accountId",
        children: [
          {
            path: APP_ROUTE_SEGMENTS.dashboard,
            loadComponent: () =>
              import("./pages/dashboard/dashboard-page.component").then(
                (m) => m.DashboardPageComponent
              )
          },
          {
            path: APP_ROUTE_SEGMENTS.admin,
            children: [
              {
                path: APP_ROUTE_SEGMENTS.connections,
                loadComponent: () =>
                  import("./pages/admin-connections/admin-connections-page.component").then(
                    (m) => m.AdminConnectionsPageComponent
                  )
              },
              {
                path: APP_ROUTE_SEGMENTS.operators,
                loadComponent: () =>
                  import("./pages/admin-operators/admin-operators-page.component").then(
                    (m) => m.AdminOperatorsPageComponent
                  )
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: "**",
    redirectTo: `${APP_ROUTE_SEGMENTS.app}/${APP_ROUTE_SEGMENTS.selectAccount}`
  }
];
