import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, distinctUntilChanged, map, shareReplay, switchMap } from "rxjs/operators";

import { MeApi } from "../api";
import { UserProfileResponse } from "../../shared/models";
import { AuthSessionService } from "./auth-session.service";

@Injectable({ providedIn: "root" })
export class AuthUserService {
  /**
   * Текущий профиль пользователя (если не аутентифицирован — null).
   *
   * Источник: /api/iam/... (реализация скрыта в MeApi.me()).
   */
  readonly userProfile$: Observable<UserProfileResponse | null>;

  /**
   * Backward-compat (если где-то в коде ещё используется me$).
   */
  readonly me$: Observable<UserProfileResponse | null>;

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly meApi: MeApi
  ) {
    const profile$ = this.authSession.state$.pipe(
      map((state) => state.authenticated),
      distinctUntilChanged(),
      switchMap((authenticated) => {
        if (!authenticated) {
          return of(null);
        }
        return this.meApi.me().pipe(catchError(() => of(null)));
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.userProfile$ = profile$;
    this.me$ = profile$;
  }
}
