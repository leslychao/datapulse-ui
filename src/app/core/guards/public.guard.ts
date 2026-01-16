import {inject} from "@angular/core";
import {CanMatchFn, Router} from "@angular/router";
import {map, take} from "rxjs";

import {AuthSessionService} from "../auth";
import {APP_PATHS} from "../app-paths";

export const publicGuard: CanMatchFn = () => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  return authSession.state$.pipe(
    take(1),
    map((state) => (state.authenticated ? router.parseUrl(APP_PATHS.home) : true))
  );
};
