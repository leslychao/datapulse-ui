import {Injectable} from "@angular/core";
import {Observable, of} from "rxjs";
import {catchError, distinctUntilChanged, map, shareReplay, switchMap} from "rxjs/operators";

import {IamApiClient} from "../api";
import {UserProfileResponse} from "../../shared/models";
import {AuthSessionService} from "./auth-session.service";
import {AUTH_SESSION_FLAG} from "./auth-storage";

@Injectable({providedIn: "root"})
export class AuthUserService {
  readonly userProfile$: Observable<UserProfileResponse | null>;
  readonly me$: Observable<UserProfileResponse | null>;

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly iamApi: IamApiClient
  ) {
    const profile$ = this.authSession.state$.pipe(
      map((state) => state.authenticated === true),
      distinctUntilChanged(),
      switchMap((authenticated) => {
        const hasSessionFlag = sessionStorage.getItem(AUTH_SESSION_FLAG) === "true";

        if (!authenticated || !hasSessionFlag) {
          return of<UserProfileResponse | null>(null);
        }

        return this.iamApi.getProfile().pipe(
          catchError(() => of<UserProfileResponse | null>(null))
        );
      }),
      shareReplay({bufferSize: 1, refCount: false})
    );

    this.userProfile$ = profile$;
    this.me$ = profile$;
  }
}
