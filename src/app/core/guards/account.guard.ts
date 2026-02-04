import {inject} from "@angular/core";
import {CanActivateChildFn, Router} from "@angular/router";
import {catchError, map, of, take} from "rxjs";

import {AccountCatalogService, AccountContextService} from "../state";
import {APP_PATHS} from "../app-paths";

export const accountGuard: CanActivateChildFn = (_route, state) => {
  const accountCatalog = inject(AccountCatalogService);
  const accountContext = inject(AccountContextService);
  const router = inject(Router);
  const isOnboardingRoute = state.url.startsWith(APP_PATHS.onboarding);

  return accountCatalog.load().pipe(
    take(1),
    map((accounts) => {
      if (accounts.length === 0 && !isOnboardingRoute) {
        accountContext.clear();
        return router.parseUrl(APP_PATHS.onboarding);
      }
      if (accounts.length === 0) {
        accountContext.clear();
      }
      if (accounts.length > 0 && isOnboardingRoute) {
        return router.parseUrl(APP_PATHS.workspaces);
      }
      return true;
    }),
    catchError(() => of(true))
  );
};
