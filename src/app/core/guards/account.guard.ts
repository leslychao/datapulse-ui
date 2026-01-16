import {inject} from "@angular/core";
import {CanActivateChildFn, Router} from "@angular/router";
import {catchError, map, of, take} from "rxjs";

import {AccountApi} from "../api";
import {APP_PATHS} from "../app-paths";

export const accountGuard: CanActivateChildFn = (_route, state) => {
  const accountApi = inject(AccountApi);
  const router = inject(Router);
  const isOnboardingRoute = state.url.startsWith(APP_PATHS.onboarding);

  return accountApi.list().pipe(
    take(1),
    map((accounts) => {
      if (accounts.length === 0 && !isOnboardingRoute) {
        return router.parseUrl(APP_PATHS.onboarding);
      }
      return true;
    }),
    catchError(() => of(true))
  );
};
