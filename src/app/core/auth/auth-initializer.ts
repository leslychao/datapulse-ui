import {inject} from "@angular/core";
import {firstValueFrom, tap} from "rxjs";

import {AuthSessionService} from "./auth-session.service";
import {AUTH_SESSION_FLAG} from "./auth-storage";

export const authInitializer = () => {
  const authSession = inject(AuthSessionService);

  return () =>
    firstValueFrom(
      authSession.refresh().pipe(
        tap((state) => {
          const hasSessionFlag = sessionStorage.getItem(AUTH_SESSION_FLAG) === "true";

          if (state.authenticated) {
            sessionStorage.setItem(AUTH_SESSION_FLAG, "true");
          } else {
            sessionStorage.removeItem(AUTH_SESSION_FLAG);
          }
        })
      )
    );
};
