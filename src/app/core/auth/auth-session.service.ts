import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {BehaviorSubject, catchError, finalize, map, Observable, of, shareReplay, tap} from "rxjs";

import {AuthSessionState, OAuth2ProxyUserInfo} from "./auth-session.model";
import {OAUTH2_ENDPOINTS} from "./auth-endpoints";
import {AUTH_SESSION_FLAG} from "./auth-storage";

@Injectable({providedIn: "root"})
export class AuthSessionService {

  private readonly stateSubject = new BehaviorSubject<AuthSessionState>({authenticated: false});
  readonly state$ = this.stateSubject.asObservable();

  private refreshInFlight: Observable<AuthSessionState> | null = null;

  constructor(private readonly http: HttpClient) {
  }

  refresh(): Observable<AuthSessionState> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.http.get<OAuth2ProxyUserInfo>(OAUTH2_ENDPOINTS.userInfo, {
      withCredentials: true
    }).pipe(
      map((userInfo) => ({authenticated: true, userInfo} as AuthSessionState)),
      catchError(() => of({authenticated: false} as AuthSessionState)),
      tap((state) => this.stateSubject.next(state)),
      finalize(() => {
        this.refreshInFlight = null;
      }),
      shareReplay({bufferSize: 1, refCount: false})
    );

    return this.refreshInFlight;
  }

  snapshot(): AuthSessionState {
    return this.stateSubject.value;
  }

  clear(): void {
    this.stateSubject.next({authenticated: false});
    sessionStorage.removeItem(AUTH_SESSION_FLAG);
  }
}
