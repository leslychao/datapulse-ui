import {inject} from "@angular/core";
import {ActivatedRouteSnapshot, CanActivateChildFn, Router} from "@angular/router";
import {catchError, map, of, take} from "rxjs";

import {APP_PATHS} from "../app-paths";
import {AccountCatalogService, AccountContextService} from "../state";

const readAccountId = (route: ActivatedRouteSnapshot): number | null => {
  const accountIdParam = route.parent?.paramMap.get("accountId");
  const accountId = Number(accountIdParam);
  return Number.isFinite(accountId) ? accountId : null;
};

export const accountIdGuard: CanActivateChildFn = (route) => {
  const accountCatalog = inject(AccountCatalogService);
  const accountContext = inject(AccountContextService);
  const router = inject(Router);

  const accountId = readAccountId(route);
  if (accountId == null) {
    accountContext.clear();
    return router.parseUrl(APP_PATHS.workspaces);
  }

  return accountCatalog.load().pipe(
    take(1),
    map((accounts) => {
      if (accounts.length === 0) {
        accountContext.clear();
        return router.parseUrl(APP_PATHS.gettingStarted);
      }
      const hasMatch = accounts.some((account) => account.id === accountId);
      if (!hasMatch) {
        accountContext.clear();
        return router.parseUrl(APP_PATHS.workspaces);
      }
      const matched = accounts.find((account) => account.id === accountId);
      accountContext.setWorkspace({id: accountId, name: matched ? matched.name : null});
      return true;
    }),
    catchError(() => of(true))
  );
};
