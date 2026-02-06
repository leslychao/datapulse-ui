import {inject} from "@angular/core";
import {CanMatchFn, Router} from "@angular/router";
import {catchError, map, of, take} from "rxjs";

import {AccountCatalogService, AccountContextService} from "../state";
import {APP_PATHS} from "../app-paths";

export const gettingStartedGuard: CanMatchFn = () => {
  const accountCatalog = inject(AccountCatalogService);
  const accountContext = inject(AccountContextService);
  const router = inject(Router);

  return accountCatalog.load().pipe(
    take(1),
    map((accounts) => {
      if (accounts.length === 0) {
        accountContext.clear();
        return true;
      }

      const currentAccountId = accountContext.snapshot;
      const matched = accounts.find((account) => account.id === currentAccountId) ?? accounts[0];
      if (matched) {
        accountContext.setAccountId(matched.id);
        return router.parseUrl(APP_PATHS.overview(matched.id));
      }

      return router.parseUrl(APP_PATHS.workspaces);
    }),
    catchError(() => of(true))
  );
};
