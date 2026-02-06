import {Routes} from "@angular/router";

import {APP_ROUTE_SEGMENTS} from "./core/app-paths";
import {authGuard} from "./core/guards/auth.guard";
import {accountGuard} from "./core/guards/account.guard";
import {accountIdGuard} from "./core/guards/account-id.guard";
import {iamResolvedGuard} from "./core/guards/iam-resolved.guard";
import {accountsPresentGuard} from "./core/guards/accounts-present.guard";
import {gettingStartedGuard} from "./core/guards/getting-started.guard";
import {accountlessRouteMatcher} from "./core/routing/accountless-route.matcher";

export const appRoutes: Routes = [
  {
    path: "",
    pathMatch: "full",
    loadComponent: () =>
      import("./pages/login/login-page.component").then((m) => m.LoginPageComponent)
  },
  {
    path: APP_ROUTE_SEGMENTS.login,
    loadComponent: () =>
      import("./pages/login/login-page.component").then((m) => m.LoginPageComponent)
  },
  {
    path: APP_ROUTE_SEGMENTS.workspaces,
    canMatch: [authGuard, iamResolvedGuard, accountsPresentGuard],
    loadComponent: () =>
      import("./pages/workspaces/workspaces-page.component").then(
        (m) => m.WorkspacesPageComponent
      )
  },
  {
    path: `${APP_ROUTE_SEGMENTS.workspaces}/${APP_ROUTE_SEGMENTS.workspacesCreate}`,
    canMatch: [authGuard, iamResolvedGuard, accountsPresentGuard],
    loadComponent: () =>
      import("./pages/workspace-create/workspace-create-page.component").then(
        (m) => m.WorkspaceCreatePageComponent
      )
  },
  {
    path: `${APP_ROUTE_SEGMENTS.workspaces}/:accountId`,
    canMatch: [authGuard, iamResolvedGuard, accountsPresentGuard],
    loadComponent: () =>
      import("./pages/workspaces/workspaces-page.component").then(
        (m) => m.WorkspacesPageComponent
      )
  },
  {
    path: APP_ROUTE_SEGMENTS.gettingStarted,
    canMatch: [authGuard, iamResolvedGuard, gettingStartedGuard],
    loadComponent: () =>
      import("./pages/getting-started/getting-started-page.component").then(
        (m) => m.GettingStartedPageComponent
      )
  },
  {
    path: APP_ROUTE_SEGMENTS.app,
    canMatch: [authGuard, iamResolvedGuard],
    canActivateChild: [accountGuard],
    children: [
      {
        path: "",
        pathMatch: "full",
        redirectTo: "/workspaces"
      },
      {
        matcher: accountlessRouteMatcher,
        loadComponent: () =>
          import("./pages/accountless-redirect/accountless-redirect-page.component").then(
            (m) => m.AccountlessRedirectPageComponent
          )
      },
      {
        path: ":accountId",
        canActivateChild: [accountIdGuard],
        children: [
          {
            path: APP_ROUTE_SEGMENTS.overview,
            loadComponent: () =>
              import("./pages/overview/overview-page.component").then(
                (m) => m.OverviewPageComponent
              )
          },
          {
            path: APP_ROUTE_SEGMENTS.finance,
            children: [
              {
                path: APP_ROUTE_SEGMENTS.pnl,
                loadComponent: () =>
                  import("./pages/finance-pnl/finance-pnl-page.component").then(
                    (m) => m.FinancePnlPageComponent
                  )
              },
              {
                path: APP_ROUTE_SEGMENTS.unitEconomics,
                loadComponent: () =>
                  import(
                    "./pages/finance-unit-economics/finance-unit-economics-page.component"
                  ).then((m) => m.FinanceUnitEconomicsPageComponent)
              }
            ]
          },
          {
            path: APP_ROUTE_SEGMENTS.operations,
            children: [
              {
                path: APP_ROUTE_SEGMENTS.inventoryDoc,
                loadComponent: () =>
                  import(
                    "./pages/operations-inventory/operations-inventory-page.component"
                  ).then((m) => m.OperationsInventoryPageComponent)
              },
              {
                path: APP_ROUTE_SEGMENTS.returnsBuyout,
                loadComponent: () =>
                  import(
                    "./pages/operations-returns/operations-returns-page.component"
                  ).then((m) => m.OperationsReturnsPageComponent)
              },
              {
                path: APP_ROUTE_SEGMENTS.salesMonitoring,
                loadComponent: () =>
                  import(
                    "./pages/operations-sales/operations-sales-page.component"
                  ).then((m) => m.OperationsSalesPageComponent)
              }
            ]
          },
          {
            path: APP_ROUTE_SEGMENTS.marketing,
            children: [
              {
                path: APP_ROUTE_SEGMENTS.ads,
                loadComponent: () =>
                  import("./pages/marketing-ads/marketing-ads-page.component").then(
                    (m) => m.MarketingAdsPageComponent
                  )
              }
            ]
          },
          {
            path: APP_ROUTE_SEGMENTS.monitoring,
            loadComponent: () =>
              import("./pages/monitoring/monitoring-page.component").then(
                (m) => m.MonitoringPageComponent
              )
          },
          {
            path: APP_ROUTE_SEGMENTS.connections,
            loadComponent: () =>
              import("./pages/connections/connections-page.component").then(
                (m) => m.ConnectionsPageComponent
              )
          },
          {
            path: APP_ROUTE_SEGMENTS.users,
            loadComponent: () =>
              import("./pages/users-access/users-access-page.component").then(
                (m) => m.UsersAccessPageComponent
              )
          },
          {
            path: `${APP_ROUTE_SEGMENTS.settings}/${APP_ROUTE_SEGMENTS.profile}`,
            loadComponent: () =>
              import("./pages/profile/profile-page.component").then(
                (m) => m.ProfilePageComponent
              )
          },
          {
            path: APP_ROUTE_SEGMENTS.settings,
            loadComponent: () =>
              import("./pages/workspace-settings/workspace-settings-page.component").then(
                (m) => m.WorkspaceSettingsPageComponent
              )
          }
        ]
      }
    ]
  },
  {
    path: "**",
    redirectTo: ""
  }
];
