import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable, of} from "rxjs";
import {catchError, distinctUntilChanged, finalize, map, shareReplay, tap} from "rxjs/operators";

import {IamApiClient} from "../api";
import {AuthSessionService} from "../auth";
import {ApiError} from "../api/api-error.model";
import {UserProfileResponse} from "../../shared/models";

export type IamLoadState = "IDLE" | "LOADING" | "READY" | "ERROR";

@Injectable({providedIn: "root"})
export class IamService {
  private readonly stateSubject = new BehaviorSubject<IamLoadState>("IDLE");
  private readonly profileSubject = new BehaviorSubject<UserProfileResponse | null>(null);
  private readonly errorSubject = new BehaviorSubject<ApiError | null>(null);

  private loadInFlight: Observable<UserProfileResponse | null> | null = null;

  readonly state$ = this.stateSubject.asObservable();
  readonly profile$ = this.profileSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor(
    private readonly iamApi: IamApiClient,
    private readonly authSession: AuthSessionService
  ) {
    this.authSession.state$
      .pipe(
        map((state) => state.authenticated),
        distinctUntilChanged()
      )
      .subscribe((authenticated) => {
        if (!authenticated) {
          this.reset();
        }
      });
  }

  loadProfile(force = false): Observable<UserProfileResponse | null> {
    if (!this.authSession.snapshot().authenticated) {
      this.reset();
      return of(null);
    }

    if (!force && this.stateSubject.value === "READY") {
      return of(this.profileSubject.value);
    }

    if (this.loadInFlight) {
      return this.loadInFlight;
    }

    this.stateSubject.next("LOADING");
    this.errorSubject.next(null);

    this.loadInFlight = this.iamApi.getProfile().pipe(
      tap((profile) => {
        this.profileSubject.next(profile);
        this.stateSubject.next("READY");
      }),
      catchError((error: ApiError) => {
        this.profileSubject.next(null);
        this.errorSubject.next(error);
        this.stateSubject.next("ERROR");
        return of(null);
      }),
      finalize(() => {
        this.loadInFlight = null;
      }),
      shareReplay({bufferSize: 1, refCount: false})
    );

    return this.loadInFlight;
  }

  reset(): void {
    this.stateSubject.next("IDLE");
    this.profileSubject.next(null);
    this.errorSubject.next(null);
  }
}
