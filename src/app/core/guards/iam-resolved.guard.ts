import {inject} from "@angular/core";
import {CanMatchFn, Router} from "@angular/router";
import {map, take} from "rxjs";

import {APP_PATHS} from "../app-paths";
import {IamService} from "../state";

export const iamResolvedGuard: CanMatchFn = () => {
  const iamService = inject(IamService);
  const router = inject(Router);

  return iamService.state$.pipe(
    take(1),
    map((state) => (state === "READY" ? true : router.parseUrl(APP_PATHS.login)))
  );
};
