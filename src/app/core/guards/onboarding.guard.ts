import {inject} from "@angular/core";
import {CanActivateFn, Router} from "@angular/router";
import {catchError, map, of, take} from "rxjs";

import {AccountApi} from "../api";
import {APP_PATHS} from "../app-paths";

export const onboardingGuard: CanActivateFn = () => {
  const accountApi = inject(AccountApi);
  const router = inject(Router);

  return accountApi.list().pipe(
    take(1),
    map((accounts) => {
      if (accounts.length === 0) {
        return router.parseUrl(APP_PATHS.onboarding);
      }
      return router.parseUrl(APP_PATHS.selectAccount);
    }),
    catchError(() => of(router.parseUrl(APP_PATHS.selectAccount)))
  );
};
