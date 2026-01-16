import {Routes} from "@angular/router";

import {APP_ROUTE_SEGMENTS} from "./core/app-paths";
import {authGuard} from "./core/guards/auth.guard";
import {publicGuard} from "./core/guards/public.guard";
import {onboardingGuard} from "./core/guards/onboarding.guard";
import {accountlessRouteMatcher} from "./core/routing/accountless-route.matcher";

export const appRoutes: Routes = [
  {
    path: "",
    pathMatch: "full",
    canMatch: [publicGuard],
    loadComponent: () =>
      import("./pages/login/login-page.component").then((m) => m.LoginPageComponent)
  },
  {
    path: APP_ROUTE_SEGMENTS.login,
    canMatch: [publicGuard],
    loadComponent: () =>
      import("./pages/login/login-page.component").then((m) => m.LoginPageComponent)
  },
  {
    path: APP_ROUTE_SEGMENTS.app,
    canMatch: [authGuard],
    children: [
      {
        path: "",
        pathMatch: "full",
        redirectTo: APP_ROUTE_SEGMENTS.home
      },
      {
        path: APP_ROUTE_SEGMENTS.home,
        canActivate: [onboardingGuard],
        loadComponent: () =>
          import("./pages/home/home-redirect-page.component").then(
            (m) => m.HomeRedirectPageComponent
          )
      },
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
        matcher: accountlessRouteMatcher,
        loadComponent: () =>
          import("./pages/accountless-redirect/accountless-redirect-page.component").then(
            (m) => m.AccountlessRedirectPageComponent
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
            path: APP_ROUTE_SEGMENTS.dataHealth,
            children: [
              {
                path: APP_ROUTE_SEGMENTS.freshness,
                loadComponent: () =>
                  import("./pages/data-freshness/data-freshness-page.component").then(
                    (m) => m.DataFreshnessPageComponent
                  )
              }
            ]
          },
          {
            path: APP_ROUTE_SEGMENTS.settings,
            children: [
              {
                path: APP_ROUTE_SEGMENTS.connections,
                loadComponent: () =>
                  import(
                    "./pages/settings-connections/settings-connections-page.component"
                  ).then((m) => m.SettingsConnectionsPageComponent)
              },
              {
                path: APP_ROUTE_SEGMENTS.users,
                loadComponent: () =>
                  import("./pages/settings-users/settings-users-page.component").then(
                    (m) => m.SettingsUsersPageComponent
                  )
              }
            ]
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
    redirectTo: ""
  }
];
