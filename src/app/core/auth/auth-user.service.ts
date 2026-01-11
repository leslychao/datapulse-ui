import {Injectable} from "@angular/core";
import {Observable, of} from "rxjs";
import {catchError, distinctUntilChanged, map, shareReplay, switchMap} from "rxjs/operators";

import {MeApi} from "../api";
import {MeResponse} from "../../shared/models";
import {AuthSessionService} from "./auth-session.service";

@Injectable({providedIn: "root"})
export class AuthUserService {
  readonly me$: Observable<MeResponse | null>;

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly meApi: MeApi
  ) {
    this.me$ = this.authSession.state$.pipe(
      map((state) => state.authenticated),
      distinctUntilChanged(),
      switchMap((authenticated) => {
        if (!authenticated) {
          return of(null);
        }
        return this.meApi.me().pipe(catchError(() => of(null)));
      }),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }
}
