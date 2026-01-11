import {HttpErrorResponse, HttpInterceptorFn} from "@angular/common/http";
import {inject} from "@angular/core";
import {catchError, throwError} from "rxjs";

import {AuthRedirectService} from "./auth-redirect.service";
import {AuthSessionService} from "./auth-session.service";
import {AppStateService} from "../state";

export const authHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const authRedirectService = inject(AuthRedirectService);
  const authSessionService = inject(AuthSessionService);
  const appStateService = inject(AppStateService);

  // Никогда не триггерим логин на запросах к oauth2 endpoints
  if (req.url.startsWith("/oauth2")) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authSessionService.clear();
        appStateService.clear();
        authRedirectService.login(window.location.pathname + window.location.search);
      }
      return throwError(() => error);
    })
  );
};
