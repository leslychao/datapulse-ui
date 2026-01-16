import {inject} from "@angular/core";
import {CanActivateFn, Router} from "@angular/router";
import {catchError, map, of, take} from "rxjs";

import {AccountApi} from "../api";
import {AccountContextService} from "../state";
import {APP_PATHS} from "../app-paths";

export const onboardingGuard: CanActivateFn = () => {
  const accountApi = inject(AccountApi);
  const accountContext = inject(AccountContextService);
  const router = inject(Router);

  return accountApi.list().pipe(
    take(1),
    map((accounts) => {
      if (accounts.length === 0) {
        accountContext.clear();
        return router.parseUrl(APP_PATHS.onboarding);
      }

      const lastSelectedAccountId = accountContext.snapshot;
      if (lastSelectedAccountId != null) {
        const hasSelectedAccount = accounts.some((account) => account.id === lastSelectedAccountId);
        if (hasSelectedAccount) {
          return router.parseUrl(APP_PATHS.overview(lastSelectedAccountId));
        }
        accountContext.clear();
      }

      return router.parseUrl(APP_PATHS.selectAccount);
    }),
    catchError(() => of(router.parseUrl(APP_PATHS.selectAccount)))
  );
};
