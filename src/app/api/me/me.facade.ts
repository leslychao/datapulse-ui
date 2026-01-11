import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { distinctUntilChanged, map, switchMap, catchError, shareReplay } from "rxjs/operators";

import { AuthSessionService } from "../../core/auth/auth-session.service";
import { MeApi } from "./me.api";
import { MeResponse } from "./me.model";

@Injectable({ providedIn: "root" })
export class MeFacade {

  readonly me$: Observable<MeResponse | null> =
    this.auth.state$.pipe(
      map((state) => state.authenticated),
      distinctUntilChanged(),
      switchMap((authenticated) => {
        if (!authenticated) {
          return of(null);
        }
        return this.meApi.me().pipe(
          catchError(() => of(null))
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  constructor(
    private readonly auth: AuthSessionService,
    private readonly meApi: MeApi
  ) {
  }
}
