import {Routes} from "@angular/router";

import {AccountSelectPageComponent} from "./features/account-select/account-select-page.component";
import {OnboardingPageComponent} from "./features/onboarding/onboarding-page.component";
import {DashboardPageComponent} from "./features/dashboard/dashboard-page.component";
import {AdminConnectionsPageComponent} from "./features/admin/connections/admin-connections-page.component";
import {AdminTeamPageComponent} from "./features/admin/team/admin-team-page.component";
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
      {path: APP_ROUTE_SEGMENTS.selectAccount, component: AccountSelectPageComponent},
      {path: APP_ROUTE_SEGMENTS.onboarding, component: OnboardingPageComponent},
      {
        path: ":accountId",
        children: [
          {path: APP_ROUTE_SEGMENTS.dashboard, component: DashboardPageComponent},
          {
            path: APP_ROUTE_SEGMENTS.admin,
            children: [
              {path: APP_ROUTE_SEGMENTS.connections, component: AdminConnectionsPageComponent},
              {path: APP_ROUTE_SEGMENTS.team, component: AdminTeamPageComponent}
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
