import {inject} from "@angular/core";
import {CanMatchFn, Router} from "@angular/router";
import {catchError, map, of, take} from "rxjs";

import {AccountCatalogService, AccountContextService} from "../state";
import {APP_PATHS} from "../app-paths";

export const accountsPresentGuard: CanMatchFn = () => {
  const accountCatalog = inject(AccountCatalogService);
  const accountContext = inject(AccountContextService);
  const router = inject(Router);

  return accountCatalog.load().pipe(
    take(1),
    map((accounts) => {
      if (accounts.length === 0) {
        accountContext.clear();
        return router.parseUrl(APP_PATHS.gettingStarted);
      }
      return true;
    }),
    catchError(() => of(true))
  );
};
